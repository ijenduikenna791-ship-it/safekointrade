import "server-only";
import { createClient } from "@supabase/supabase-js";
import { SUPABASE_URL, SUPABASE_PUBLIC_KEY, isSupabaseConfigured } from "./env";

/**
 * Cookie-less client for public, non-personal data (active plans, supported
 * assets). Uses the public key, so only rows RLS exposes to `anon` are visible.
 * Keeps marketing pages statically renderable.
 */
export function createPublicClient() {
  if (!isSupabaseConfigured()) return null;
  return createClient(SUPABASE_URL, SUPABASE_PUBLIC_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
