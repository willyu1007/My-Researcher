import type { GovernanceRequest } from './types';
import { asRecord, toText } from './normalizers';

export const defaultApiBaseUrl = (import.meta.env.VITE_API_BASE_URL ?? 'http://127.0.0.1:3000').trim();

export function readErrorMessage(payload: unknown, status: number): string {
  const root = asRecord(payload);
  const error = root ? asRecord(root.error) : null;
  if (error) {
    const code = toText(error.code);
    const message = toText(error.message);
    if (code && message) {
      return `${code}: ${message}`;
    }
    if (message) {
      return message;
    }
  }

  const message = root ? toText(root.message) : undefined;
  if (message) {
    return message;
  }

  return `Request failed with status ${status}.`;
}

export async function requestGovernance<T>(request: GovernanceRequest): Promise<T> {
  const desktopBridge = window.desktopApi?.requestGovernance;

  if (desktopBridge) {
    const bridgeResponse = await desktopBridge(request);
    if (!bridgeResponse.ok) {
      throw new Error(readErrorMessage(bridgeResponse.payload, bridgeResponse.status));
    }
    return bridgeResponse.payload as T;
  }

  const init: RequestInit = {
    method: request.method,
    headers: {
      Accept: 'application/json',
    },
  };

  if (request.body !== undefined) {
    init.headers = {
      ...init.headers,
      'Content-Type': 'application/json',
    };
    init.body = JSON.stringify(request.body);
  }

  const response = await fetch(new URL(request.path, defaultApiBaseUrl), init);
  const contentType = response.headers.get('content-type') ?? '';
  const payload = contentType.includes('application/json')
    ? await response.json()
    : { message: await response.text() };

  if (!response.ok) {
    throw new Error(readErrorMessage(payload, response.status));
  }

  return payload as T;
}
