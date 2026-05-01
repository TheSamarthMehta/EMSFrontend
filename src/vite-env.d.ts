/// <reference types="vite/client" />

declare module "@fontsource-variable/geist";

interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
  /** Base64url VAPID public key for Web Push (optional; required for “Enable push” in Settings). */
  readonly VITE_VAPID_PUBLIC_KEY?: string;
  readonly VITE_SHOW_DEMO_SEED?: string;
  readonly VITE_FIREBASE_API_KEY: string;
  readonly VITE_FIREBASE_AUTH_DOMAIN: string;
  readonly VITE_FIREBASE_PROJECT_ID: string;
  readonly VITE_FIREBASE_STORAGE_BUCKET: string;
  readonly VITE_FIREBASE_MESSAGING_SENDER_ID: string;
  readonly VITE_FIREBASE_APP_ID: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
