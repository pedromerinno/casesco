import { createClient } from "@supabase/supabase-js";

function requireEnv(name: string, value: unknown): string {
  if (typeof value === "string" && value.length > 0) return value;

  // Fail fast in dev so misconfig is obvious.
  if (import.meta.env.DEV) {
    throw new Error(
      `Missing environment variable "${name}". Create a .env file with VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.`,
    );
  }

  return "";
}

export const supabaseUrl = requireEnv("VITE_SUPABASE_URL", import.meta.env.VITE_SUPABASE_URL);
export const supabaseAnonKey = requireEnv("VITE_SUPABASE_ANON_KEY", import.meta.env.VITE_SUPABASE_ANON_KEY);

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

