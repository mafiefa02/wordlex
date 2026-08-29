/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** The API's origin. Every call to it is cross-origin and carries cookies. */
  readonly VITE_API_URL?: string;
  /** The landing page's origin: the header lockup and the sign-in terms links. */
  readonly VITE_SITE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
