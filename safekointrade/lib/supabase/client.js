"use client";

import { createBrowserClient } from "@supabase/ssr";
import { SUPABASE_URL, SUPABASE_PUBLIC_KEY, isSupabaseConfigured } from "./env";

let browserClient;

/** Browser Supabase client — uses only the public key; RLS protects all data. */
export function createClient() {
  if (!isSupabaseConfigured()) return null;
  if (!browserClient) browserClient = createBrowserClient(SUPABASE_URL, SUPABASE_PUBLIC_KEY);
  return browserClient;
}
