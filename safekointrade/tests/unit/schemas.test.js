import { describe, it, expect } from "vitest";
import {
  passwordScore,
  passwordRules,
  registerSchema,
  resetSchema,
  amountSchema,
  withdrawalSchema,
  planSchema,
  usernameSchema,
  newsletterSchema,
} from "@/lib/validation/schemas";

const firstError = (r) => r.error?.issues?.[0]?.message;
const strong = "Correct-Horse-9";

const validRegistration = {
  fullName: "Ada Obi",
  username: "ada_obi",
  email: "Ada@Example.com ",
  phone: "+2348031234567",
  password: strong,
  confirmPassword: strong,
  acceptTerms: true,
  referralCode: "",
};

describe("password rules", () => {
  it("requires all five character classes", () => {
    expect(passwordRules.map((r) => r.key)).toEqual(["length", "lower", "upper", "number", "symbol"]);
    expect(passwordRules.every((r) => r.test(strong))).toBe(true);
    expect(passwordRules.every((r) => r.test("short1!A"))).toBe(false);
  });

  it("scores 0–4 and caps common patterns", () => {
    expect(passwordScore("")).toBe(0);
    expect(passwordScore("abc")).toBeLessThanOrEqual(1);
    expect(passwordScore(strong)).toBe(4);
    expect(passwordScore("Password123!")).toBeLessThanOrEqual(1);
    expect(passwordScore("aaaaaaaaaaaa")).toBeLessThanOrEqual(1);
  });
});

describe("registerSchema", () => {
  it("accepts a valid registration and normalises email", () => {
    const r = registerSchema.safeParse(validRegistration);
    expect(r.success).toBe(true);
    expect(r.data.email).toBe("ada@example.com");
  });

  it("rejects mismatched confirmation on the confirm field", () => {
    const r = registerSchema.safeParse({ ...validRegistration, confirmPassword: strong + "x" });
    expect(r.success).toBe(false);
    const issue = r.error.issues.find((i) => i.message === "passwordMismatch");
    expect(issue.path).toEqual(["confirmPassword"]);
  });

  it("rejects weak passwords", () => {
    const r = registerSchema.safeParse({ ...validRegistration, password: "alllowercase", confirmPassword: "alllowercase" });
    expect(r.error.issues.some((i) => i.message === "passwordWeak")).toBe(true);
  });

  it("requires terms acceptance", () => {
    const r = registerSchema.safeParse({ ...validRegistration, acceptTerms: false });
    expect(r.error.issues.some((i) => i.message === "termsRequired")).toBe(true);
  });

  it("rejects invalid phone numbers", () => {
    const r = registerSchema.safeParse({ ...validRegistration, phone: "+2341" });
    expect(r.error.issues.some((i) => i.message === "phoneInvalid")).toBe(true);
  });

  it("rejects malformed referral codes", () => {
    const r = registerSchema.safeParse({ ...validRegistration, referralCode: "ab-12" });
    expect(r.error.issues.some((i) => i.message === "referralInvalid")).toBe(true);
  });
});

describe("resetSchema", () => {
  it("requires matching passwords", () => {
    expect(resetSchema.safeParse({ password: strong, confirmPassword: strong }).success).toBe(true);
    expect(firstError(resetSchema.safeParse({ password: strong, confirmPassword: "nope" }))).toBe("passwordMismatch");
  });
});

describe("usernameSchema", () => {
  it("lowercases and restricts characters", () => {
    expect(usernameSchema.parse("Ada_01")).toBe("ada_01");
    expect(firstError(usernameSchema.safeParse("ad"))).toBe("usernameShort");
    expect(firstError(usernameSchema.safeParse("ada obi"))).toBe("usernameChars");
  });
});

describe("amountSchema", () => {
  it.each([
    ["100", "100"],
    ["1,250.50", "1250.50"],
    [42.5, "42.5"],
    [" 7.01 ", "7.01"],
  ])("accepts %s", (input, expected) => {
    expect(amountSchema.parse(input)).toBe(expected);
  });

  it.each([["0"], ["-5"], ["1.234"], ["abc"], ["1e5"], [""], ["1234567890123"]])("rejects %s", (input) => {
    expect(amountSchema.safeParse(input).success).toBe(false);
  });

  it("flags zero as non-positive", () => {
    expect(firstError(amountSchema.safeParse("0"))).toBe("amountPositive");
  });
});

describe("withdrawalSchema", () => {
  const base = {
    amount: "50",
    assetSymbol: "usdt",
    destination: "0x52908400098527886E0F7030069857D2E4169EE7",
    network: "Ethereum (ERC-20)",
    idempotencyKey: "4f7a8d1c-5b9e-4c2a-9d3f-1e2b3c4d5e6f",
  };

  it("accepts a valid request and uppercases the asset", () => {
    expect(withdrawalSchema.parse(base).assetSymbol).toBe("USDT");
  });

  it("rejects destinations with unsafe characters", () => {
    expect(withdrawalSchema.safeParse({ ...base, destination: "0xabc<script>defghij" }).success).toBe(false);
  });

  it("requires a UUID idempotency key", () => {
    expect(withdrawalSchema.safeParse({ ...base, idempotencyKey: "1" }).success).toBe(false);
  });
});

describe("planSchema", () => {
  const plan = {
    name: "Growth",
    slug: "growth",
    description: "A ninety-day plan for mid-sized positions.",
    min_amount: "500",
    max_amount: "5000",
    currency: "usd",
    term_days: "90",
    risk_level: "moderate",
    risk_description: "Exposed to crypto market volatility.",
    target_return_min: "",
    target_return_max: "",
    target_return_basis: "",
    is_active: true,
    sort_order: "2",
  };

  it("accepts a plan with no return target", () => {
    expect(planSchema.safeParse(plan).success).toBe(true);
  });

  it("requires max above min", () => {
    const r = planSchema.safeParse({ ...plan, max_amount: "100" });
    expect(r.error.issues.some((i) => i.message === "rangeInvalid")).toBe(true);
  });

  it("refuses a return target without a published basis", () => {
    const r = planSchema.safeParse({ ...plan, target_return_min: "2", target_return_max: "4" });
    expect(r.error.issues.some((i) => i.message === "targetBasisRequired")).toBe(true);
  });

  it("refuses half a target range", () => {
    const r = planSchema.safeParse({ ...plan, target_return_min: "2", target_return_basis: "Published method" });
    expect(r.success).toBe(false);
  });

  it("accepts a full target with basis", () => {
    const r = planSchema.safeParse({
      ...plan,
      target_return_min: "2",
      target_return_max: "4",
      target_return_basis: "Historical staking yield, published on the plan page.",
    });
    expect(r.success).toBe(true);
  });
});

describe("newsletterSchema", () => {
  it("requires consent and an empty honeypot", () => {
    expect(newsletterSchema.safeParse({ email: "a@b.co", consent: true, website: "" }).success).toBe(true);
    expect(newsletterSchema.safeParse({ email: "a@b.co", consent: false }).success).toBe(false);
    expect(newsletterSchema.safeParse({ email: "a@b.co", consent: true, website: "spam" }).success).toBe(false);
  });
});
