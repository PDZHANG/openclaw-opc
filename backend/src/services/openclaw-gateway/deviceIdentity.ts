import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { v4 as uuidv4 } from 'uuid';
import { DeviceIdentity, DeviceAuthPayload } from './types';

const DEVICE_IDENTITY_FILE = path.join(os.homedir(), '.openclaw', 'device-identity.json');

export function loadOrCreateDeviceIdentity(): DeviceIdentity {
  const dir = path.dirname(DEVICE_IDENTITY_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  if (fs.existsSync(DEVICE_IDENTITY_FILE)) {
    try {
      const content = fs.readFileSync(DEVICE_IDENTITY_FILE, 'utf-8');
      return JSON.parse(content) as DeviceIdentity;
    } catch (e) {
      console.warn('Failed to load device identity, creating new one:', e);
    }
  }

  const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519', {
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  });

  const identity: DeviceIdentity = {
    deviceId: uuidv4(),
    publicKeyPem: publicKey,
    privateKeyPem: privateKey,
  };

  fs.writeFileSync(DEVICE_IDENTITY_FILE, JSON.stringify(identity, null, 2));
  return identity;
}

export function publicKeyRawBase64UrlFromPem(publicKeyPem: string): string {
  const key = crypto.createPublicKey(publicKeyPem);
  const raw = key.export({ format: 'jwk' });
  if (!raw.x) {
    throw new Error('Invalid public key');
  }
  return raw.x;
}

export function buildDeviceAuthPayload(
  identity: DeviceIdentity,
  clientId: string,
  clientMode: string,
  role: string,
  scopes: string[],
  authToken?: string,
  nonce?: string,
): DeviceAuthPayload {
  const signedAtMs = Math.floor(Date.now());
  return {
    deviceId: identity.deviceId,
    clientId,
    clientMode,
    role,
    scopes,
    signedAtMs,
    token: authToken,
    nonce,
  };
}

export function signDevicePayload(privateKeyPem: string, payload: DeviceAuthPayload): string {
  const privateKey = crypto.createPrivateKey(privateKeyPem);
  const payloadStr = JSON.stringify(payload);
  const signature = crypto.sign(null, Buffer.from(payloadStr), privateKey);
  return signature.toString('base64url');
}
