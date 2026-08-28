/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** The API's origin. Every call to it is cross-origin and carries cookies. */
  readonly VITE_API_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
