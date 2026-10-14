"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import {
  changePasswordSchema, depositSchema, investmentSchema, notificationPrefsSchema, preferencesSchema,
  profileSchema, ticketReplySchema, ticketSchema, withdrawalSchema,
} from "@/lib/validation/schemas";
import { actionUser } from "@/lib/authorization/guards";
import { errorCode, fail, fieldErrorsFrom, ok } from "@/lib/database/errors";
import { notifyByEmail, sendEmail } from "@/lib/email/send";
import { rateLimit } from "@/lib/security/rate-limit";
import { parsePhoneNumberFromString } from "libphonenumber-js/min";
import { z } from "zod";

const refresh = () => revalidatePath("/", "layout");
const uuidSchema = z.string().uuid();

function parse(schema, input) {
  const parsed = schema.safeParse(input);
  return parsed.success ? { data: parsed.data } : { error: fail("validation", fieldErrorsFrom(parsed.error)) };
}

// --- Deposits ------------------------------------------------------------------------
export async function requestDepositAction(input) {
  const { viewer, error } = await actionUser();
  if (error) return fail(error);
  const { data: v, error: invalid } = parse(depositSchema, input);
  if (invalid) return invalid;
  if (!(await rateLimit(`deposit:${viewer.user.id}`, { limit: 10, windowSeconds: 3600 }))) return fail("rate_limited");

  const { data, error: dbError } = await viewer.supabase.rpc("request_deposit", {
    p_amount: v.amount,
    p_asset: v.assetSymbol,
    p_method: v.method,
    p_tx_reference: v.txReference || null,
    p_note: v.note || null,
    p_idempotency_key: v.idempotencyKey,
  });
  if (dbError) return fail(errorCode(dbError));
  refresh();
  await notifyByEmail(viewer.supabase, viewer.user.id, "deposits", {
    subject: `Deposit request ${data.reference} received`,
    text: `We received your deposit request ${data.reference} for ${data.amount} ${data.currency}. Your balance changes only after a reviewer confirms the funds.`,
    cta: { href: "/dashboard/deposits", label: "View deposits" },
  });
  return ok({ id: data.id, reference: data.reference });
}

const RECEIPT_TYPES = {
  "image/png": { ext: "png", magic: [0x89, 0x50, 0x4e, 0x47] },
  "image/jpeg": { ext: "jpg", magic: [0xff, 0xd8, 0xff] },
  "image/webp": { ext: "webp", magic: [0x52, 0x49, 0x46, 0x46] },
  "application/pdf": { ext: "pdf", magic: [0x25, 0x50, 0x44, 0x46] },
};
const MAX_RECEIPT = 5 * 1024 * 1024;

/** Validates type by magic bytes (not just the declared MIME) and size before storing privately. */
export async function uploadReceiptAction(formData) {
  const { viewer, error } = await actionUser();
  if (error) return fail(error);
  const depositId = formData.get("depositId");
  const file = formData.get("file");
  if (!uuidSchema.safeParse(depositId).success) return fail("invalid_request");
  if (!file || typeof file === "string" || file.size === 0 || file.size > MAX_RECEIPT) return fail("upload_invalid");
  const spec = RECEIPT_TYPES[file.type];
  if (!spec) return fail("upload_invalid");
  const head = new Uint8Array(await file.slice(0, 8).arrayBuffer());
  if (!spec.magic.every((b, i) => head[i] === b)) return fail("upload_invalid");
  if (!(await rateLimit(`receipt:${viewer.user.id}`, { limit: 10, windowSeconds: 3600 }))) return fail("rate_limited");

  const path = `${viewer.user.id}/${depositId}-${crypto.randomUUID().slice(0, 8)}.${spec.ext}`;
  const { error: upError } = await viewer.supabase.storage.from("receipts").upload(path, file, {
    contentType: file.type,
    upsert: false,
  });
  if (upError) return fail("upload_invalid");
  const { error: dbError } = await viewer.supabase.rpc("attach_deposit_receipt", { p_deposit: depositId, p_path: path });
  if (dbError) return fail(errorCode(dbError));
  refresh();
  return ok();
}

/** Short-lived signed URL so a receipt is never publicly addressable. */
export async function receiptUrlAction(depositId) {
  const { viewer, error } = await actionUser();
  if (error) return fail(error);
  if (!uuidSchema.safeParse(depositId).success) return fail("invalid_request");
  const { data: dep } = await viewer.supabase.from("deposit_requests").select("receipt_path").eq("id", depositId).maybeSingle();
  if (!dep?.receipt_path) return fail("not_found");
  const { data, error: sErr } = await viewer.supabase.storage.from("receipts").createSignedUrl(dep.receipt_path, 60);
  if (sErr) return fail("not_found");
  return ok({ url: data.signedUrl });
}

// --- Withdrawals ---------------------------------------------------------------------
export async function requestWithdrawalAction(input) {
  const { viewer, error } = await actionUser();
  if (error) return fail(error);
  const { data: v, error: invalid } = parse(withdrawalSchema, input);
  if (invalid) return invalid;
  if (!(await rateLimit(`withdraw:${viewer.user.id}`, { limit: 6, windowSeconds: 3600 }))) return fail("rate_limited");

  const { data, error: dbError } = await viewer.supabase.rpc("request_withdrawal", {
    p_amount: v.amount,
    p_asset: v.assetSymbol,
    p_network: v.network,
    p_destination: v.destination,
    p_idempotency_key: v.idempotencyKey,
  });
  if (dbError) return fail(errorCode(dbError));
  refresh();
  await notifyByEmail(viewer.supabase, viewer.user.id, "withdrawals", {
    subject: `Withdrawal ${data.reference} requested`,
    text: `Your withdrawal ${data.reference} of ${data.amount} ${data.currency} is pending review. If you didn't request this, change your password and contact support now.`,
    cta: { href: "/dashboard/withdrawals", label: "View withdrawals" },
  });
  return ok({ id: data.id, reference: data.reference });
}

export async function cancelWithdrawalAction(id) {
  const { viewer, error } = await actionUser();
  if (error) return fail(error);
  if (!uuidSchema.safeParse(id).success) return fail("invalid_request");
  const { error: dbError } = await viewer.supabase.rpc("cancel_withdrawal", { p_id: id });
  if (dbError) return fail(errorCode(dbError));
  refresh();
  return ok();
}

// --- Investments ---------------------------------------------------------------------
export async function createInvestmentAction(input) {
  const { viewer, error } = await actionUser();
  if (error) return fail(error);
  const { data: v, error: invalid } = parse(investmentSchema, input);
  if (invalid) return invalid;
  if (!(await rateLimit(`invest:${viewer.user.id}`, { limit: 20, windowSeconds: 3600 }))) return fail("rate_limited");

  const { data, error: dbError } = await viewer.supabase.rpc("create_investment", {
    p_plan_id: v.planId,
    p_amount: v.amount,
    p_idempotency_key: v.idempotencyKey,
  });
  if (dbError) return fail(errorCode(dbError));
  refresh();
  await notifyByEmail(viewer.supabase, viewer.user.id, "investments", {
    subject: `Position ${data.reference} opened`,
    text: `Your ${data.plan_name} position ${data.reference} for ${data.amount} ${data.currency} is active. It matures on ${String(data.matures_at).slice(0, 10)}.`,
    cta: { href: "/dashboard/investments", label: "View positions" },
  });
  return ok({ id: data.id, reference: data.reference });
}

export async function cancelInvestmentAction(id) {
  const { viewer, error } = await actionUser();
  if (error) return fail(error);
  if (!uuidSchema.safeParse(id).success) return fail("invalid_request");
  const { error: dbError } = await viewer.supabase.rpc("cancel_investment", { p_id: id });
  if (dbError) return fail(errorCode(dbError));
  refresh();
  return ok();
}

// --- Support -------------------------------------------------------------------------
export async function createTicketAction(input) {
  const { viewer, error } = await actionUser();
  if (error) return fail(error);
  const { data: v, error: invalid } = parse(ticketSchema, input);
  if (invalid) return invalid;
  const { data, error: dbError } = await viewer.supabase.rpc("create_support_ticket", {
    p_subject: v.subject,
    p_category: v.category,
    p_message: v.message,
  });
  if (dbError) return fail(errorCode(dbError));
  refresh();
  return ok({ id: data.id, reference: data.reference });
}

export async function replyTicketAction(input) {
  const { viewer, error } = await actionUser();
  if (error) return fail(error);
  const { data: v, error: invalid } = parse(ticketReplySchema, input);
  if (invalid) return invalid;
  if (!(await rateLimit(`reply:${viewer.user.id}`, { limit: 30, windowSeconds: 3600 }))) return fail("rate_limited");
  const { error: dbError } = await viewer.supabase.rpc("reply_to_ticket", { p_ticket: v.ticketId, p_message: v.message });
  if (dbError) return fail(errorCode(dbError));
  refresh();
  return ok();
}

export async function closeTicketAction(id) {
  const { viewer, error } = await actionUser();
  if (error) return fail(error);
  if (!uuidSchema.safeParse(id).success) return fail("invalid_request");
  const { error: dbError } = await viewer.supabase.rpc("close_ticket", { p_ticket: id });
  if (dbError) return fail(errorCode(dbError));
  refresh();
  return ok();
}

// --- Notifications -------------------------------------------------------------------
export async function markNotificationAction(id, action = "read") {
  const { viewer, error } = await actionUser();
  if (error) return fail(error);
  if (id === "all") {
    const { error: dbError } = await viewer.supabase.rpc("mark_all_notifications_read");
    if (dbError) return fail(errorCode(dbError));
  } else {
    if (!uuidSchema.safeParse(id).success) return fail("invalid_request");
    const q = viewer.supabase.from("notifications");
    const { error: dbError } =
      action === "delete" ? await q.delete().eq("id", id) : await q.update({ read_at: new Date().toISOString() }).eq("id", id);
    if (dbError) return fail(errorCode(dbError));
  }
  refresh();
  return ok();
}

// --- Settings ------------------------------------------------------------------------
export async function updateProfileAction(input) {
  const { viewer, error } = await actionUser();
  if (error) return fail(error);
  const { data: v, error: invalid } = parse(profileSchema, input);
  if (invalid) return invalid;
  const phone = parsePhoneNumberFromString(v.phone);
  const { error: dbError } = await viewer.supabase
    .from("profiles")
    .update({ full_name: v.fullName, phone: phone?.number, country: v.country || phone?.country || null })
    .eq("id", viewer.user.id);
  if (dbError) return fail(errorCode(dbError));
  refresh();
  return ok();
}

export async function updatePreferencesAction(input) {
  const { viewer, error } = await actionUser();
  if (error) return fail(error);
  const { data: v, error: invalid } = parse(preferencesSchema, input);
  if (invalid) return invalid;
  const { error: dbError } = await viewer.supabase.from("profiles").update({ locale: v.locale, theme: v.theme }).eq("id", viewer.user.id);
  if (dbError) return fail(errorCode(dbError));
  (await cookies()).set("NEXT_LOCALE", v.locale, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
  refresh();
  return ok();
}

export async function updateNotificationPrefsAction(input) {
  const { viewer, error } = await actionUser();
  if (error) return fail(error);
  const { data: v, error: invalid } = parse(notificationPrefsSchema, input);
  if (invalid) return invalid;
  const { error: dbError } = await viewer.supabase.from("notification_preferences").update(v).eq("user_id", viewer.user.id);
  if (dbError) return fail(errorCode(dbError));
  return ok();
}

export async function changePasswordAction(input) {
  const { viewer, error } = await actionUser();
  if (error) return fail(error);
  const { data: v, error: invalid } = parse(changePasswordSchema, input);
  if (invalid) return invalid;
  if (!(await rateLimit(`password:${viewer.user.id}`, { limit: 5, windowSeconds: 3600 }))) return fail("rate_limited");
  const { error: authError } = await viewer.supabase.auth.updateUser({ password: v.password });
  if (authError) {
    if (/same/i.test(authError.message)) return fail("validation", { password: "passwordSame" });
    if (/weak|pwned|leaked/i.test(authError.message)) return fail("validation", { password: "passwordBreached" });
    if (/reauthentication|aal2|mfa/i.test(authError.message)) return fail("mfa_required");
    return fail("generic");
  }
  // Sign out every other session after a password change.
  await viewer.supabase.auth.signOut({ scope: "others" });
  await sendEmail({
    to: viewer.profile.email,
    subject: "Your password was changed",
    text: "The password on your account was just changed and your other sessions were signed out. If this wasn't you, reset your password immediately and contact support.",
    cta: { href: "/forgot-password", label: "Reset password" },
  });
  return ok();
}
