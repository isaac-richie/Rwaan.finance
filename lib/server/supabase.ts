import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

// Throws at request time (not build time) when env vars are missing.
export const supabaseAdmin = createClient(
  supabaseUrl || "https://placeholder.supabase.co",
  serviceRoleKey || "placeholder",
  { auth: { persistSession: false } }
);

export function assertSupabaseConfigured() {
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Supabase env vars are missing.");
  }
}
