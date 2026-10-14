import { getTranslations, setRequestLocale } from "next-intl/server";
import { requireStaff } from "@/lib/authorization/guards";
import { PageHeader } from "@/components/dashboard/page-header";
import { PlanEditor } from "@/components/admin/plan-editor";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/feedback";
import { formatMoney, formatPercent } from "@/lib/utils/format";

const riskTone = { low: "gain", moderate: "warn", high: "loss" };

export async function generateMetadata({ params }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "admin.plans" });
  return { title: t("title") };
}

export default async function AdminPlansPage({ params }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const staff = await requireStaff("finance.view", "/admin/plans");
  const t = await getTranslations("admin.plans");
  const ta = await getTranslations("admin.common");
  const tc = await getTranslations("common");
  const tp = await getTranslations("home.plans");
  const canEdit = staff.can("plans.manage");

  const [{ data: plans }, { data: open }] = await Promise.all([
    staff.supabase.from("investment_plans").select("*").order("sort_order"),
    staff.supabase.from("investments").select("plan_id").eq("status", "active"),
  ]);
  const openCount = (id) => (open || []).filter((o) => o.plan_id === id).length;

  return (
    <>
      <PageHeader title={t("title")} description={t("description")} actions={canEdit ? <PlanEditor /> : null} />
      {!canEdit && <Alert tone="info" className="mb-6">{ta("noPermission")}</Alert>}
      <div className="grid gap-4 lg:grid-cols-2">
        {(plans || []).map((p) => (
          <Card key={p.id} className="p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold">{p.name}</h2>
                <p className="font-mono text-xs text-ink-subtle">{p.slug}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {!p.is_active && <Badge>{t("inactive")}</Badge>}
                <Badge tone={riskTone[p.risk_level]}>{tc(`risk.${p.risk_level}`)}</Badge>
                {canEdit && <PlanEditor plan={p} />}
              </div>
            </div>
            <p className="mt-3 text-sm text-ink-muted">{p.description}</p>
            <dl className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
              <div><dt className="text-xs text-ink-subtle">{t("min")}</dt><dd className="tabular font-medium">{formatMoney(p.min_amount, { locale })}</dd></div>
              <div><dt className="text-xs text-ink-subtle">{t("max")}</dt><dd className="tabular font-medium">{formatMoney(p.max_amount, { locale })}</dd></div>
              <div><dt className="text-xs text-ink-subtle">{t("term")}</dt><dd className="tabular font-medium">{tp("days", { count: p.term_days })}</dd></div>
              <div><dt className="text-xs text-ink-subtle">{tp("target")}</dt><dd className="tabular font-medium">{p.target_return_min != null ? `${formatPercent(p.target_return_min, { locale })}–${formatPercent(p.target_return_max, { locale })}` : "—"}</dd></div>
            </dl>
            <p className="mt-4 text-xs text-ink-subtle">{t("openPositions", { count: openCount(p.id) })}</p>
          </Card>
        ))}
      </div>
    </>
  );
}
