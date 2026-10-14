import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";

/**
 * Data Access Layer for identity. Every server read of "who is this?" goes
 * through here. getClaims() verifies the JWT signature, so a forged cookie
 * can't impersonate anyone. Results are memoised per request.
 */
export const getSession = cache(async () => {
  if (!isSupabaseConfigured()) return { configured: false, user: null, supabase: null };
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (error || !claims?.sub) return { configured: true, user: null, supabase };
  return {
    configured: true,
    supabase,
    user: {
      id: claims.sub,
      email: claims.email,
      aal: claims.aal || "aal1",
      emailVerified: Boolean(claims.user_metadata?.email_verified ?? claims.email_verified ?? true),
    },
  };
});

/** Profile + roles for the signed-in user (RLS limits this to their own rows). */
export const getViewer = cache(async () => {
  const { user, supabase, configured } = await getSession();
  if (!user) return { configured, user: null, profile: null, roles: [], supabase };
  const [{ data: profile }, { data: roleRows }] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, email, full_name, username, phone, country, locale, theme, status, kyc_status, referral_code, created_at")
      .eq("id", user.id)
      .maybeSingle(),
    supabase.from("user_roles").select("role").eq("user_id", user.id),
  ]);
  return { configured, user, profile, roles: (roleRows || []).map((r) => r.role), supabase };
});

/** Whether the user has a verified TOTP factor (and so must be at aal2 for staff work). */
export async function getMfaState(supabase) {
  const { data } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  return {
    currentLevel: data?.currentLevel || "aal1",
    nextLevel: data?.nextLevel || "aal1",
    needsChallenge: data?.nextLevel === "aal2" && data?.currentLevel !== "aal2",
  };
}
