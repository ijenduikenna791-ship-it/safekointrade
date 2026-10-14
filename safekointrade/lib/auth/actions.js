"use server";

import { headers } from "next/headers";
import { getLocale } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { forgotSchema, loginSchema, registerSchema, resetSchema } from "@/lib/validation/schemas";
import { rateLimit } from "@/lib/security/rate-limit";
import { clientIp, safeNextPath } from "@/lib/security/request";
import { fail, fieldErrorsFrom, ok } from "@/lib/database/errors";
import { parsePhoneNumberFromString } from "libphonenumber-js/min";
import { sendEmail } from "@/lib/email/send";

async function appOrigin() {
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
  const h = await headers();
  const host = h.get("x-forwarded-host") || h.get("host");
  const proto = h.get("x-forwarded-proto") || "http";
  return `${proto}://${host}`;
}

async function localePrefix() {
  const locale = await getLocale();
  return locale === "en" ? "" : `/${locale}`;
}

// ---------------------------------------------------------------------------
export async function registerAction(input) {
  const ip = await clientIp();
  if (!(await rateLimit(`register:${ip}`, { limit: 5, windowSeconds: 3600 }))) return fail("rate_limited");

  const parsed = registerSchema.safeParse(input);
  if (!parsed.success) return fail("validation", fieldErrorsFrom(parsed.error));
  const v = parsed.data;

  const supabase = await createClient();
  if (!supabase) return fail("not_configured");

  // Registrations can be paused by an admin (read with the service role when available).
  const admin = createAdminClient();
  if (admin) {
    const { data: setting } = await admin.from("application_settings").select("value").eq("key", "registrations_open").maybeSingle();
    if (setting && setting.value === false) return fail("registrations_closed");
  }

  const { data: available } = await supabase.rpc("is_username_available", { p_username: v.username });
  if (available === false) return fail("validation", { username: "usernameTaken" });

  const phone = parsePhoneNumberFromString(v.phone)?.number; // E.164
  const locale = await getLocale();
  const origin = await appOrigin();

  const { data, error } = await supabase.auth.signUp({
    email: v.email,
    password: v.password,
    options: {
      emailRedirectTo: `${origin}/api/auth/callback?next=${encodeURIComponent(`${await localePrefix()}/dashboard`)}`,
      data: {
        full_name: v.fullName,
        username: v.username,
        phone,
        referral_code: v.referralCode || null,
        locale,
        terms_accepted: true,
      },
    },
  });

  if (error) {
    if (/password/i.test(error.message) && /weak|pwned|leaked/i.test(error.message)) {
      return fail("validation", { password: "passwordBreached" });
    }
    if (error.status === 429) return fail("rate_limited");
    // Existing email (returned when email confirmation is off): answer exactly
    // like a new sign-up so the form can't reveal which emails have accounts.
    if (error.code === "user_already_exists" || /already registered/i.test(error.message)) {
      console.info("[register] sign-up attempted for an existing email");
      return ok({ email: v.email });
    }
    console.error("[register]", error.message);
    return fail("generic");
  }

  // Supabase returns a user with no identities when the email is already
  // registered. We answer exactly as for a new sign-up so the form can't be
  // used to discover which emails have accounts.
  const duplicate = data?.user && Array.isArray(data.user.identities) && data.user.identities.length === 0;
  if (duplicate) console.info("[register] sign-up attempted for an existing email");
  return ok({ email: v.email });
}

// ---------------------------------------------------------------------------
export async function loginAction(input, nextPath) {
  const ip = await clientIp();
  const parsed = loginSchema.safeParse(input);
  if (!parsed.success) return fail("validation", fieldErrorsFrom(parsed.error));
  if (!(await rateLimit(`login:${ip}`, { limit: 20, windowSeconds: 600 }))) return fail("rate_limited");
  if (!(await rateLimit(`login:${parsed.data.email}`, { limit: 8, windowSeconds: 600 }))) return fail("rate_limited");

  const supabase = await createClient();
  if (!supabase) return fail("not_configured");

  const { data, error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) {
    if (error.code === "email_not_confirmed") return fail("email_not_confirmed");
    if (error.status === 429) return fail("rate_limited");
    if (error.code === "invalid_credentials" || error.status === 400) return fail("invalid_credentials");
    console.error("[login]", error.message);
    return fail("generic");
  }

  // Block suspended accounts from starting a session.
  const { data: profile } = await supabase.from("profiles").select("status").eq("id", data.user.id).maybeSingle();
  if (profile?.status === "suspended") {
    await supabase.auth.signOut();
    return fail("account_suspended");
  }
  await supabase.from("profiles").update({ last_seen_at: new Date().toISOString() }).eq("id", data.user.id);

  const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  const next = safeNextPath(nextPath, "/dashboard");
  if (aal?.nextLevel === "aal2" && aal?.currentLevel !== "aal2") {
    return ok({ redirect: `/mfa?next=${encodeURIComponent(next)}` });
  }
  return ok({ redirect: next });
}

// ---------------------------------------------------------------------------
export async function resendVerificationAction(email) {
  const parsed = forgotSchema.safeParse({ email });
  if (!parsed.success) return fail("validation", fieldErrorsFrom(parsed.error));
  const ip = await clientIp();
  if (!(await rateLimit(`resend:${ip}`, { limit: 3, windowSeconds: 600 }))) return fail("rate_limited");
  const supabase = await createClient();
  if (!supabase) return fail("not_configured");
  const origin = await appOrigin();
  const { error } = await supabase.auth.resend({
    type: "signup",
    email: parsed.data.email,
    options: { emailRedirectTo: `${origin}/api/auth/callback?next=${encodeURIComponent(`${await localePrefix()}/dashboard`)}` },
  });
  if (error && error.status === 429) return fail("rate_limited");
  return ok(); // same answer whether or not the address exists
}

// ---------------------------------------------------------------------------
export async function forgotPasswordAction(input) {
  const parsed = forgotSchema.safeParse(input);
  if (!parsed.success) return fail("validation", fieldErrorsFrom(parsed.error));
  const ip = await clientIp();
  if (!(await rateLimit(`forgot:${ip}`, { limit: 5, windowSeconds: 900 }))) return fail("rate_limited");
  const supabase = await createClient();
  if (!supabase) return fail("not_configured");
  const origin = await appOrigin();
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${origin}/api/auth/callback?next=${encodeURIComponent(`${await localePrefix()}/reset-password`)}`,
  });
  if (error && error.status === 429) return fail("rate_limited");
  if (error) console.error("[forgot]", error.message);
  return ok(); // never reveal whether the account exists
}

// ---------------------------------------------------------------------------
export async function resetPasswordAction(input) {
  const parsed = resetSchema.safeParse(input);
  if (!parsed.success) return fail("validation", fieldErrorsFrom(parsed.error));
  const supabase = await createClient();
  if (!supabase) return fail("not_configured");
  const { data: claims } = await supabase.auth.getClaims();
  if (!claims?.claims?.sub) return fail("reset_link_expired");

  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) {
    if (/same/i.test(error.message)) return fail("validation", { password: "passwordSame" });
    if (/weak|pwned|leaked/i.test(error.message)) return fail("validation", { password: "passwordBreached" });
    if (/aal2|mfa/i.test(error.message)) return fail("mfa_required");
    console.error("[reset]", error.message);
    return fail("generic");
  }
  await sendEmail({
    to: claims.claims.email,
    subject: "Your password was changed",
    text: "The password on your account was just changed. If this wasn't you, reset your password immediately and contact support.",
    cta: { href: "/forgot-password", label: "Reset password" },
  });
  return ok({ redirect: "/dashboard" });
}

// ---------------------------------------------------------------------------
export async function signOutAction(scope = "local") {
  const supabase = await createClient();
  if (supabase) await supabase.auth.signOut({ scope: scope === "global" ? "global" : "local" });
  return ok({ redirect: "/login?signedOut=1" });
}
