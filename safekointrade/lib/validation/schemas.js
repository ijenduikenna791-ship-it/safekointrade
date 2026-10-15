import { z } from "zod";
import { isValidPhoneNumber } from "libphonenumber-js/min";

/**
 * Shared validation. Used by client forms (react-hook-form) AND re-run on the
 * server in every Server Action / Route Handler. Error messages are i18n keys
 * under the "validation" namespace, translated where they're displayed.
 */

export const PASSWORD_MIN = 10;

export const passwordRules = [
  { key: "length", test: (v) => v.length >= PASSWORD_MIN },
  { key: "lower", test: (v) => /[a-z]/.test(v) },
  { key: "upper", test: (v) => /[A-Z]/.test(v) },
  { key: "number", test: (v) => /\d/.test(v) },
  { key: "symbol", test: (v) => /[^A-Za-z0-9]/.test(v) },
];

/** 0–4 score for the strength meter. */
export function passwordScore(value = "") {
  if (!value) return 0;
  const passed = passwordRules.filter((r) => r.test(value)).length;
  let score = Math.max(0, passed - 1); // 0..4
  if (value.length >= 16 && passed === passwordRules.length) score = 4;
  if (/^(.)\1+$/.test(value) || /password|123456|qwerty/i.test(value)) score = Math.min(score, 1);
  return Math.min(4, score);
}

const email = z.string().trim().toLowerCase().min(1, "required").max(254, "emailInvalid").email("emailInvalid");

const password = z
  .string()
  .min(1, "required")
  .max(128, "passwordTooLong")
  .refine((v) => passwordRules.every((r) => r.test(v)), "passwordWeak");

export const phoneSchema = z
  .string()
  .trim()
  .min(1, "required")
  .refine((v) => {
    try {
      return isValidPhoneNumber(v);
    } catch {
      return false;
    }
  }, "phoneInvalid");

export const usernameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(3, "usernameShort")
  .max(24, "usernameLong")
  .regex(/^[a-z0-9_]+$/, "usernameChars");

export const registerSchema = z
  .object({
    fullName: z.string().trim().min(2, "nameShort").max(100, "nameLong"),
    username: usernameSchema,
    email,
    phone: phoneSchema,
    password,
    confirmPassword: z.string().min(1, "required"),
    acceptTerms: z.literal(true, { error: "termsRequired" }),
    referralCode: z
      .string()
      .trim()
      .toUpperCase()
      .max(16, "referralInvalid")
      .regex(/^[A-Z0-9]*$/, "referralInvalid")
      .optional()
      .or(z.literal("")),
  })
  .refine((d) => d.password === d.confirmPassword, { path: ["confirmPassword"], message: "passwordMismatch" });

export const loginSchema = z.object({
  email,
  password: z.string().min(1, "required").max(128, "passwordTooLong"),
});

export const forgotSchema = z.object({ email });

export const resetSchema = z
  .object({ password, confirmPassword: z.string().min(1, "required") })
  .refine((d) => d.password === d.confirmPassword, { path: ["confirmPassword"], message: "passwordMismatch" });

export const newsletterSchema = z.object({
  email,
  consent: z.literal(true, { error: "consentRequired" }),
  website: z.string().max(0).optional().or(z.literal("")), // honeypot
});

// --- Money -----------------------------------------------------------------
// Amounts travel as strings with at most 2 decimals and are cast to numeric in
// Postgres; the browser never decides balances.
export const amountSchema = z
  .union([z.string(), z.number()])
  .transform((v) => String(v).trim().replace(/,/g, ""))
  .refine((v) => /^\d{1,12}(\.\d{1,2})?$/.test(v), "amountInvalid")
  .refine((v) => Number(v) > 0, "amountPositive");

const idempotencyKey = z.string().uuid("invalidRequest");

export const depositSchema = z.object({
  amount: amountSchema,
  assetSymbol: z.string().trim().toUpperCase().min(2).max(10),
  method: z.enum(["crypto_transfer", "bank_transfer"], { error: "methodInvalid" }),
  txReference: z.string().trim().max(140, "referenceLong").optional().or(z.literal("")),
  note: z.string().trim().max(500, "noteLong").optional().or(z.literal("")),
  idempotencyKey,
});

export const withdrawalSchema = z.object({
  amount: amountSchema,
  assetSymbol: z.string().trim().toUpperCase().min(2).max(10),
  destination: z
    .string()
    .trim()
    .min(10, "destinationInvalid")
    .max(128, "destinationInvalid")
    .regex(/^[A-Za-z0-9:._-]+$/, "destinationInvalid"),
  network: z.string().trim().min(2, "required").max(40),
  idempotencyKey,
});

export const investmentSchema = z.object({
  planId: z.string().uuid("planInvalid"),
  amount: amountSchema,
  idempotencyKey,
});

export const profileSchema = z.object({
  fullName: z.string().trim().min(2, "nameShort").max(100, "nameLong"),
  phone: phoneSchema,
  country: z.string().trim().length(2).optional().or(z.literal("")),
});

export const preferencesSchema = z.object({
  locale: z.enum(["en", "fr", "es", "pt", "de", "it", "ru", "ar", "zh", "ja", "hi"]),
  theme: z.enum(["light", "dark", "system"]),
});

export const notificationPrefsSchema = z.object({
  email_deposits: z.boolean(),
  email_withdrawals: z.boolean(),
  email_investments: z.boolean(),
  email_security: z.boolean(),
  email_product: z.boolean(),
});

export const changePasswordSchema = z
  .object({ password, confirmPassword: z.string().min(1, "required") })
  .refine((d) => d.password === d.confirmPassword, { path: ["confirmPassword"], message: "passwordMismatch" });

export const ticketSchema = z.object({
  subject: z.string().trim().min(4, "subjectShort").max(140, "subjectLong"),
  category: z.enum(["account", "deposit", "withdrawal", "investment", "security", "other"]),
  message: z.string().trim().min(10, "messageShort").max(4000, "messageLong"),
});

export const ticketReplySchema = z.object({
  ticketId: z.string().uuid("invalidRequest"),
  message: z.string().trim().min(1, "required").max(4000, "messageLong"),
});

// --- Admin -------------------------------------------------------------------
export const reviewSchema = z.object({
  id: z.string().uuid("invalidRequest"),
  decision: z.enum(["approve", "reject", "complete", "processing"]),
  note: z.string().trim().max(500, "noteLong").optional().or(z.literal("")),
  payoutReference: z.string().trim().max(140, "referenceLong").optional().or(z.literal("")),
});

export const planSchema = z
  .object({
    id: z.string().uuid().optional().or(z.literal("")),
    name: z.string().trim().min(2, "nameShort").max(60, "nameLong"),
    slug: z.string().trim().toLowerCase().regex(/^[a-z0-9-]{2,40}$/, "slugInvalid"),
    description: z.string().trim().min(10, "descriptionShort").max(400, "descriptionLong"),
    min_amount: amountSchema,
    max_amount: amountSchema,
    currency: z.string().trim().toUpperCase().length(3),
    term_days: z.coerce.number().int().min(1, "termInvalid").max(3650, "termInvalid"),
    risk_level: z.enum(["low", "moderate", "high"]),
    risk_description: z.string().trim().min(10, "descriptionShort").max(400, "descriptionLong"),
    target_return_min: z.union([amountSchema, z.literal(""), z.null()]).optional(),
    target_return_max: z.union([amountSchema, z.literal(""), z.null()]).optional(),
    target_return_basis: z.string().trim().max(400).optional().or(z.literal("")),
    is_active: z.boolean(),
    sort_order: z.coerce.number().int().min(0).max(1000),
  })
  .refine((d) => Number(d.max_amount) > Number(d.min_amount), { path: ["max_amount"], message: "rangeInvalid" })
  .refine(
    (d) => {
      const hasMin = d.target_return_min !== "" && d.target_return_min != null;
      const hasMax = d.target_return_max !== "" && d.target_return_max != null;
      if (hasMin !== hasMax) return false;
      // A target must come with its basis — no unexplained return figures.
      if (hasMin && !d.target_return_basis) return false;
      return true;
    },
    { path: ["target_return_basis"], message: "targetBasisRequired" }
  );

export const userStatusSchema = z.object({
  userId: z.string().uuid(),
  status: z.enum(["active", "suspended"]),
  reason: z.string().trim().min(4, "reasonRequired").max(500, "noteLong"),
});

export const roleAssignSchema = z.object({
  userId: z.string().uuid(),
  role: z.enum(["owner", "admin", "finance", "support"]),
  action: z.enum(["grant", "revoke"]),
});

export const announcementSchema = z.object({
  title: z.string().trim().min(4, "subjectShort").max(120, "subjectLong"),
  body: z.string().trim().min(10, "messageShort").max(2000, "messageLong"),
  audience: z.enum(["all", "user"]),
  userId: z.string().uuid().optional().or(z.literal("")),
});

export const settingSchema = z.object({
  key: z.enum([
    "withdrawal_fee_flat",
    "withdrawal_fee_percent",
    "withdrawal_min",
    "withdrawal_max",
    "deposit_min",
    "deposit_max",
    "maintenance_mode",
    "registrations_open",
  ]),
  value: z.string().trim().max(40),
});
