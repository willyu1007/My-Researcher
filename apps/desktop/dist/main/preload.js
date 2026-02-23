import { contextBridge, ipcRenderer } from 'electron';
const desktopApi = {
    getAppMeta: () => ipcRenderer.invoke('desktop:get-app-meta'),
    requestGovernance: (request) => ipcRenderer.invoke('desktop:governance-request', request),
};
contextBridge.exposeInMainWorld('desktopApi', desktopApi);
//# sourceMappingURL=preload.js.map