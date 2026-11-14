/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_TARGET?: string
  readonly VITE_ROOM_ID?: string
  readonly VITE_MOCK_AUTH?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}