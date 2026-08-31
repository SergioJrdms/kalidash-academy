/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_ANON_KEY: string
  readonly VITE_AI_LEAGUE_URL?: string
  readonly VITE_UNLOCK_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
