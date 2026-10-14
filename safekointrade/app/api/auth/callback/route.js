import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { safeNextPath } from "@/lib/security/request";

/**
 * Landing point for links in Supabase auth emails:
 *  - ?code=…                 PKCE flow (sign-up confirmation, password recovery)
 *  - ?token_hash=…&type=…    OTP links if you customise the email templates
 * The `next` target is validated to stay on this site (no open redirects).
 */
export async function GET(request) {
  const url = new URL(request.url);
  const next = safeNextPath(url.searchParams.get("next"), "/dashboard");
  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type");
  const errorDescription = url.searchParams.get("error_description");

  const fail = (reason) => NextResponse.redirect(new URL(`/verify-email?status=${reason}`, url.origin));
  if (errorDescription) return fail("expired");

  const supabase = await createClient();
  if (!supabase) return fail("not_configured");

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) return fail("expired");
  } else if (tokenHash && ["signup", "email", "recovery", "email_change", "invite"].includes(type)) {
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
    if (error) return fail("expired");
    if (type === "recovery") return NextResponse.redirect(new URL("/reset-password", url.origin));
  } else {
    return fail("invalid");
  }

  return NextResponse.redirect(new URL(next, url.origin));
}
