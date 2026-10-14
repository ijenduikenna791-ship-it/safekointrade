import { NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Payment provider webhook endpoint (not yet connected to a provider).
 *
 * When a licensed provider is integrated:
 *  1. verify the signature (below) with PAYMENT_WEBHOOK_SECRET
 *  2. look the event up by its provider id and make processing idempotent
 *  3. call a SECURITY DEFINER function with the service role to confirm the
 *     matching deposit/withdrawal — never trust amounts from the payload alone
 *     without re-fetching them from the provider's API
 *
 * Until then it rejects everything, so nothing can confirm money movement by
 * posting to this URL.
 */
function verify(raw, signature, secret) {
  if (!signature || !secret) return false;
  const expected = createHmac("sha256", secret).update(raw).digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(String(signature).replace(/^sha256=/, ""));
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(request) {
  const secret = process.env.PAYMENT_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "payment_provider_not_configured" }, { status: 503 });
  }
  const raw = await request.text();
  if (!verify(raw, request.headers.get("x-signature"), secret)) {
    return NextResponse.json({ error: "invalid_signature" }, { status: 401 });
  }
  // Signature is valid but no provider integration exists yet.
  return NextResponse.json({ error: "not_implemented" }, { status: 501 });
}
