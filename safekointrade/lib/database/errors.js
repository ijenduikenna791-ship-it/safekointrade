/**
 * Maps database/auth errors to stable keys in the "errors" message namespace.
 * Database functions raise `app:<code>` (see migration 0001, public.app_error).
 */
const KNOWN = new Set([
  "unauthorized", "forbidden", "mfa_required", "account_suspended", "maintenance", "amount_invalid",
  "amount_below_min", "amount_above_max", "amount_below_fee", "insufficient_funds", "asset_invalid",
  "method_invalid", "destination_invalid", "network_invalid", "too_many_pending", "duplicate_request",
  "invalid_request", "invalid_status", "invalid_decision", "not_found", "plan_invalid", "cancel_window_closed",
  "self_review_forbidden", "self_action_forbidden", "reason_required", "payout_reference_required",
  "credit_exceeds_request", "last_owner", "slug_taken", "ticket_closed", "message_invalid", "rate_limited",
  "email_invalid", "consent_required", "balance_missing",
]);

export function errorCode(error) {
  if (!error) return null;
  const message = String(error.message || error);
  const match = message.match(/app:([a-z_]+)/);
  if (match && KNOWN.has(match[1])) return match[1];
  if (/permission denied|row-level security/i.test(message)) return "forbidden";
  if (/JWT|not authenticated/i.test(message)) return "unauthorized";
  if (/fetch failed|network|ECONNREFUSED|ENOTFOUND/i.test(message)) return "network";
  return "generic";
}

/** Standard result object returned by every Server Action. */
export const ok = (data = null) => ({ ok: true, data });
export const fail = (code, fieldErrors) => ({ ok: false, error: code, ...(fieldErrors ? { fieldErrors } : {}) });

/** zod error -> { field: messageKey } */
export function fieldErrorsFrom(zodError) {
  const out = {};
  for (const issue of zodError.issues) {
    const key = issue.path.join(".") || "_";
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}
