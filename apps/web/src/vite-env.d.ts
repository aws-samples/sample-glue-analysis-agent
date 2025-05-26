/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_FUNCTION_URL: string;
  readonly VITE_WEBSOCKET_REALTIME_DNS: string;
  readonly VITE_USER_POOL_ID: string;
  readonly VITE_USER_POOL_CLIENT_ID: string;
  readonly VITE_USER_POOL_DOMAIN: string;
  readonly VITE_IDENTITY_POOL_ID: string;
  readonly VITE_AWS_REGION: string;
  readonly VITE_REDIRECT_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
