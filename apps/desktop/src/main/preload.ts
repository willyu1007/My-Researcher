import { contextBridge, ipcRenderer } from 'electron';

type DesktopMeta = {
  appName: string;
  appVersion: string;
  platform: NodeJS.Platform;
};

type GovernanceBridgeRequest = {
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  path: string;
  body?: unknown;
};

type GovernanceBridgeResponse = {
  ok: boolean;
  status: number;
  payload: unknown;
};

const desktopApi = {
  getAppMeta: (): Promise<DesktopMeta> => ipcRenderer.invoke('desktop:get-app-meta') as Promise<DesktopMeta>,
  requestGovernance: (
    request: GovernanceBridgeRequest,
  ): Promise<GovernanceBridgeResponse> =>
    ipcRenderer.invoke('desktop:governance-request', request) as Promise<GovernanceBridgeResponse>,
};

contextBridge.exposeInMainWorld('desktopApi', desktopApi);
