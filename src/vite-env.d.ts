/// <reference types="vite/client" />

declare module "@fontsource-variable/geist";

interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
  /** Base64url VAPID public key for Web Push (optional; required for “Enable push” in Settings). */
  readonly VITE_VAPID_PUBLIC_KEY?: string;
  /**
   * Comma-separated allowed sign-in / sign-up email domains (lowercase), e.g. `gmail.com,googlemail.com`.
   * Use `*` to allow any domain. Omit or leave empty for no domain restriction on the client.
   */
  readonly VITE_ALLOWED_EMAIL_DOMAINS?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
