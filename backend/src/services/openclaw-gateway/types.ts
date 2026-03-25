import { GatewayConnectMode } from './constants';

export interface GatewayConfig {
  url: string;
  token?: string;
  allowInsecureTls?: boolean;
  disableDevicePairing?: boolean;
  origin?: string;
}

export interface GatewayRequestMessage {
  type: 'req';
  id: string;
  method: string;
  params: Record<string, any>;
}

export interface GatewayResponseMessage {
  type: 'res';
  id: string;
  ok?: boolean;
  error?: {
    message: string;
  };
  payload?: any;
  result?: any;
}

export interface GatewayEventMessage {
  type: 'event';
  event: string;
  payload?: any;
}

export type GatewayMessage = GatewayRequestMessage | GatewayResponseMessage | GatewayEventMessage;

export interface DeviceIdentity {
  deviceId: string;
  publicKeyPem: string;
  privateKeyPem: string;
}

export interface DeviceAuthPayload {
  deviceId: string;
  clientId: string;
  clientMode: string;
  role: string;
  scopes: string[];
  signedAtMs: number;
  token?: string;
  nonce?: string;
}

export interface DeviceConnectPayload {
  id: string;
  publicKey: string;
  signature: string;
  signedAt: number;
  nonce?: string;
}

export interface ClientInfo {
  id: string;
  version: string;
  platform: string;
  mode: string;
}

export interface ConnectParams {
  minProtocol: number;
  maxProtocol: number;
  role: string;
  scopes: string[];
  client: ClientInfo;
  device?: DeviceConnectPayload;
  auth?: {
    token: string;
  };
}
