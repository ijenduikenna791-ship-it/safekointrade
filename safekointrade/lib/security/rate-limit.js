import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Fixed-window rate limiter.
 * Primary store: Postgres (`check_rate_limit` function, service role only), so
 * limits hold across serverless instances. Fallback: per-instance memory.
 */
const memory = new Map();

function memoryLimit(key, limit, windowSeconds) {
  const now = Date.now();
  const entry = memory.get(key);
  if (!entry || entry.reset < now) {
    memory.set(key, { count: 1, reset: now + windowSeconds * 1000 });
    if (memory.size > 5000) {
      for (const [k, v] of memory) if (v.reset < now) memory.delete(k);
    }
    return true;
  }
  entry.count += 1;
  return entry.count <= limit;
}

/** @returns {Promise<boolean>} true when the request is allowed */
export async function rateLimit(key, { limit = 10, windowSeconds = 60 } = {}) {
  const admin = createAdminClient();
  if (admin) {
    const { data, error } = await admin.rpc("check_rate_limit", {
      p_key: key,
      p_limit: limit,
      p_window_seconds: windowSeconds,
    });
    if (!error && typeof data === "boolean") return data;
  }
  return memoryLimit(key, limit, windowSeconds);
}
