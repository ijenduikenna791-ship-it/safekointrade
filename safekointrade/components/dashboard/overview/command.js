import { getTranslations } from "next-intl/server";
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  CalendarClock,
  Layers,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { Link } from "@/lib/i18n/navigation";
import { CryptoCoin } from "@/components/ui/crypto-coin";
import { localeMeta } from "@/lib/i18n/routing";
import { formatMoney, formatPercent } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";

const TINT = {
  blue: "var(--cmd-blue)",
  green: "var(--cmd-green)",
  cyan: "var(--cmd-cyan)",
  purple: "var(--cmd-purple)",
  orange: "var(--cmd-orange)",
};

/** "Portfolio command center": status pill, greeting, account ID and country. */
export async function WelcomeCard({ profile, locale }) {
  const t = await getTranslations("dashboard.cmd");
  const name = (profile.full_name || "").trim().split(/\s+/)[0] || profile.username || "";
  const accountId = `SKT-${profile.id.replace(/-/g, "").slice(0, 8).toUpperCase()}`;
  let country = null;
  if (profile.country) {
    try {
      country = new Intl.DisplayNames([localeMeta[locale]?.intl || "en"], { type: "region" }).of(profile.country);
    } catch {
      country = profile.country;
    }
  }
  return (
    <section aria-labelledby="welcome-title" className="glass relative overflow-hidden p-5 sm:p-7">
      <div aria-hidden="true" className="pointer-events-none absolute -end-16 -top-24 h-64 w-64 rounded-full bg-[radial-gradient(closest-side,rgb(79_140_255/0.28),transparent)]" />
      <div className="relative flex flex-wrap items-center gap-3">
        <p className="mono-label">{t("commandCenter")}</p>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-[rgb(52_211_153/0.35)] bg-[rgb(52_211_153/0.1)] px-2.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--cmd-green)]">
          <span className="pulse-dot h-1.5 w-1.5 rounded-full bg-[var(--cmd-green)]" aria-hidden="true" />
          {t("online")}
        </span>
      </div>
      <h1 id="welcome-title" className="relative mt-3 font-display text-2xl font-semibold tracking-tight sm:text-4xl">
        {name ? t.rich("welcome", { name, n: (c) => <span className="text-gradient">{c}</span> }) : t("welcomeNoName")}
      </h1>
      <dl className="relative mt-3 flex flex-wrap gap-x-6 gap-y-1 text-sm">
        <div className="flex items-center gap-2">
          <dt className="mono-label">{t("accountId")}</dt>
          <dd className="font-mono text-ink">{accountId}</dd>
        </div>
        <div className="flex items-center gap-2">
          <dt className="mono-label">{t("country")}</dt>
          <dd className="flex items-center gap-1.5 text-ink">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {profile.country && <img src={`/flags/${profile.country}.svg`} alt="" width={18} height={13} className="h-[13px] w-[18px] rounded-[2px] object-cover" />}
            {country || <span className="text-ink-subtle">{t("noCountry")}</span>}
          </dd>
        </div>
      </dl>
    </section>
  );
}

/** Real verification status from the profile. Nothing is gated on it here. */
export async function VerificationBanner({ status }) {
  if (status === "verified") return null;
  const t = await getTranslations("dashboard.cmd.kyc");
  const key = status === "pending" || status === "rejected" ? status : "unverified";
  const Icon = key === "pending" ? ShieldCheck : ShieldAlert;
  return (
    <section
      aria-labelledby="kyc-title"
      className="glass glass-tint flex flex-wrap items-center gap-4 p-4 sm:p-5"
      style={{ "--tint": TINT.orange }}
    >
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[rgb(251_146_60/0.14)] text-[var(--cmd-orange)]" aria-hidden="true">
        <Icon className="h-5 w-5" />
      </span>
      <div className="min-w-0 flex-1">
        <h2 id="kyc-title" className="text-sm font-semibold">
          {t("label")}: <span className="font-mono uppercase tracking-wider text-[var(--cmd-orange)]">{t(`status.${key}`)}</span>
        </h2>
        <p className="mt-0.5 text-sm text-ink-muted">{t(`body.${key}`)}</p>
      </div>
      {key === "rejected" ? (
        <Link href="/dashboard/support" className="inline-flex h-10 items-center rounded-lg bg-[var(--cmd-orange)] px-4 font-mono text-xs font-semibold uppercase tracking-wider text-[#1d0e04] hover:brightness-110">
          {t("contact")}
        </Link>
      ) : key === "unverified" ? (
        <span className="rounded-lg border border-[rgb(251_146_60/0.35)] px-3 py-2 font-mono text-[11px] uppercase tracking-wider text-[var(--cmd-orange)]">{t("soon")}</span>
      ) : null}
    </section>
  );
}

function StatCard({ label, value, hint, icon: Icon, tint, valueClass, children }) {
  return (
    <div className="glass glass-tint flex min-w-0 flex-col p-4 sm:p-5" style={{ "--tint": TINT[tint] }}>
      <div className="flex items-start justify-between gap-3">
        <p className="mono-label min-w-0">{label}</p>
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg" style={{ background: `color-mix(in oklab, ${TINT[tint]} 15%, transparent)`, color: TINT[tint] }} aria-hidden="true">
          <Icon className="h-[18px] w-[18px]" />
        </span>
      </div>
      <p className={cn("mt-3 min-w-0 break-words font-display text-[clamp(1rem,5vw,1.5rem)] font-semibold tracking-tight sm:text-[1.7rem]", valueClass)}>{value}</p>
      {children}
      <p className="mt-1.5 text-xs text-ink-subtle">{hint}</p>
    </div>
  );
}

export async function StatCards({ available, invested, deposited, positions, locale }) {
  const t = await getTranslations("dashboard.cmd.stats");
  const fmt = (v) => formatMoney(v, { locale });
  const lead = positions[0];
  return (
    <section aria-label={t("label")} className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
      <StatCard label={t("available")} value={fmt(available)} hint={t("availableHint")} icon={Wallet} tint="blue" />
      <StatCard label={t("invested")} value={fmt(invested)} hint={t("investedHint")} icon={TrendingUp} tint="green" valueClass="text-[var(--cmd-green)]" />
      <StatCard label={t("deposits")} value={fmt(deposited)} hint={t("depositsHint")} icon={ArrowDownToLine} tint="cyan" valueClass="text-[var(--cmd-cyan)]" />
      <StatCard
        label={t("plan")}
        value={lead ? lead.plan_name : t("noPlan")}
        hint={lead ? t("planHint", { count: positions.length, days: lead.term_days }) : t("noPlanHint")}
        icon={Sparkles}
        tint="purple"
        valueClass={cn("text-[var(--cmd-purple)]", !lead && "text-lg sm:text-xl")}
      />
    </section>
  );
}

export async function QuickOps({ assets }) {
  const t = await getTranslations("dashboard.cmd.quick");
  const btn = "inline-flex h-12 items-center justify-center gap-2 rounded-xl px-5 font-mono text-xs font-semibold uppercase tracking-[0.12em] transition";
  return (
    <section aria-labelledby="quick-title" className="glass p-5 sm:p-6">
      <h2 id="quick-title" className="mono-label !text-ink-muted">{t("title")}</h2>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <Link href="/dashboard/deposits" className={cn(btn, "bg-[linear-gradient(90deg,#3b7bff,#22d3ee)] text-[#03101f] shadow-[0_10px_30px_-10px_rgb(34_211_238/0.6)] hover:brightness-110")}>
          <ArrowDownToLine className="h-4 w-4" aria-hidden="true" />
          {t("deposit")}
        </Link>
        <Link href="/dashboard/withdrawals" className={cn(btn, "border border-line-strong bg-[rgb(5_9_20/0.6)] text-ink hover:border-[var(--cmd-blue)]")}>
          <ArrowUpFromLine className="h-4 w-4" aria-hidden="true" />
          {t("withdraw")}
        </Link>
        <Link href="/dashboard/invest" className={cn(btn, "border border-[rgb(167_139_250/0.4)] bg-[rgb(167_139_250/0.1)] text-[var(--cmd-purple)] hover:bg-[rgb(167_139_250/0.18)]")}>
          <Layers className="h-4 w-4" aria-hidden="true" />
          {t("invest")}
        </Link>
      </div>
      {assets.length > 0 && (
        <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-line pt-4">
          <span className="mono-label me-1">{t("currencies")}</span>
          {assets.map((a) => (
            <span key={a.symbol} className="inline-flex items-center gap-1.5 rounded-full border border-line bg-[rgb(5_9_20/0.5)] py-1 pe-3 ps-1 text-xs">
              <CryptoCoin symbol={a.symbol} className="h-5 w-5" />
              <span className="font-mono font-semibold">{a.symbol}</span>
              <span className="text-ink-subtle">{a.network}</span>
            </span>
          ))}
        </div>
      )}
    </section>
  );
}

const PLAN_TINTS = ["cyan", "blue", "purple", "orange"];

export async function PlanCards({ plans, locale }) {
  const t = await getTranslations("dashboard.cmd.plans");
  const tr = await getTranslations("common.risk");
  return (
    <section aria-labelledby="plans-title">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="mono-label">{t("label")}</p>
          <h2 id="plans-title" className="mt-1 font-display text-xl font-semibold">{t("title")}</h2>
          <p className="mt-1 max-w-[60ch] text-sm text-ink-muted">{t("body")}</p>
        </div>
      </div>
      {plans.length ? (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {plans.map((p, i) => {
            const tint = PLAN_TINTS[i % PLAN_TINTS.length];
            const hasTarget = p.target_return_min != null;
            const fmt = (v) => formatMoney(v, { locale, currency: p.currency || "USD" });
            return (
              <li key={p.id} className="glass glass-tint flex flex-col p-5" style={{ "--tint": TINT[tint] }}>
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-display text-lg font-semibold" style={{ color: TINT[tint] }}>{p.name}</h3>
                  <span className="rounded-full border border-line px-2 py-0.5 text-[11px] text-ink-muted">{tr(p.risk_level)}</span>
                </div>
                <dl className="mt-4 space-y-2.5 text-sm">
                  <div className="flex justify-between gap-3">
                    <dt className="mono-label">{t("min")}</dt>
                    <dd className="font-semibold">{fmt(p.min_amount)}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="mono-label">{t("max")}</dt>
                    <dd>{fmt(p.max_amount)}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="mono-label">{t("term")}</dt>
                    <dd className="flex items-center gap-1.5"><CalendarClock className="h-3.5 w-3.5 text-ink-subtle" aria-hidden="true" />{t("days", { count: p.term_days })}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="mono-label">{t("target")}</dt>
                    <dd className={hasTarget ? "text-[var(--cmd-green)]" : "text-ink-subtle"}>
                      {hasTarget
                        ? `${formatPercent(p.target_return_min, { locale })}–${formatPercent(p.target_return_max, { locale })}`
                        : t("noTarget")}
                    </dd>
                  </div>
                </dl>
                <Link
                  href={`/dashboard/invest?plan=${p.slug}`}
                  className="mt-5 inline-flex h-10 items-center justify-center rounded-lg border font-mono text-[11px] font-semibold uppercase tracking-[0.12em] transition hover:brightness-125"
                  style={{ borderColor: `color-mix(in oklab, ${TINT[tint]} 45%, transparent)`, background: `color-mix(in oklab, ${TINT[tint]} 12%, transparent)`, color: TINT[tint] }}
                >
                  {t("cta", { amount: fmt(p.min_amount) })}
                </Link>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="glass p-6 text-sm text-ink-subtle">{t("empty")}</p>
      )}
      <p className="mt-3 text-xs text-ink-subtle">{t("note")}</p>
    </section>
  );
}
