import { getTranslations, setRequestLocale } from "next-intl/server";
import { ArrowDownToLine, ArrowUpFromLine, Layers } from "lucide-react";
import { Link } from "@/lib/i18n/navigation";
import { getViewer } from "@/lib/auth/session";
import { PageHeader } from "@/components/dashboard/page-header";
import { FlowsChart } from "@/components/dashboard/charts";
import { PortfolioHero } from "@/components/dashboard/overview/portfolio-hero";
import { BalanceBreakdown, GettingStarted, NextMaturity, RiskMix } from "@/components/dashboard/overview/widgets";
import { MarketCards } from "@/components/dashboard/overview/market-cards";
import { PositionCard } from "@/components/dashboard/position-card";
import { TransactionList } from "@/components/dashboard/transaction-list";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Alert, EmptyState } from "@/components/ui/feedback";
import { buttonClasses } from "@/components/ui/button";
import { formatMoney, toNumber } from "@/lib/utils/format";

export async function generateMetadata({ params }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "dashboard.overview" });
  return { title: t("title") };
}

export default async function OverviewPage({ params }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("dashboard.overview");
  const tc = await getTranslations("common");
  const fmt = (v) => formatMoney(v, { locale });
  const { supabase, profile, user } = await getViewer();
  const now = new Date().toISOString();

  // Settle any positions whose term ended since the last visit (principal only).
  const { data: maturedCount } = await supabase.rpc("mature_my_investments");

  const since = new Date();
  since.setUTCMonth(since.getUTCMonth() - 11, 1);
  since.setUTCHours(0, 0, 0, 0);

  const [balanceRes, pendingDepRes, positionsRes, recentRes, historyRes, flowRes, anyDepositRes, anyInvestRes] = await Promise.all([
    supabase.from("balances").select("available, held, invested, currency").eq("user_id", user.id).maybeSingle(),
    supabase.from("deposit_requests").select("amount").eq("status", "pending"),
    supabase.from("investments").select("id, reference, plan_name, amount, term_days, started_at, matures_at, status, investment_plans(risk_level)").eq("status", "active").order("matures_at"),
    supabase.from("transactions").select("id, reference, type, amount, delta_available, delta_held, delta_invested, description, created_at").order("created_at", { ascending: false }).limit(6),
    supabase.from("transactions").select("created_at, available_after, held_after, invested_after").order("created_at", { ascending: true }).limit(500),
    supabase.from("transactions").select("type, amount, created_at").in("type", ["deposit", "withdrawal_payout"]).gte("created_at", since.toISOString()),
    supabase.from("deposit_requests").select("id", { count: "exact", head: true }),
    supabase.from("investments").select("id", { count: "exact", head: true }),
  ]);

  const b = balanceRes.data || { available: 0, held: 0, invested: 0 };
  const pendingDeposits = (pendingDepRes.data || []).reduce((s, r) => s + toNumber(r.amount), 0);
  const total = toNumber(b.available) + toNumber(b.held) + toNumber(b.invested);
  const positions = positionsRes.data || [];

  const points = (historyRes.data || []).map((r) => ({
    t: r.created_at,
    total: toNumber(r.available_after) + toNumber(r.held_after) + toNumber(r.invested_after),
  }));

  // Monthly confirmed flows, last 12 months (empty months included).
  const months = [];
  for (let i = 0; i < 12; i++) {
    const d = new Date(since);
    d.setUTCMonth(since.getUTCMonth() + i);
    months.push({ month: d.toISOString().slice(0, 7), deposits: 0, withdrawals: 0 });
  }
  let deposited = 0;
  let withdrawn = 0;
  for (const r of flowRes.data || []) {
    const m = months.find((x) => x.month === r.created_at.slice(0, 7));
    const amt = toNumber(r.amount);
    if (r.type === "deposit") {
      deposited += amt;
      if (m) m.deposits += amt;
    } else {
      withdrawn += amt;
      if (m) m.withdrawals += amt;
    }
  }
  const hasFlows = deposited > 0 || withdrawn > 0;
  const firstName = (profile.full_name || "").split(" ")[0] || profile.username || "";

  const pending = toNumber(b.held) + pendingDeposits;
  const riskPositions = positions.map((p) => ({ amount: p.amount, risk: p.investment_plans?.risk_level }));
  // New accounts get a checklist and live markets up top instead of empty widgets.
  const hasConfirmedDeposit = points.length > 0;
  const hasInvested = (anyInvestRes.count || 0) > 0;
  const isNew = !hasInvested;

  return (
    <>
      <PageHeader title={firstName ? t("greeting", { name: firstName }) : t("title")} description={t("description")} />

      {maturedCount > 0 && <Alert tone="success" className="mb-6">{t("matured", { count: maturedCount })}</Alert>}

      <div className="grid gap-5 xl:grid-cols-[2fr_1fr]">
        <PortfolioHero points={points} total={total} now={now} />
        <BalanceBreakdown available={b.available} invested={b.invested} pending={pending} locale={locale} />
      </div>

      {isNew && (
        <div className="mt-5">
          <GettingStarted requested={(anyDepositRes.count || 0) > 0} confirmed={hasConfirmedDeposit} invested={hasInvested} />
        </div>
      )}
      {isNew && (
        <div className="mt-8">
          <MarketCards locale={locale} />
        </div>
      )}

      {!isNew && (
        <div className="mt-5 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          <NextMaturity position={positions[0]} now={now} locale={locale} />
          <RiskMix positions={riskPositions} locale={locale} />
          <Card className="rounded-2xl md:col-span-2 xl:col-span-1">
            <CardHeader title={t("flowsTitle")} description={t("flowsDescription")} />
            <CardBody>
              <dl className="mb-4 grid grid-cols-2 gap-4">
                <div>
                  <dt className="flex items-center gap-1.5 text-xs text-ink-subtle">
                    <ArrowDownToLine className="h-3.5 w-3.5" aria-hidden="true" />
                    {t("summaryDeposited")}
                  </dt>
                  <dd className="mt-1 font-display text-lg font-semibold">{fmt(deposited)}</dd>
                </div>
                <div>
                  <dt className="flex items-center gap-1.5 text-xs text-ink-subtle">
                    <ArrowUpFromLine className="h-3.5 w-3.5" aria-hidden="true" />
                    {t("summaryWithdrawn")}
                  </dt>
                  <dd className="mt-1 font-display text-lg font-semibold">{fmt(withdrawn)}</dd>
                </div>
              </dl>
              {hasFlows ? <FlowsChart data={months} /> : <p className="py-8 text-center text-sm text-ink-subtle">{t("flowsEmpty")}</p>}
            </CardBody>
          </Card>
        </div>
      )}

      {!isNew && (
        <div className="mt-8">
          <MarketCards locale={locale} />
        </div>
      )}

      <div className="mt-8 grid gap-5 xl:grid-cols-2">
        <Card className="rounded-2xl">
          <CardHeader
            title={t("positionsTitle")}
            action={positions.length ? <Link href="/dashboard/investments" className="text-sm font-medium text-brass hover:underline">{tc("viewAll")}</Link> : null}
          />
          {positions.length ? (
            <ul className="divide-y divide-line">
              {positions.slice(0, 4).map((p) => (
                <li key={p.id}><PositionCard position={p} compact now={now} /></li>
              ))}
            </ul>
          ) : (
            <EmptyState
              icon={Layers}
              title={t("positionsEmpty")}
              action={<Link href="/dashboard/invest" className={buttonClasses({ size: "sm" })}>{t("quick.invest")}</Link>}
            />
          )}
        </Card>
        <Card className="rounded-2xl">
          <CardHeader
            title={t("recentTitle")}
            action={recentRes.data?.length ? <Link href="/dashboard/transactions" className="text-sm font-medium text-brass hover:underline">{tc("viewAll")}</Link> : null}
          />
          <TransactionList rows={recentRes.data || []} empty={t("recentEmpty")} />
        </Card>
      </div>
    </>
  );
}
