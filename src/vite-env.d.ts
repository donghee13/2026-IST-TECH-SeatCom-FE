/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_TARGET?: string
  readonly VITE_MOCK_AUTH?: string
  readonly VITE_DEV_TOKEN?: string
  readonly VITE_ROOM_ID?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}