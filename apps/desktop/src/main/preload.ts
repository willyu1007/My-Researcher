import { contextBridge, ipcRenderer } from 'electron';

type DesktopMeta = {
  appName: string;
  appVersion: string;
  platform: NodeJS.Platform;
};

const desktopApi = {
  getAppMeta: (): Promise<DesktopMeta> => ipcRenderer.invoke('desktop:get-app-meta') as Promise<DesktopMeta>,
};

contextBridge.exposeInMainWorld('desktopApi', desktopApi);
