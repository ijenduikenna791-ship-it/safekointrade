import { getLocale, getTranslations } from "next-intl/server";
import { Info } from "lucide-react";
import { Link } from "@/lib/i18n/navigation";
import { buttonClasses } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SectionHeading } from "./section-heading";
import { RevealGroup, RevealItem } from "@/components/animations/reveal";
import { formatMoney, formatPercent } from "@/lib/utils/format";

const riskTone = { low: "gain", moderate: "warn", high: "loss" };

export async function PlansComparison({ plans, isDefault }) {
  const t = await getTranslations("home.plans");
  const tc = await getTranslations("common");
  const locale = await getLocale();

  return (
    <section id="plans" aria-labelledby="plans-title" className="border-t border-line bg-surface-2/60 py-16 sm:py-24">
      <div className="container-page">
        <SectionHeading id="plans-title" title={t("title")} body={t("body")} />

        <RevealGroup className="mt-12 grid gap-5 lg:grid-cols-3">
          {plans.map((plan) => {
            const hasTarget = plan.target_return_min != null && plan.target_return_max != null;
            const rows = [
              {
                label: t("range"),
                value: `${formatMoney(plan.min_amount, { locale })} – ${formatMoney(plan.max_amount, { locale })}`,
              },
              { label: t("term"), value: t("days", { count: plan.term_days }) },
              { label: t("asset"), value: plan.currency },
              {
                label: t("target"),
                value: hasTarget
                  ? `${formatPercent(plan.target_return_min, { locale })} – ${formatPercent(plan.target_return_max, { locale })}`
                  : t("noTarget"),
                muted: !hasTarget,
              },
            ];
            return (
              <RevealItem key={plan.id} as="article" className="flex flex-col rounded-lg border border-line bg-surface p-6 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="text-2xl font-semibold">{plan.name}</h3>
                  <Badge tone={riskTone[plan.risk_level] || "neutral"}>{tc(`risk.${plan.risk_level}`)}</Badge>
                </div>
                <p className="mt-3 min-h-[3lh] text-ink-muted">{plan.description}</p>
                <dl className="mt-6 divide-y divide-line border-y border-line">
                  {rows.map((r) => (
                    <div key={r.label} className="flex items-baseline justify-between gap-4 py-3">
                      <dt className="text-sm text-ink-subtle">{r.label}</dt>
                      <dd className={"tabular text-end text-sm " + (r.muted ? "text-ink-subtle" : "font-medium text-ink")}>{r.value}</dd>
                    </div>
                  ))}
                </dl>
                <p className="mt-4 text-sm text-ink-muted">{plan.risk_description}</p>
                <Link
                  href={{ pathname: "/dashboard/invest", query: { plan: plan.slug } }}
                  className={buttonClasses({ variant: "secondary", className: "mt-6 w-full" })}
                >
                  {t("cta")}
                </Link>
              </RevealItem>
            );
          })}
        </RevealGroup>

        <div className="mt-8 space-y-2 text-sm text-ink-subtle">
          <p className="flex items-start gap-2">
            <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            {t("riskNote")}
          </p>
          {isDefault && (
            <p className="flex items-start gap-2">
              <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              {t("sampleNote")}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
