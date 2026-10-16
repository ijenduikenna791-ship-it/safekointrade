"use client";

import { useId, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Calculator, Info } from "lucide-react";
import { Link } from "@/lib/i18n/navigation";
import { buttonClasses } from "@/components/ui/button";
import { formatDate, formatMoney, formatPercent, toNumber } from "@/lib/utils/format";

/**
 * Shows what an amount looks like in a plan: term, end date, principal back and —
 * only when the plan publishes one — its target range. No invented rates.
 */
export function PlanCalculator({ plans, today }) {
  const t = useTranslations("home.calc");
  const locale = useLocale();
  const id = useId();
  const [slug, setSlug] = useState(plans[0]?.slug || "");
  const plan = plans.find((p) => p.slug === slug) || plans[0];
  const [amount, setAmount] = useState(plan ? String(toNumber(plan.min_amount)) : "");

  const view = useMemo(() => {
    if (!plan) return null;
    const a = toNumber(amount);
    const min = toNumber(plan.min_amount);
    const max = toNumber(plan.max_amount);
    const inRange = a >= min && a <= max;
    const end = new Date(new Date(today).getTime() + plan.term_days * 86400000);
    const hasTarget = plan.target_return_min != null && plan.target_return_max != null;
    return {
      a, min, max, inRange, end, hasTarget,
      lo: hasTarget ? (a * toNumber(plan.target_return_min)) / 100 : 0,
      hi: hasTarget ? (a * toNumber(plan.target_return_max)) / 100 : 0,
    };
  }, [plan, amount, today]);

  if (!plan || !view) return null;
  const m = (v) => formatMoney(v, { locale, currency: plan.currency || "USD" });

  return (
    <section aria-labelledby={`${id}-title`} className="mt-12 overflow-hidden rounded-2xl border border-line bg-surface shadow-sm">
      <div className="grid lg:grid-cols-[1fr_1.1fr]">
        <div className="p-6 sm:p-8">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-mint/20 text-brand-teal" aria-hidden="true">
              <Calculator className="h-5 w-5" />
            </span>
            <h3 id={`${id}-title`} className="text-2xl font-semibold tracking-tight">{t("title")}</h3>
          </div>
          <p className="mt-2 text-ink-muted">{t("body")}</p>

          <div className="mt-6 space-y-4">
            <div>
              <label htmlFor={`${id}-plan`} className="text-sm font-medium">{t("plan")}</label>
              <select
                id={`${id}-plan`}
                value={plan.slug}
                onChange={(e) => {
                  const next = plans.find((p) => p.slug === e.target.value);
                  setSlug(e.target.value);
                  if (next) setAmount(String(toNumber(next.min_amount)));
                }}
                className="mt-1.5 h-12 w-full rounded-lg border border-line-strong bg-surface px-3 text-base focus:border-brand-teal focus:outline-none"
              >
                {plans.map((p) => (
                  <option key={p.slug} value={p.slug}>{p.name} · {t("days", { count: p.term_days })}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor={`${id}-amount`} className="text-sm font-medium">{t("amount")}</label>
              <input
                id={`${id}-amount`}
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))}
                aria-describedby={`${id}-range`}
                aria-invalid={!view.inRange}
                className="tabular mt-1.5 h-12 w-full rounded-lg border border-line-strong bg-surface px-3 text-lg font-semibold focus:border-brand-teal focus:outline-none aria-[invalid=true]:border-brand-orange"
              />
              <p id={`${id}-range`} className={view.inRange ? "mt-1.5 text-sm text-ink-subtle" : "mt-1.5 text-sm font-medium text-brand-orange"}>
                {t("range", { min: m(view.min), max: m(view.max) })}
              </p>
            </div>
          </div>
        </div>

        <div className="relative bg-brand-teal p-6 text-white sm:p-8">
          <dl className="space-y-4">
            <div className="flex items-baseline justify-between gap-4 border-b border-white/15 pb-4">
              <dt className="text-sm text-white/70">{t("term")}</dt>
              <dd className="font-semibold">{t("days", { count: plan.term_days })}</dd>
            </div>
            <div className="flex items-baseline justify-between gap-4 border-b border-white/15 pb-4">
              <dt className="text-sm text-white/70">{t("ends")}</dt>
              <dd className="font-semibold">{formatDate(view.end, { locale })}</dd>
            </div>
            <div className="flex items-baseline justify-between gap-4 border-b border-white/15 pb-4">
              <dt className="text-sm text-white/70">{t("principal")}</dt>
              <dd className="tabular text-xl font-semibold">{m(view.inRange ? view.a : 0)}</dd>
            </div>
            <div className="flex items-baseline justify-between gap-4">
              <dt className="text-sm text-white/70">
                {t("target")}
                {view.hasTarget && (
                  <span className="ms-1 text-white/60">
                    ({formatPercent(plan.target_return_min, { locale })}–{formatPercent(plan.target_return_max, { locale })})
                  </span>
                )}
              </dt>
              <dd className="tabular text-end text-xl font-semibold text-brand-mint">
                {view.hasTarget && view.inRange ? `${m(view.lo)} – ${m(view.hi)}` : "—"}
              </dd>
            </div>
          </dl>
          <p className="mt-5 flex items-start gap-2 text-sm text-white/75">
            <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            {view.hasTarget ? t("targetNote") : t("noTarget")}
          </p>
          <Link
            href={{ pathname: "/dashboard/invest", query: { plan: plan.slug } }}
            className={buttonClasses({ variant: "mint", size: "lg", className: "mt-6 w-full" })}
          >
            {t("cta", { plan: plan.name })}
          </Link>
        </div>
      </div>
    </section>
  );
}
