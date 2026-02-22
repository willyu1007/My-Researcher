export {};

declare global {
  interface Window {
    desktopApi: {
      getAppMeta: () => Promise<{
        appName: string;
        appVersion: string;
        platform: NodeJS.Platform;
      }>;
    };
  }
}
