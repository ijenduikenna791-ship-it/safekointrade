"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import { Check, Info } from "lucide-react";
import { Link, useRouter } from "@/lib/i18n/navigation";
import { createInvestmentAction } from "@/lib/actions/user";
import { amountSchema } from "@/lib/validation/schemas";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Field, Input } from "@/components/ui/field";
import { Dialog } from "@/components/ui/dialog";
import { Alert } from "@/components/ui/feedback";
import { FormAlert, useFieldError } from "@/components/forms/form-alert";
import { formatDate, formatMoney, formatPercent, toNumber } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";
import { nowMs } from "@/lib/utils/time";

const riskTone = { low: "gain", moderate: "warn", high: "loss" };

export function InvestForm({ plans, available, initialSlug }) {
  const t = useTranslations("dashboard.invest");
  const tp = useTranslations("home.plans");
  const tc = useTranslations("common");
  const tq = useTranslations("dashboard.overview.quick");
  const fe = useFieldError();
  const locale = useLocale();
  const router = useRouter();
  const [planId, setPlanId] = useState(() => (plans.find((p) => p.slug === initialSlug) || plans[0])?.id);
  const [amount, setAmount] = useState("");
  const [fieldError, setFieldError] = useState(null);
  const [serverError, setServerError] = useState(null);
  const [review, setReview] = useState(false);
  const [busy, setBusy] = useState(false);
  const [key, setKey] = useState(() => crypto.randomUUID());

  const plan = plans.find((p) => p.id === planId);
  if (!plans.length) return <Alert tone="info">{t("noPlans")}</Alert>;

  const validate = () => {
    const parsed = amountSchema.safeParse(amount);
    if (!parsed.success) {
      setFieldError(parsed.error.issues[0].message);
      return null;
    }
    const n = toNumber(parsed.data);
    if (n < toNumber(plan.min_amount) || n > toNumber(plan.max_amount)) {
      setFieldError(null);
      setServerError(n < toNumber(plan.min_amount) ? "amount_below_min" : "amount_above_max");
      return null;
    }
    if (n > toNumber(available)) {
      setServerError("insufficient_funds");
      return null;
    }
    setFieldError(null);
    setServerError(null);
    return parsed.data;
  };

  const confirm = async () => {
    const value = validate();
    if (!value) return setReview(false);
    setBusy(true);
    const res = await createInvestmentAction({ planId, amount: value, idempotencyKey: key }).catch(() => ({ ok: false, error: "network" }));
    setBusy(false);
    if (!res.ok) {
      setReview(false);
      setServerError(res.error);
      return;
    }
    setKey(crypto.randomUUID());
    toast.success(`${t("success")} · ${res.data.reference}`);
    router.push("/dashboard/investments");
    router.refresh();
  };

  const maturity = plan ? new Date(nowMs() + plan.term_days * 86_400_000) : null;
  const belowMin = toNumber(available) < Math.min(...plans.map((p) => toNumber(p.min_amount)));
  const hasTarget = plan?.target_return_min != null;

  return (
    <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
      <fieldset>
        <legend className="mb-3 text-sm font-medium">{t("choosePlan")}</legend>
        <div role="radiogroup" className="grid gap-3">
          {plans.map((p) => {
            const active = p.id === planId;
            return (
              <button
                key={p.id}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => setPlanId(p.id)}
                className={cn(
                  "flex items-start gap-4 rounded-lg border bg-surface p-4 text-start transition-[border-color,box-shadow]",
                  active ? "border-brass shadow-[0_0_0_3px_var(--brass-soft)]" : "border-line hover:border-line-strong"
                )}
              >
                <span className={cn("mt-1 grid h-5 w-5 shrink-0 place-items-center rounded-full border", active ? "border-brass bg-brass text-inverse" : "border-line-strong")}>
                  {active && <Check className="h-3 w-3" strokeWidth={3} aria-hidden="true" />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-semibold">{p.name}</span>
                    <Badge tone={riskTone[p.risk_level]}>{tc(`risk.${p.risk_level}`)}</Badge>
                  </span>
                  <span className="mt-1 block text-sm text-ink-muted">{p.description}</span>
                  <span className="tabular mt-2 block text-sm">
                    {formatMoney(p.min_amount, { locale })} – {formatMoney(p.max_amount, { locale })} · {tp("days", { count: p.term_days })}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </fieldset>

      <div className="rounded-lg border border-line bg-surface p-5 lg:sticky lg:top-24 lg:self-start">
        {belowMin && (
          <Alert tone="info" className="mb-4">
            {t("insufficient")}{" "}
            <Link href="/dashboard/deposits" className="font-medium underline">{tq("deposit")}</Link>
          </Alert>
        )}
        <FormAlert code={serverError} className="mb-4" />
        <form
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            if (validate()) setReview(true);
          }}
          className="space-y-4"
        >
          <Field label={t("amount")} error={fe(fieldError)} hint={plan ? t("amountHint", { min: formatMoney(plan.min_amount, { locale }), max: formatMoney(plan.max_amount, { locale }) }) : null}>
            {(a) => (
              <Input {...a} inputMode="decimal" autoComplete="off" value={amount} onChange={(e) => setAmount(e.target.value)} className="tabular text-lg" placeholder="0.00" />
            )}
          </Field>
          <p className="tabular text-sm text-ink-muted">{t("available", { amount: formatMoney(available, { locale }) })}</p>
          <Button type="submit" size="lg" className="w-full" disabled={!plan}>{t("review")}</Button>
        </form>
      </div>

      <Dialog open={review} onClose={() => !busy && setReview(false)} title={t("confirmTitle")} description={t("confirmBody")} closeLabel={tc("close")}>
        {plan && (
          <dl className="divide-y divide-line rounded-md border border-line text-sm">
            {[
              [t("plan"), plan.name],
              [t("amount"), formatMoney(amount || 0, { locale })],
              [t("term"), tp("days", { count: plan.term_days })],
              [t("matures"), formatDate(maturity, { locale })],
              [t("returns"), hasTarget ? `${formatPercent(plan.target_return_min, { locale })} – ${formatPercent(plan.target_return_max, { locale })}` : "—"],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between gap-4 px-4 py-2.5">
                <dt className="text-ink-subtle">{k}</dt>
                <dd className="tabular text-end font-medium">{v}</dd>
              </div>
            ))}
          </dl>
        )}
        <p className="mt-4 flex items-start gap-2 text-sm text-ink-muted">
          <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          {hasTarget ? plan.target_return_basis : t("noReturnsNote")}
        </p>
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="secondary" onClick={() => setReview(false)} disabled={busy}>{tc("back")}</Button>
          <Button onClick={confirm} loading={busy}>{t("confirm")}</Button>
        </div>
      </Dialog>
    </div>
  );
}
