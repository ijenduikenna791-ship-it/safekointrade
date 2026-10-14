import "server-only";
import { headers } from "next/headers";

/** Best-effort client IP (Vercel sets x-forwarded-for). Used only for rate-limit keys. */
export async function clientIp() {
  const h = await headers();
  return (h.get("x-forwarded-for") || "").split(",")[0].trim() || h.get("x-real-ip") || "unknown";
}

/**
 * CSRF guard for Route Handlers: the Origin (or Referer) must match this host.
 * Server Actions get the same protection from Next.js automatically.
 */
export function isSameOrigin(request) {
  const origin = request.headers.get("origin") || request.headers.get("referer");
  if (!origin) return false;
  try {
    const host = request.headers.get("x-forwarded-host") || request.headers.get("host");
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

/** Only allow redirects to same-site relative paths (prevents open redirects). */
export function safeNextPath(value, fallback = "/dashboard") {
  if (typeof value !== "string") return fallback;
  if (!value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) return fallback;
  if (/[\r\n]/.test(value)) return fallback;
  return value;
}
