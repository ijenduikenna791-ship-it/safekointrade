"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { actionStaff } from "@/lib/authorization/guards";
import { errorCode, fail, fieldErrorsFrom, ok } from "@/lib/database/errors";
import {
  announcementSchema, planSchema, reviewSchema, roleAssignSchema, settingSchema, userStatusSchema,
} from "@/lib/validation/schemas";
import { notifyByEmail } from "@/lib/email/send";
import { amountSchema } from "@/lib/validation/schemas";

const refresh = () => revalidatePath("/", "layout");

function parse(schema, input) {
  const parsed = schema.safeParse(input);
  return parsed.success ? { data: parsed.data } : { error: fail("validation", fieldErrorsFrom(parsed.error)) };
}

// --- Deposits -------------------------------------------------------------------------
export async function reviewDepositAction(input) {
  const { viewer, error } = await actionStaff("finance.review");
  if (error) return fail(error);
  const { data: v, error: invalid } = parse(reviewSchema.extend({ creditedAmount: amountSchema.optional().or(z.literal("")) }), input);
  if (invalid) return invalid;
  if (!["approve", "reject"].includes(v.decision)) return fail("invalid_decision");

  const { data, error: dbError } = await viewer.supabase.rpc("review_deposit", {
    p_id: v.id,
    p_decision: v.decision,
    p_note: v.note || null,
    p_credited_amount: v.creditedAmount || null,
  });
  if (dbError) return fail(errorCode(dbError));
  refresh();
  await notifyByEmail(viewer.supabase, data.user_id, "deposits", v.decision === "approve"
    ? {
        subject: `Deposit ${data.reference} confirmed`,
        text: `Deposit ${data.reference} was confirmed and ${data.credited_amount} ${data.currency} was credited to your available balance.`,
        cta: { href: "/dashboard/deposits", label: "View deposits" },
      }
    : {
        subject: `Deposit ${data.reference} not confirmed`,
        text: `We couldn't confirm deposit ${data.reference}. Reason: ${data.review_note}. Open a support ticket if you have questions.`,
        cta: { href: "/dashboard/support", label: "Contact support" },
      });
  return ok({ status: data.status });
}

/** Signed URL (60s) for a customer's receipt; storage RLS limits this to finance roles. */
export async function staffReceiptUrlAction(depositId) {
  const { viewer, error } = await actionStaff("finance.view");
  if (error) return fail(error);
  if (!z.string().uuid().safeParse(depositId).success) return fail("invalid_request");
  const { data: dep } = await viewer.supabase.from("deposit_requests").select("receipt_path").eq("id", depositId).maybeSingle();
  if (!dep?.receipt_path) return fail("not_found");
  const { data, error: sErr } = await viewer.supabase.storage.from("receipts").createSignedUrl(dep.receipt_path, 60);
  if (sErr) return fail("forbidden");
  return ok({ url: data.signedUrl });
}

// --- Withdrawals ----------------------------------------------------------------------
export async function reviewWithdrawalAction(input) {
  const { viewer, error } = await actionStaff("finance.review");
  if (error) return fail(error);
  const { data: v, error: invalid } = parse(reviewSchema, input);
  if (invalid) return invalid;

  const { data, error: dbError } = await viewer.supabase.rpc("review_withdrawal", {
    p_id: v.id,
    p_decision: v.decision,
    p_note: v.note || null,
    p_payout_reference: v.payoutReference || null,
  });
  if (dbError) return fail(errorCode(dbError));
  refresh();
  const messages = {
    approve: { subject: `Withdrawal ${data.reference} approved`, text: `Withdrawal ${data.reference} was approved and is waiting for payout confirmation.` },
    complete: { subject: `Withdrawal ${data.reference} completed`, text: `Withdrawal ${data.reference} was paid out. Payout reference: ${data.payout_reference}.` },
    reject: { subject: `Withdrawal ${data.reference} rejected`, text: `Withdrawal ${data.reference} was rejected and the funds returned to your available balance. Reason: ${data.review_note}.` },
  };
  if (messages[v.decision]) {
    await notifyByEmail(viewer.supabase, data.user_id, "withdrawals", { ...messages[v.decision], cta: { href: "/dashboard/withdrawals", label: "View withdrawals" } });
  }
  return ok({ status: data.status });
}

// --- Positions ------------------------------------------------------------------------
export async function processMaturitiesAction() {
  const { viewer, error } = await actionStaff("finance.review");
  if (error) return fail(error);
  const { data, error: dbError } = await viewer.supabase.rpc("process_matured_investments", { p_limit: 500 });
  if (dbError) return fail(errorCode(dbError));
  refresh();
  return ok({ count: data ?? 0 });
}

// --- Users ----------------------------------------------------------------------------
export async function setUserStatusAction(input) {
  const { viewer, error } = await actionStaff("users.manage");
  if (error) return fail(error);
  const { data: v, error: invalid } = parse(userStatusSchema, input);
  if (invalid) return invalid;
  const { error: dbError } = await viewer.supabase.rpc("set_user_status", { p_user: v.userId, p_status: v.status, p_reason: v.reason });
  if (dbError) return fail(errorCode(dbError));
  refresh();
  return ok();
}

export async function setUserRoleAction(input) {
  const { viewer, error } = await actionStaff("roles.manage");
  if (error) return fail(error);
  const { data: v, error: invalid } = parse(roleAssignSchema, input);
  if (invalid) return invalid;
  const { error: dbError } = await viewer.supabase.rpc("set_user_role", { p_user: v.userId, p_role: v.role, p_action: v.action });
  if (dbError) return fail(errorCode(dbError));
  refresh();
  return ok();
}

// --- Plans & assets -------------------------------------------------------------------
export async function upsertPlanAction(input) {
  const { viewer, error } = await actionStaff("plans.manage");
  if (error) return fail(error);
  const { data: v, error: invalid } = parse(planSchema, input);
  if (invalid) return invalid;
  const payload = {
    ...v,
    id: v.id || "",
    target_return_min: v.target_return_min || "",
    target_return_max: v.target_return_max || "",
    target_return_basis: v.target_return_basis || "",
  };
  const { data, error: dbError } = await viewer.supabase.rpc("upsert_plan", { p_plan: payload });
  if (dbError) {
    const code = errorCode(dbError);
    return code === "slug_taken" ? fail("validation", { slug: "slugInvalid" }) : fail(code);
  }
  refresh();
  return ok({ id: data.id });
}

export async function setAssetFlagsAction(input) {
  const { viewer, error } = await actionStaff("settings.manage");
  if (error) return fail(error);
  const schema = z.object({ symbol: z.string().regex(/^[A-Z0-9]{2,10}$/), active: z.boolean(), deposits: z.boolean(), withdrawals: z.boolean() });
  const { data: v, error: invalid } = parse(schema, input);
  if (invalid) return invalid;
  const { error: dbError } = await viewer.supabase.rpc("set_asset_flags", {
    p_symbol: v.symbol, p_active: v.active, p_deposits: v.deposits, p_withdrawals: v.withdrawals,
  });
  if (dbError) return fail(errorCode(dbError));
  refresh();
  return ok();
}

// --- Settings -------------------------------------------------------------------------
export async function updateSettingAction(input) {
  const { viewer, error } = await actionStaff("settings.manage");
  if (error) return fail(error);
  const { data: v, error: invalid } = parse(settingSchema, input);
  if (invalid) return invalid;
  let value;
  if (["maintenance_mode", "registrations_open"].includes(v.key)) {
    if (!["true", "false"].includes(v.value)) return fail("invalid_request");
    value = v.value === "true";
  } else {
    const n = Number(v.value);
    if (!Number.isFinite(n) || n < 0 || !/^\d{1,9}(\.\d{1,2})?$/.test(v.value)) return fail("validation", { value: "amountInvalid" });
    value = n;
  }
  const { error: dbError } = await viewer.supabase.rpc("update_setting", { p_key: v.key, p_value: value });
  if (dbError) return fail(errorCode(dbError));
  refresh();
  return ok();
}

// --- Announcements --------------------------------------------------------------------
export async function sendAnnouncementAction(input) {
  const { viewer, error } = await actionStaff("notifications.send");
  if (error) return fail(error);
  const schema = announcementSchema.extend({ email: z.string().trim().toLowerCase().email().optional().or(z.literal("")) });
  const { data: v, error: invalid } = parse(schema, input);
  if (invalid) return invalid;
  let userId = null;
  if (v.audience === "user") {
    const { data: u } = await viewer.supabase.from("profiles").select("id").ilike("email", v.email || "").maybeSingle();
    if (!u) return fail("validation", { email: "emailInvalid" });
    userId = u.id;
  }
  const { data, error: dbError } = await viewer.supabase.rpc("send_announcement", { p_title: v.title, p_body: v.body, p_user: userId });
  if (dbError) return fail(errorCode(dbError));
  refresh();
  return ok({ count: data ?? 0 });
}

// --- Support --------------------------------------------------------------------------
export async function setTicketStatusAction(input) {
  const { viewer, error } = await actionStaff("support.manage");
  if (error) return fail(error);
  const schema = z.object({
    id: z.string().uuid(),
    status: z.enum(["open", "answered", "closed"]),
    priority: z.enum(["low", "normal", "high"]).optional(),
  });
  const { data: v, error: invalid } = parse(schema, input);
  if (invalid) return invalid;
  const { error: dbError } = await viewer.supabase.rpc("set_ticket_status", { p_ticket: v.id, p_status: v.status, p_priority: v.priority || null });
  if (dbError) return fail(errorCode(dbError));
  refresh();
  return ok();
}
