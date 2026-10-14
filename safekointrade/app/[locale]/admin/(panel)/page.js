import { getTranslations, setRequestLocale } from "next-intl/server";
import { ArrowDownToLine, ArrowUpFromLine, Layers, LifeBuoy, Users } from "lucide-react";
import { Link } from "@/lib/i18n/navigation";
import { requireStaff } from "@/lib/authorization/guards";
import { PageHeader, StatTile } from "@/components/dashboard/page-header";
import { ProcessMaturitiesButton } from "@/components/admin/admin-controls";
import { DailyFlowsChart } from "@/components/admin/flows-chart";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Alert } from "@/components/ui/feedback";
import { formatDate, formatMoney, toNumber } from "@/lib/utils/format";
import { errorCode } from "@/lib/database/errors";

export async function generateMetadata({ params }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "admin.overview" });
  return { title: t("title") };
}

export default async function AdminOverview({ params, searchParams }) {
  const { locale } = await params;
  const sp = await searchParams;
  setRequestLocale(locale);
  const t = await getTranslations("admin.overview");
  const te = await getTranslations("errors");
  const tc = await getTranslations("common");
  const staff = await requireStaff("admin.view");
  const { supabase } = staff;
  const m = (v) => formatMoney(v, { locale });

  const [{ data: o, error }, flows, activity, oldestDeposit, oldestWithdrawal] = await Promise.all([
    supabase.rpc("admin_overview"),
    staff.can("finance.view") ? supabase.rpc("admin_daily_flows", { p_days: 30 }) : Promise.resolve({ data: null }),
    staff.can("audit.view")
      ? supabase.from("audit_logs").select("id, action, entity_type, entity_id, created_at").order("created_at", { ascending: false }).limit(8)
      : Promise.resolve({ data: null }),
    supabase.from("deposit_requests").select("id, reference, amount, created_at").eq("status", "pending").order("created_at").limit(1).maybeSingle(),
    supabase.from("withdrawal_requests").select("id, reference, amount, created_at").in("status", ["pending", "processing", "approved"]).order("created_at").limit(1).maybeSingle(),
  ]);

  if (error) return <Alert tone="error">{te(errorCode(error) === "mfa_required" ? "mfa_required" : "forbidden")}</Alert>;
  const flowRows = (flows.data || []).map((r) => ({ day: r.day, deposits: toNumber(r.deposits), withdrawals: toNumber(r.withdrawals) }));

  return (
    <>
      <PageHeader title={t("title")} description={t("description")} actions={staff.can("finance.review") ? <ProcessMaturitiesButton /> : null} />
      {sp.denied === "1" && <Alert tone="warn" className="mb-6">{te("forbidden")}</Alert>}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatTile label={t("usersTotal")} value={o.users_total} hint={t("usersNew", { count: o.users_new_7d })} icon={Users} />
        <StatTile label={t("usersActive")} value={o.users_active_30d} hint={t("usersSuspended", { count: o.users_suspended })} icon={Users} />
        <StatTile emphasis={o.deposits_pending > 0} label={t("depositsPending")} value={o.deposits_pending} hint={m(o.deposits_pending_amount)} icon={ArrowDownToLine} />
        <StatTile emphasis={o.withdrawals_open > 0} label={t("withdrawalsOpen")} value={o.withdrawals_open} hint={m(o.withdrawals_open_amount)} icon={ArrowUpFromLine} />
        <StatTile label={t("investmentsActive")} value={o.investments_active} hint={`${m(o.investments_active_amount)} · ${t("investmentsDue", { count: o.investments_due })}`} icon={Layers} />
      </section>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        {flows.data && (
          <Card>
            <CardHeader title={t("flowsTitle")} description={t("flowsDescription")} />
            <CardBody><DailyFlowsChart data={flowRows} /></CardBody>
          </Card>
        )}
        <div className="space-y-6">
          <Card>
            <CardHeader title={t("balancesTitle")} />
            <dl className="divide-y divide-line">
              {[
                [t("available"), o.balances_available],
                [t("held"), o.balances_held],
                [t("invested"), o.balances_invested],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between px-5 py-3 text-sm">
                  <dt className="text-ink-muted">{k}</dt>
                  <dd className="tabular font-medium">{m(v)}</dd>
                </div>
              ))}
            </dl>
          </Card>
          <Card>
            <CardHeader title={t("queueTitle")} action={<span className="inline-flex items-center gap-1.5 text-sm text-ink-muted"><LifeBuoy className="h-4 w-4" aria-hidden="true" />{o.tickets_open} {t("ticketsOpen").toLowerCase()}</span>} />
            <ul className="divide-y divide-line text-sm">
              {[
                [t("queueDeposits"), oldestDeposit.data, "/admin/deposits"],
                [t("queueWithdrawals"), oldestWithdrawal.data, "/admin/withdrawals"],
              ].map(([label, row, href]) => (
                <li key={label} className="px-5 py-3">
                  <p className="text-ink-subtle">{label}</p>
                  {row ? (
                    <Link href={href} className="mt-0.5 flex justify-between gap-3 font-medium hover:text-brass">
                      <span className="tabular">{row.reference}</span>
                      <span className="tabular">{m(row.amount)} · {formatDate(row.created_at, { locale })}</span>
                    </Link>
                  ) : (
                    <p className="mt-0.5 text-ink-muted">{t("queueEmpty")}</p>
                  )}
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>

      {activity.data && (
        <Card className="mt-6">
          <CardHeader title={t("activityTitle")} action={<Link href="/admin/audit-logs" className="text-sm font-medium text-brass hover:underline">{tc("viewAll")}</Link>} />
          {activity.data.length ? (
            <ul className="divide-y divide-line text-sm">
              {activity.data.map((a) => (
                <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 px-5 py-3">
                  <span className="font-mono text-xs">{a.action}</span>
                  <span className="text-ink-subtle">{formatDate(a.created_at, { locale, withTime: true })}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-5 py-8 text-center text-sm text-ink-subtle">{t("activityEmpty")}</p>
          )}
        </Card>
      )}
    </>
  );
}
