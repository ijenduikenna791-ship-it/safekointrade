import { getTranslations, setRequestLocale } from "next-intl/server";
import { getViewer } from "@/lib/auth/session";
import { PortfolioHero } from "@/components/dashboard/overview/portfolio-hero";
import { PlanCards, QuickOps, StatCards, VerificationBanner, WelcomeCard } from "@/components/dashboard/overview/command";
import { RequestHistory } from "@/components/dashboard/overview/request-history";
import { Alert } from "@/components/ui/feedback";
import { toNumber } from "@/lib/utils/format";

export async function generateMetadata({ params }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "dashboard.overview" });
  return { title: t("title") };
}

export default async function OverviewPage({ params }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("dashboard.overview");
  const { supabase, profile, user } = await getViewer();
  const now = new Date().toISOString();

  // Settle any positions whose term ended since the last visit (principal only).
  const { data: maturedCount } = await supabase.rpc("mature_my_investments");

  const [balanceRes, positionsRes, historyRes, depositTxRes, plansRes, assetsRes, depReqRes, wdrReqRes] = await Promise.all([
    supabase.from("balances").select("available, held, invested").eq("user_id", user.id).maybeSingle(),
    supabase.from("investments").select("id, plan_name, amount, term_days, started_at").eq("status", "active").order("started_at", { ascending: false }),
    supabase.from("transactions").select("created_at, available_after, held_after, invested_after").order("created_at", { ascending: true }).limit(500),
    supabase.from("transactions").select("amount").eq("type", "deposit").limit(5000),
    supabase
      .from("investment_plans")
      .select("id, slug, name, min_amount, max_amount, currency, term_days, risk_level, target_return_min, target_return_max")
      .eq("is_active", true)
      .order("sort_order")
      .limit(8),
    supabase.from("supported_assets").select("symbol, network").eq("is_active", true).eq("accepts_deposits", true).order("sort_order"),
    supabase.from("deposit_requests").select("id, reference, amount, asset_symbol, method, status, created_at").order("created_at", { ascending: false }).limit(50),
    supabase.from("withdrawal_requests").select("id, reference, amount, asset_symbol, network, status, created_at").order("created_at", { ascending: false }).limit(50),
  ]);

  const b = balanceRes.data || { available: 0, held: 0, invested: 0 };
  const total = toNumber(b.available) + toNumber(b.held) + toNumber(b.invested);
  const deposited = (depositTxRes.data || []).reduce((s, r) => s + toNumber(r.amount), 0);
  const points = (historyRes.data || []).map((r) => ({
    t: r.created_at,
    total: toNumber(r.available_after) + toNumber(r.held_after) + toNumber(r.invested_after),
  }));

  const requests = [
    ...(depReqRes.data || []).map((r) => ({ id: r.id, kind: "deposit", reference: r.reference, amount: r.amount, asset: r.asset_symbol, method: r.method, status: r.status, created_at: r.created_at })),
    ...(wdrReqRes.data || []).map((r) => ({ id: r.id, kind: "withdrawal", reference: r.reference, amount: r.amount, asset: r.asset_symbol, method: r.network, status: r.status, created_at: r.created_at })),
  ].sort((a, b) => (a.created_at < b.created_at ? 1 : -1));

  return (
    <div className="space-y-5 pb-16">
      {maturedCount > 0 && <Alert tone="success">{t("matured", { count: maturedCount })}</Alert>}
      <WelcomeCard profile={profile} locale={locale} />
      <VerificationBanner status={profile.kyc_status} />
      <StatCards available={b.available} invested={b.invested} deposited={deposited} positions={positionsRes.data || []} locale={locale} />
      <QuickOps assets={assetsRes.data || []} />
      <PortfolioHero points={points} total={total} now={now} />
      <div className="pt-3">
        <PlanCards plans={plansRes.data || []} locale={locale} />
      </div>
      <RequestHistory rows={requests} />
    </div>
  );
}
