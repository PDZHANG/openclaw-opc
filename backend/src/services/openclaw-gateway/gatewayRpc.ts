import WebSocket from 'ws';
import { URL } from 'url';
import { v4 as uuidv4 } from 'uuid';
import {
  PROTOCOL_VERSION,
  GATEWAY_OPERATOR_SCOPES,
  DEFAULT_GATEWAY_CLIENT_ID,
  DEFAULT_GATEWAY_CLIENT_MODE,
  CONTROL_UI_CLIENT_ID,
  CONTROL_UI_CLIENT_MODE,
} from './constants';
import {
  GatewayConfig,
  GatewayRequestMessage,
  GatewayResponseMessage,
  GatewayMessage,
  ConnectParams,
  ClientInfo,
} from './types';
import { OpenClawGatewayError } from './errors';
import {
  loadOrCreateDeviceIdentity,
  publicKeyRawBase64UrlFromPem,
  buildDeviceAuthPayload,
  signDevicePayload,
} from './deviceIdentity';

function buildGatewayUrl(config: GatewayConfig): string {
  const baseUrl = (config.url || '').trim();
  if (!baseUrl) {
    throw new OpenClawGatewayError('Gateway URL is not configured.');
  }

  if (!config.token) {
    return baseUrl;
  }

  const parsed = new URL(baseUrl);
  parsed.searchParams.set('token', config.token);
  return parsed.toString();
}

function redactedUrlForLog(rawUrl: string): string {
  const parsed = new URL(rawUrl);
  parsed.search = '';
  parsed.hash = '';
  return parsed.toString();
}

function createSslContext(config: GatewayConfig) {
  const parsed = new URL(config.url);
  if (parsed.protocol !== 'wss:') {
    return undefined;
  }
  if (!config.allowInsecureTls) {
    return undefined;
  }
  return {
    rejectUnauthorized: false,
  };
}

function buildControlUiOrigin(gatewayUrl: string): string | undefined {
  const parsed = new URL(gatewayUrl);
  if (!parsed.hostname) {
    return undefined;
  }

  let originScheme: string;
  if (['ws', 'http'].includes(parsed.protocol)) {
    originScheme = 'http';
  } else if (['wss', 'https'].includes(parsed.protocol)) {
    originScheme = 'https';
  } else {
    return undefined;
  }

  let host = parsed.hostname;
  if (host.includes(':') && !host.startsWith('[')) {
    host = `[${host}]`;
  }
  if (parsed.port) {
    host = `${host}:${parsed.port}`;
  }

  return `${originScheme}://${host}`;
}

function resolveConnectMode(config: GatewayConfig): 'device' | 'control_ui' {
  return config.disableDevicePairing ? 'control_ui' : 'device';
}

function buildConnectParams(
  config: GatewayConfig,
  connectNonce?: string,
): ConnectParams {
  const role = 'operator';
  const scopes = [...GATEWAY_OPERATOR_SCOPES];
  const connectMode = resolveConnectMode(config);
  const useControlUi = connectMode === 'control_ui';

  const client: ClientInfo = {
    id: useControlUi ? CONTROL_UI_CLIENT_ID : DEFAULT_GATEWAY_CLIENT_ID,
    version: '1.0.0',
    platform: 'nodejs',
    mode: useControlUi ? CONTROL_UI_CLIENT_MODE : DEFAULT_GATEWAY_CLIENT_MODE,
  };

  const params: ConnectParams = {
    minProtocol: PROTOCOL_VERSION,
    maxProtocol: PROTOCOL_VERSION,
    role,
    scopes,
    client,
  };

  if (!useControlUi) {
    const identity = loadOrCreateDeviceIdentity();
    const authPayload = buildDeviceAuthPayload(
      identity,
      DEFAULT_GATEWAY_CLIENT_ID,
      DEFAULT_GATEWAY_CLIENT_MODE,
      role,
      scopes,
      config.token,
      connectNonce,
    );
    const signature = signDevicePayload(identity.privateKeyPem, authPayload);

    params.device = {
      id: identity.deviceId,
      publicKey: publicKeyRawBase64UrlFromPem(identity.publicKeyPem),
      signature,
      signedAt: authPayload.signedAtMs,
      nonce: connectNonce,
    };
  }

  if (config.token) {
    params.auth = { token: config.token };
  }

  return params;
}

async function awaitResponse(ws: WebSocket, requestId: string): Promise<any> {
  return new Promise((resolve, reject) => {
    const messageHandler = (data: WebSocket.Data) => {
      try {
        const message = JSON.parse(data.toString()) as GatewayMessage;
        console.log(`[gateway.rpc.recv] request_id=${requestId} type=${(message as any).type}`);

        if ('type' in message && message.type === 'res' && message.id === requestId) {
          ws.off('message', messageHandler);
          ws.off('error', errorHandler);

          if (message.ok !== undefined && !message.ok) {
            const errorMsg = message.error?.message || 'Gateway error';
            reject(new OpenClawGatewayError(errorMsg));
            return;
          }
          if (message.error) {
            reject(new OpenClawGatewayError(message.error.message));
            return;
          }
          resolve(message.payload || message.result);
          return;
        }

        if ('id' in message && message.id === requestId) {
          ws.off('message', messageHandler);
          ws.off('error', errorHandler);

          if ('error' in message && message.error) {
            reject(new OpenClawGatewayError(message.error.message));
            return;
          }
          resolve('result' in message ? message.result : undefined);
        }
      } catch (e) {
        console.error('Failed to parse gateway message:', e);
      }
    };

    const errorHandler = (error: Error) => {
      ws.off('message', messageHandler);
      ws.off('error', errorHandler);
      reject(error);
    };

    ws.on('message', messageHandler);
    ws.on('error', errorHandler);
  });
}

async function sendRequest(
  ws: WebSocket,
  method: string,
  params: Record<string, any> | null,
): Promise<any> {
  const requestId = uuidv4();
  const message: GatewayRequestMessage = {
    type: 'req',
    id: requestId,
    method,
    params: params || {},
  };

  console.log(`[gateway.rpc.send] method=${method} request_id=${requestId} params_keys=${Object.keys(params || {}).sort()}`);
  ws.send(JSON.stringify(message));

  return awaitResponse(ws, requestId);
}

async function ensureConnected(
  ws: WebSocket,
  firstMessage: string | Buffer | undefined,
  config: GatewayConfig,
): Promise<any> {
  let connectNonce: string | undefined;

  if (firstMessage) {
    let dataStr: string;
    if (Buffer.isBuffer(firstMessage)) {
      dataStr = firstMessage.toString('utf-8');
    } else {
      dataStr = firstMessage;
    }

    try {
      const data = JSON.parse(dataStr);
      if (data.type === 'event' && data.event === 'connect.challenge') {
        const payload = data.payload;
        if (payload && typeof payload === 'object' && 'nonce' in payload) {
          const nonce = payload.nonce;
          if (typeof nonce === 'string' && nonce.trim()) {
            connectNonce = nonce.trim();
          }
        }
      } else {
        console.warn(`[gateway.rpc.connect.unexpected_first_message] type=${data.type} event=${data.event}`);
      }
    } catch (e) {
      console.error('Failed to parse first message:', e);
    }
  }

  const connectId = uuidv4();
  const response = {
    type: 'req',
    id: connectId,
    method: 'connect',
    params: buildConnectParams(config, connectNonce),
  };

  ws.send(JSON.stringify(response));
  return awaitResponse(ws, connectId);
}

async function recvFirstMessageOrNone(ws: WebSocket): Promise<string | Buffer | undefined> {
  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      ws.off('message', messageHandler);
      resolve(undefined);
    }, 2000);

    const messageHandler = (data: WebSocket.Data) => {
      clearTimeout(timeout);
      ws.off('message', messageHandler);
      resolve(data.toString());
    };

    ws.once('message', messageHandler);
  });
}

async function openclawCallOnce(
  method: string,
  params: Record<string, any> | null,
  config: GatewayConfig,
  gatewayUrl: string,
): Promise<any> {
  let origin: string | undefined;
  if (config.origin) {
    origin = config.origin;
  } else if (config.disableDevicePairing) {
    origin = buildControlUiOrigin(gatewayUrl);
  }
  const sslContext = createSslContext(config);

  const options: WebSocket.ClientOptions = {};
  if (origin) {
    options.origin = origin;
  }
  if (sslContext) {
    options.rejectUnauthorized = sslContext.rejectUnauthorized;
  }

  return new Promise((resolve, reject) => {
    const ws = new WebSocket(gatewayUrl, options);

    ws.on('open', async () => {
      try {
        const firstMessage = await recvFirstMessageOrNone(ws);
        await ensureConnected(ws, firstMessage, config);
        const result = await sendRequest(ws, method, params);
        ws.close();
        resolve(result);
      } catch (error) {
        ws.close();
        reject(error);
      }
    });

    ws.on('error', (error) => {
      reject(error);
    });
  });
}

async function openclawConnectMetadataOnce(
  config: GatewayConfig,
  gatewayUrl: string,
): Promise<any> {
  let origin: string | undefined;
  if (config.origin) {
    origin = config.origin;
  } else if (config.disableDevicePairing) {
    origin = buildControlUiOrigin(gatewayUrl);
  }
  const sslContext = createSslContext(config);

  const options: WebSocket.ClientOptions = {};
  if (origin) {
    options.origin = origin;
  }
  if (sslContext) {
    options.rejectUnauthorized = sslContext.rejectUnauthorized;
  }

  return new Promise((resolve, reject) => {
    const ws = new WebSocket(gatewayUrl, options);

    ws.on('open', async () => {
      try {
        const firstMessage = await recvFirstMessageOrNone(ws);
        const metadata = await ensureConnected(ws, firstMessage, config);
        ws.close();
        resolve(metadata);
      } catch (error) {
        ws.close();
        reject(error);
      }
    });

    ws.on('error', (error) => {
      reject(error);
    });
  });
}

export async function openclawCall(
  method: string,
  params: Record<string, any> | null = null,
  config: GatewayConfig,
): Promise<any> {
  const gatewayUrl = buildGatewayUrl(config);
  const startedAt = Date.now();

  console.log(
    `[gateway.rpc.call.start] method=${method} gateway_url=${redactedUrlForLog(gatewayUrl)} ` +
    `allow_insecure_tls=${config.allowInsecureTls} disable_device_pairing=${config.disableDevicePairing}`,
  );

  try {
    const payload = await openclawCallOnce(method, params, config, gatewayUrl);
    console.log(`[gateway.rpc.call.success] method=${method} duration_ms=${Date.now() - startedAt}`);
    return payload;
  } catch (error) {
    if (error instanceof OpenClawGatewayError) {
      console.warn(`[gateway.rpc.call.gateway_error] method=${method} duration_ms=${Date.now() - startedAt}`);
      throw error;
    }
    console.error(
      `[gateway.rpc.call.transport_error] method=${method} duration_ms=${Date.now() - startedAt} ` +
      `error_type=${(error as Error).constructor.name}`,
    );
    throw new OpenClawGatewayError((error as Error).message);
  }
}

export async function openclawConnectMetadata(config: GatewayConfig): Promise<any> {
  const gatewayUrl = buildGatewayUrl(config);
  const startedAt = Date.now();

  console.log(`[gateway.rpc.connect_metadata.start] gateway_url=${redactedUrlForLog(gatewayUrl)}`);

  try {
    const metadata = await openclawConnectMetadataOnce(config, gatewayUrl);
    console.log(`[gateway.rpc.connect_metadata.success] duration_ms=${Date.now() - startedAt}`);
    return metadata;
  } catch (error) {
    if (error instanceof OpenClawGatewayError) {
      console.warn(`[gateway.rpc.connect_metadata.gateway_error] duration_ms=${Date.now() - startedAt}`);
      throw error;
    }
    console.error(
      `[gateway.rpc.connect_metadata.transport_error] duration_ms=${Date.now() - startedAt} ` +
      `error_type=${(error as Error).constructor.name}`,
    );
    throw new OpenClawGatewayError((error as Error).message);
  }
}

export async function sendMessage(
  message: string,
  sessionKey: string,
  config: GatewayConfig,
  deliver: boolean = false,
): Promise<any> {
  const params: Record<string, any> = {
    sessionKey,
    message,
    deliver,
    idempotencyKey: uuidv4(),
  };
  return openclawCall('chat.send', params, config);
}

export async function getChatHistory(
  sessionKey: string,
  config: GatewayConfig,
  limit?: number,
): Promise<any> {
  const params: Record<string, any> = { sessionKey };
  if (limit !== undefined) {
    params.limit = limit;
  }
  return openclawCall('chat.history', params, config);
}

export async function deleteSession(sessionKey: string, config: GatewayConfig): Promise<any> {
  return openclawCall('sessions.delete', { key: sessionKey }, config);
}

export async function ensureSession(
  sessionKey: string,
  config: GatewayConfig,
  label?: string,
): Promise<any> {
  const params: Record<string, any> = { key: sessionKey };
  if (label) {
    params.label = label;
  }
  return openclawCall('sessions.patch', params, config);
}
