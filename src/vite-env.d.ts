/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
  readonly VITE_ONMX_WHATSAPP_NUMBER?: string;
  readonly VITE_ONMX_WHATSAPP_TEXT?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
