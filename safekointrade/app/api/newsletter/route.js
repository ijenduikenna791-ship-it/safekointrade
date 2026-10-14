import { NextResponse } from "next/server";
import { newsletterSchema } from "@/lib/validation/schemas";
import { rateLimit } from "@/lib/security/rate-limit";
import { clientIp, isSameOrigin } from "@/lib/security/request";
import { createPublicClient } from "@/lib/supabase/public";
import { locales } from "@/lib/i18n/routing";

const CONSENT_TEXT = "I agree to receive the monthly update and can unsubscribe at any time.";

export async function POST(request) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const ip = await clientIp();
  if (!(await rateLimit(`newsletter:${ip}`, { limit: 5, windowSeconds: 600 }))) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  const body = await request.json().catch(() => null);
  const parsed = newsletterSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "invalid" }, { status: 400 });
  // Honeypot filled → pretend success so bots learn nothing.
  if (parsed.data.website) return NextResponse.json({ status: "subscribed" });

  const supabase = createPublicClient();
  if (!supabase) return NextResponse.json({ error: "not_configured" }, { status: 503 });

  const locale = locales.includes(body?.locale) ? body.locale : "en";
  // SECURITY DEFINER function: validates again, stores consent text + timestamp.
  const { data, error } = await supabase.rpc("subscribe_newsletter", {
    p_email: parsed.data.email,
    p_locale: locale,
    p_consent_text: CONSENT_TEXT,
  });
  if (error) {
    console.error("[newsletter]", error.message);
    return NextResponse.json({ error: "server" }, { status: 500 });
  }
  return NextResponse.json({ status: data === "already" ? "already" : "subscribed" });
}
