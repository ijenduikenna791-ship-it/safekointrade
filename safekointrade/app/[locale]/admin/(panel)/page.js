import { getTranslations, setRequestLocale } from "next-intl/server";
import { ArrowDownToLine, ArrowUpFromLine, CalendarClock, CheckCircle2, KeyRound, Layers, LifeBuoy, UserCheck, Users } from "lucide-react";
import { Link } from "@/lib/i18n/navigation";
import { requireStaff } from "@/lib/authorization/guards";
import { StatTile } from "@/components/dashboard/page-header";
import { ProcessMaturitiesButton } from "@/components/admin/admin-controls";
import { DailyFlowsChart } from "@/components/admin/flows-chart";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Alert } from "@/components/ui/feedback";
import { formatDate, formatMoney, toNumber } from "@/lib/utils/format";
import { errorCode } from "@/lib/database/errors";

const OPEN_WITHDRAWAL = ["pending", "processing", "approved"];
const OVERDUE_HOURS = 24;

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
  const ts = await getTranslations("admin.overview.summary");
  const te = await getTranslations("errors");
  const tc = await getTranslations("common");
  const staff = await requireStaff("admin.view");
  const { supabase } = staff;
  const m = (v) => formatMoney(v, { locale });
  const finance = staff.can("finance.view");

  const todayStart = new Date();
  todayStart.setUTCHours(0, 0, 0, 0);
  const since = todayStart.toISOString();
  const overdueBefore = new Date(Date.now() - OVERDUE_HOURS * 3600 * 1000).toISOString();
  const none = Promise.resolve({ data: null, count: 0 });

  const [
    { data: o, error },
    flows,
    activity,
    oldestDeposit,
    oldestWithdrawal,
    depositsToday,
    withdrawalsToday,
    overdueDeposits,
    overdueWithdrawals,
    depositAssets,
    activeWallets,
  ] = await Promise.all([
    supabase.rpc("admin_overview"),
    finance ? supabase.rpc("admin_daily_flows", { p_days: 30 }) : Promise.resolve({ data: null }),
    staff.can("audit.view")
      ? supabase.from("audit_logs").select("id, action, entity_type, entity_id, created_at").order("created_at", { ascending: false }).limit(8)
      : Promise.resolve({ data: null }),
    supabase.from("deposit_requests").select("id, reference, amount, created_at").eq("status", "pending").order("created_at").limit(1).maybeSingle(),
    supabase.from("withdrawal_requests").select("id, reference, amount, created_at").in("status", OPEN_WITHDRAWAL).order("created_at").limit(1).maybeSingle(),
    finance ? supabase.from("deposit_requests").select("amount").gte("created_at", since).limit(1000) : none,
    finance ? supabase.from("withdrawal_requests").select("amount").gte("created_at", since).limit(1000) : none,
    finance
      ? supabase.from("deposit_requests").select("id", { count: "exact", head: true }).eq("status", "pending").lt("created_at", overdueBefore)
      : none,
    finance
      ? supabase.from("withdrawal_requests").select("id", { count: "exact", head: true }).in("status", OPEN_WITHDRAWAL).lt("created_at", overdueBefore)
      : none,
    finance ? supabase.from("supported_assets").select("symbol, name").eq("is_active", true).eq("accepts_deposits", true) : none,
    finance ? supabase.from("deposit_wallets").select("asset_symbol").eq("is_active", true) : none,
  ]);

  const tu = await getTranslations("admin.users.roleNames");
  const { data: factors } = await supabase.auth.mfa.listFactors();
  const hasMfa = Boolean(factors?.totp?.some((f) => f.status === "verified"));
  const staffName = (staff.profile?.full_name || "").trim().split(/\s+/)[0] || "";
  if (error) return <Alert tone="error">{te(errorCode(error) === "mfa_required" ? "mfa_required" : "forbidden")}</Alert>;
  const flowRows = (flows.data || []).map((r) => ({ day: r.day, deposits: toNumber(r.deposits), withdrawals: toNumber(r.withdrawals) }));

  const sum = (rows) => (rows || []).reduce((s, r) => s + toNumber(r.amount), 0);
  const depToday = depositsToday.data || [];
  const wdToday = withdrawalsToday.data || [];
  const overdueDep = overdueDeposits.count || 0;
  const overdueWd = overdueWithdrawals.count || 0;
  const walletSymbols = new Set((activeWallets.data || []).map((w) => w.asset_symbol));
  const missingAddress = (depositAssets.data || []).filter((a) => !walletSymbols.has(a.symbol));

  const waited = (createdAt) => {
    const hours = Math.floor((Date.now() - new Date(createdAt).getTime()) / 3600000);
    const label = hours < 1 ? ts("waitingNow") : hours < 48 ? ts("waitingHours", { n: hours }) : ts("waitingDays", { n: Math.floor(hours / 24) });
    return { label, late: hours >= OVERDUE_HOURS };
  };

  return (
    <>
      <section aria-labelledby="console-title" className="ui-card relative mb-5 overflow-hidden rounded-lg border border-line bg-surface p-5 sm:p-7">
        <div aria-hidden="true" className="pointer-events-none absolute -end-16 -top-24 h-64 w-64 rounded-full bg-[radial-gradient(closest-side,rgb(255_157_92/0.22),transparent)]" />
        <div className="relative flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-3">
              <p className="mono-label">{t("console.label")}</p>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[rgb(52_211_153/0.35)] bg-[rgb(52_211_153/0.1)] px-2.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--cmd-green)]">
                <span className="pulse-dot h-1.5 w-1.5 rounded-full bg-[var(--cmd-green)]" aria-hidden="true" />
                {t("console.live")}
              </span>
            </div>
            <h1 id="console-title" className="mt-3 font-display text-2xl font-semibold tracking-tight sm:text-4xl">
              {staffName ? t.rich("console.greeting", { name: staffName, n: (c) => <span className="text-gradient">{c}</span> }) : t("title")}
            </h1>
            <p className="mt-1.5 max-w-[65ch] text-sm text-ink-muted">{t("description")}</p>
            <dl className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-sm">
              <div className="flex flex-wrap items-center gap-2">
                <dt className="mono-label">{t("console.roles")}</dt>
                <dd className="flex flex-wrap gap-1.5">
                  {staff.roles.map((r) => (
                    <span key={r} className="rounded-full border border-brass-line bg-brass-soft px-2 py-0.5 text-xs font-medium text-brass">{tu(r)}</span>
                  ))}
                </dd>
              </div>
              <div className="flex items-center gap-2">
                <dt className="mono-label">{t("console.mfa")}</dt>
                <dd className={hasMfa ? "inline-flex items-center gap-1 text-[var(--cmd-green)]" : "inline-flex items-center gap-1 text-[var(--cmd-orange)]"}>
                  <KeyRound className="h-3.5 w-3.5" aria-hidden="true" />
                  {hasMfa ? t("console.mfaOn") : t("console.mfaOff")}
                </dd>
              </div>
            </dl>
          </div>
          {staff.can("finance.review") && <div className="relative shrink-0"><ProcessMaturitiesButton /></div>}
        </div>
      </section>
      {sp.denied === "1" && <Alert tone="warn" className="mb-6">{te("forbidden")}</Alert>}

      {finance && overdueDep + overdueWd > 0 && (
        <Alert tone="warn" className="mb-5">
          <span className="font-semibold">{ts("overdueTitle", { hours: OVERDUE_HOURS })}</span>{" "}
          {overdueDep > 0 && (
            <Link href="/admin/deposits?status=pending&sort=oldest" className="underline">{ts("overdueDeposits", { count: overdueDep })}</Link>
          )}
          {overdueDep > 0 && overdueWd > 0 && " · "}
          {overdueWd > 0 && (
            <Link href="/admin/withdrawals" className="underline">{ts("overdueWithdrawals", { count: overdueWd })}</Link>
          )}
        </Alert>
      )}

      {finance && missingAddress.length > 0 && (
        <Alert tone="warn" className="mb-5">
          {ts("missingAddress", { coins: missingAddress.map((a) => `${a.name} (${a.symbol})`).join(", ") })}{" "}
          <Link href="/admin/deposit-addresses" className="font-semibold underline">{ts("fixAddresses")}</Link>
        </Alert>
      )}

      {finance && (
        <section
          aria-label={t("queueTitle")}
          className="ui-card ui-card-tint mb-5 flex flex-wrap items-center gap-3 rounded-lg border p-4 sm:p-5"
          style={{ "--tint": o.deposits_pending + o.withdrawals_open > 0 ? "#fb923c" : "#34d399" }}
        >
          {o.deposits_pending + o.withdrawals_open > 0 ? (
            <>
              <p className="me-auto text-sm font-semibold">{t("console.waiting", { count: o.deposits_pending + o.withdrawals_open })}</p>
              {o.deposits_pending > 0 && (
                <Link href="/admin/deposits?status=pending" className="inline-flex h-10 items-center gap-2 rounded-lg bg-[linear-gradient(90deg,#3b7bff,#22d3ee)] px-4 font-mono text-xs font-semibold uppercase tracking-[0.12em] text-[#03101f] hover:brightness-110">
                  <ArrowDownToLine className="h-4 w-4" aria-hidden="true" />
                  {t("console.reviewDeposits", { count: o.deposits_pending })}
                </Link>
              )}
              {o.withdrawals_open > 0 && (
                <Link href="/admin/withdrawals" className="inline-flex h-10 items-center gap-2 rounded-lg bg-[var(--cmd-orange)] px-4 font-mono text-xs font-semibold uppercase tracking-[0.12em] text-[#1d0e04] hover:brightness-110">
                  <ArrowUpFromLine className="h-4 w-4" aria-hidden="true" />
                  {t("console.reviewWithdrawals", { count: o.withdrawals_open })}
                </Link>
              )}
            </>
          ) : (
            <p className="inline-flex items-center gap-2 text-sm font-medium text-[var(--cmd-green)]">
              <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
              {t("console.allClear")}
            </p>
          )}
        </section>
      )}

      {finance && (
        <section className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
          <StatTile tint="cyan" label={ts("depositsToday")} value={depToday.length} hint={m(sum(depToday))} icon={CalendarClock} />
          <StatTile tint="orange" label={ts("withdrawalsToday")} value={wdToday.length} hint={m(sum(wdToday))} icon={CalendarClock} />
        </section>
      )}

      <section className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-5">
        <StatTile tint="blue" label={t("usersTotal")} value={o.users_total} hint={t("usersNew", { count: o.users_new_7d })} icon={Users} />
        <StatTile tint="purple" label={t("usersActive")} value={o.users_active_30d} hint={t("usersSuspended", { count: o.users_suspended })} icon={UserCheck} />
        <StatTile tint="cyan" label={t("depositsPending")} value={o.deposits_pending} hint={m(o.deposits_pending_amount)} icon={ArrowDownToLine} />
        <StatTile tint="orange" label={t("withdrawalsOpen")} value={o.withdrawals_open} hint={m(o.withdrawals_open_amount)} icon={ArrowUpFromLine} />
        <StatTile tint="green" label={t("investmentsActive")} value={o.investments_active} hint={`${m(o.investments_active_amount)} · ${t("investmentsDue", { count: o.investments_due })}`} icon={Layers} />
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
                [t("available"), o.balances_available, "#4f8cff"],
                [t("held"), o.balances_held, "#fb923c"],
                [t("invested"), o.balances_invested, "#34d399"],
              ].map(([k, v, c]) => (
                <div key={k} className="flex items-center justify-between px-5 py-3 text-sm">
                  <dt className="flex items-center gap-2 text-ink-muted"><span className="h-2 w-2 rounded-full" style={{ background: c }} aria-hidden="true" />{k}</dt>
                  <dd className="tabular font-semibold" style={{ color: c }}>{m(v)}</dd>
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
              ].map(([label, row, href]) => {
                const w = row ? waited(row.created_at) : null;
                return (
                  <li key={label} className="px-5 py-3">
                    <p className="text-ink-subtle">{label}</p>
                    {row ? (
                      <Link href={href} className="mt-0.5 block font-medium hover:text-brass">
                        <span className="flex justify-between gap-3">
                          <span className="tabular">{row.reference}</span>
                          <span className="tabular">{m(row.amount)} · {formatDate(row.created_at, { locale })}</span>
                        </span>
                        <span className={`mt-0.5 block text-xs ${w.late ? "text-amber-400" : "text-ink-subtle"}`}>{w.label}</span>
                      </Link>
                    ) : (
                      <p className="mt-0.5 text-ink-muted">{t("queueEmpty")}</p>
                    )}
                  </li>
                );
              })}
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