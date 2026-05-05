export {};

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

type SelectDirectoryRequest = {
  title?: string;
  defaultPath?: string;
};

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string;
  readonly VITE_ENABLE_GOVERNANCE_PANELS?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare global {
  interface Window {
    desktopApi?: {
      getAppMeta: () => Promise<{
        appName: string;
        appVersion: string;
        platform: NodeJS.Platform;
      }>;
      selectDirectory: (request?: SelectDirectoryRequest) => Promise<string | null>;
      requestGovernance: (
        request: GovernanceBridgeRequest,
      ) => Promise<GovernanceBridgeResponse>;
    };
  }
}
