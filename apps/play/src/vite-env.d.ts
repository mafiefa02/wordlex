/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** The API's origin. Every call to it is cross-origin and carries cookies. */
  readonly VITE_API_URL?: string;
  /** The landing page's origin, which the lockup links back to. */
  readonly VITE_SITE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
