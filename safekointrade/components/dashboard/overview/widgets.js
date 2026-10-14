import { getTranslations } from "next-intl/server";
import { ArrowDownToLine, ArrowUpFromLine, CalendarClock, Check, Gauge, PiggyBank, Rocket } from "lucide-react";
import { Link } from "@/lib/i18n/navigation";
import { buttonClasses } from "@/components/ui/button";
import { formatDate, formatMoney, formatPercent, toNumber } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";

function Panel({ title, description, icon: Icon, action, className, children, id }) {
  return (
    <section aria-labelledby={id} className={cn("rounded-2xl border border-line bg-surface p-5 sm:p-6", className)}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 id={id} className="flex items-center gap-2 text-sm font-semibold text-ink">
            {Icon && <Icon className="h-4 w-4 text-brass" aria-hidden="true" />}
            {title}
          </h2>
          {description && <p className="mt-1 text-xs text-ink-subtle">{description}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

// --- Balance breakdown --------------------------------------------------------
export async function BalanceBreakdown({ available, invested, pending, locale }) {
  const t = await getTranslations("dashboard.overview");
  const parts = [
    { key: "available", value: toNumber(available), color: "var(--brass)" },
    { key: "invested", value: toNumber(invested), color: "var(--chart-2)" },
    { key: "pending", value: toNumber(pending), color: "var(--ink-subtle)" },
  ];
  const sum = parts.reduce((s, p) => s + p.value, 0);
  return (
    <Panel id="breakdown-title" title={t("breakdownTitle")} className="flex flex-col">
      {/* segmented bar with 2px surface gaps */}
      <div className="mt-5 flex h-3 gap-0.5 overflow-hidden rounded-full bg-surface-2" aria-hidden="true">
        {sum > 0 &&
          parts.map((p) =>
            p.value > 0 ? <span key={p.key} className="h-full first:rounded-s-full last:rounded-e-full" style={{ width: `${(p.value / sum) * 100}%`, background: p.color }} /> : null
          )}
      </div>
      <dl className="mt-5 space-y-3">
        {parts.map((p) => (
          <div key={p.key} className="flex items-center justify-between gap-3 text-sm">
            <dt className="flex items-center gap-2 text-ink-muted">
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: p.color }} aria-hidden="true" />
              {t(p.key)}
            </dt>
            <dd className="text-end">
              <bdi className="font-semibold text-ink">{formatMoney(p.value, { locale })}</bdi>
              {sum > 0 && <bdi className="ms-2 text-xs text-ink-subtle">{formatPercent((p.value / sum) * 100, { locale })}</bdi>}
            </dd>
          </div>
        ))}
      </dl>
      <div className="mt-auto grid grid-cols-3 gap-2 pt-6">
        {[
          { href: "/dashboard/deposits", icon: ArrowDownToLine, label: t("quick.deposit") },
          { href: "/dashboard/withdrawals", icon: ArrowUpFromLine, label: t("quick.withdraw") },
          { href: "/dashboard/invest", icon: PiggyBank, label: t("quick.invest") },
        ].map((a, i) => (
          <Link
            key={a.href}
            href={a.href}
            className={buttonClasses({ variant: i === 2 ? "primary" : "secondary", size: "sm", className: "h-auto flex-col gap-1 py-2.5 text-xs" })}
          >
            <a.icon className="h-4 w-4" aria-hidden="true" />
            <span className="whitespace-normal text-center leading-tight">{a.label}</span>
          </Link>
        ))}
      </div>
    </Panel>
  );
}

// --- Next maturity -------------------------------------------------------------
export async function NextMaturity({ position, now, locale }) {
  const t = await getTranslations("dashboard.overview");
  if (!position) {
    return (
      <Panel id="maturity-title" title={t("maturity.title")} icon={CalendarClock}>
        <p className="mt-6 text-sm text-ink-subtle">{t("maturity.empty")}</p>
      </Panel>
    );
  }
  const start = new Date(position.started_at).getTime();
  const end = new Date(position.matures_at).getTime();
  const nowMs = new Date(now).getTime();
  const progress = Math.min(1, Math.max(0, (nowMs - start) / (end - start)));
  const daysLeft = Math.max(0, Math.ceil((end - nowMs) / 86400000));
  const day = Math.min(position.term_days, Math.max(1, Math.ceil((nowMs - start) / 86400000)));
  return (
    <Panel id="maturity-title" title={t("maturity.title")} icon={CalendarClock}>
      <div className="mt-4 flex items-end justify-between gap-3">
        <div>
          <p className="font-display text-2xl font-semibold">{formatMoney(position.amount, { locale })}</p>
          <p className="mt-0.5 text-xs text-ink-subtle">{position.plan_name} · {position.reference}</p>
        </div>
        <p className="rounded-full bg-brass-soft px-2.5 py-1 text-xs font-semibold text-brass">{t("maturity.daysLeft", { count: daysLeft })}</p>
      </div>
      {/* tick track with a thumb at the current day */}
      <div className="relative mt-6 h-8" aria-hidden="true">
        <div className="absolute inset-x-0 top-1/2 flex -translate-y-1/2 justify-between">
          {Array.from({ length: 40 }, (_, i) => (
            <span key={i} className={cn("h-5 w-px", i / 39 <= progress ? "bg-brass" : "bg-line-strong")} />
          ))}
        </div>
        <span
          className="absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-surface bg-brass shadow-[0_0_12px_var(--brass)] rtl:translate-x-1/2"
          style={{ insetInlineStart: `${progress * 100}%` }}
        />
      </div>
      <div className="mt-3 flex justify-between text-xs text-ink-subtle">
        <span>{t("maturity.dayOf", { day, total: position.term_days })}</span>
        <span>{t("maturity.maturesOn", { date: formatDate(position.matures_at, { locale }) })}</span>
      </div>
      <p className="sr-only">{formatPercent(progress * 100, { locale })}</p>
    </Panel>
  );
}

// --- Risk mix gauge ------------------------------------------------------------
const WEIGHT = { low: 0, moderate: 0.5, high: 1 };

export async function RiskMix({ positions, locale }) {
  const t = await getTranslations("dashboard.overview");
  const tr = await getTranslations("common.risk");
  const known = positions.filter((p) => p.risk in WEIGHT);
  const total = known.reduce((s, p) => s + toNumber(p.amount), 0);
  const shares = ["low", "moderate", "high"].map((k) => ({
    key: k,
    value: known.filter((p) => p.risk === k).reduce((s, p) => s + toNumber(p.amount), 0),
  }));
  const score = total > 0 ? known.reduce((s, p) => s + WEIGHT[p.risk] * toNumber(p.amount), 0) / total : null;
  const label = score == null ? null : score < 0.34 ? "low" : score < 0.67 ? "moderate" : "high";

  // Semicircle: 180° arc from left (0) to right (1).
  const R = 80;
  const C = Math.PI * R;
  const angle = Math.PI * (1 - (score ?? 0));
  const nx = 100 + Math.cos(angle) * (R - 18);
  const ny = 100 - Math.sin(angle) * (R - 18);

  return (
    <Panel id="risk-title" title={t("risk.title")} description={t("risk.description")} icon={Gauge}>
      {score == null ? (
        <p className="mt-6 text-sm text-ink-subtle">{t("risk.empty")}</p>
      ) : (
        <>
          <svg viewBox="0 0 200 112" className="mx-auto mt-3 w-full max-w-[15rem]" role="img" aria-label={`${t("risk.title")}: ${t(`risk.${label}`)}`}>
            <defs>
              <linearGradient id="risk-grad" x1="0" x2="1" y1="0" y2="0">
                <stop offset="0%" stopColor="var(--gain)" />
                <stop offset="50%" stopColor="var(--warn)" />
                <stop offset="100%" stopColor="var(--loss)" />
              </linearGradient>
            </defs>
            <path d="M20 100 A80 80 0 0 1 180 100" fill="none" stroke="var(--surface-3)" strokeWidth="14" strokeLinecap="round" />
            <path
              d="M20 100 A80 80 0 0 1 180 100"
              fill="none"
              stroke="url(#risk-grad)"
              strokeWidth="14"
              strokeLinecap="round"
              strokeDasharray={`${C * score} ${C}`}
              style={{ filter: "drop-shadow(0 0 6px rgb(255 255 255 / 0.15))" }}
            />
            {Array.from({ length: 11 }, (_, i) => {
              const a = Math.PI * (1 - i / 10);
              return (
                <line
                  key={i}
                  x1={100 + Math.cos(a) * 62}
                  y1={100 - Math.sin(a) * 62}
                  x2={100 + Math.cos(a) * 56}
                  y2={100 - Math.sin(a) * 56}
                  stroke="var(--ink-subtle)"
                  strokeWidth="1.2"
                />
              );
            })}
            <line x1="100" y1="100" x2={nx} y2={ny} stroke="var(--ink)" strokeWidth="3" strokeLinecap="round" />
            <circle cx="100" cy="100" r="6" fill="var(--ink)" />
          </svg>
          <p className="-mt-1 text-center font-display text-lg font-semibold">{t(`risk.${label}`)}</p>
          <ul className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
            {shares.map((s) => (
              <li key={s.key} className="rounded-lg bg-surface-2 px-2 py-2">
                <p className="text-ink-subtle">{tr(s.key)}</p>
                <p className="mt-0.5 font-semibold text-ink">{formatPercent(total ? (s.value / total) * 100 : 0, { locale })}</p>
              </li>
            ))}
          </ul>
        </>
      )}
    </Panel>
  );
}

// --- Getting started (new accounts) --------------------------------------------
export async function GettingStarted({ requested, confirmed, invested }) {
  const t = await getTranslations("dashboard.overview.gettingStarted");
  const steps = [
    { key: "request", done: requested, href: "/dashboard/deposits" },
    { key: "confirmed", done: confirmed, href: "/dashboard/deposits" },
    { key: "invest", done: invested, href: "/dashboard/invest" },
  ];
  const current = steps.findIndex((s) => !s.done);
  return (
    <Panel id="start-title" title={t("title")} description={t("description")} icon={Rocket} className="dash-glow">
      <ol className="mt-5 grid gap-3 lg:grid-cols-3">
        {steps.map((s, i) => (
          <li key={s.key}>
            <Link
              href={s.href}
              className={cn(
                "flex h-full gap-3 rounded-xl border p-4 transition-colors",
                s.done ? "border-gain/30 bg-gain-soft/50" : i === current ? "border-brass-line bg-brass-soft/60 hover:border-brass" : "border-line bg-surface-2/50"
              )}
            >
              <span
                className={cn(
                  "grid h-8 w-8 shrink-0 place-items-center rounded-full text-sm font-semibold",
                  s.done ? "bg-gain text-white" : i === current ? "bg-brass text-surface" : "bg-surface-3 text-ink-subtle"
                )}
              >
                {s.done ? <Check className="h-4 w-4" aria-hidden="true" /> : i + 1}
              </span>
              <span>
                <span className="block text-sm font-semibold text-ink">{t(`steps.${s.key}`)}</span>
                <span className="mt-0.5 block text-xs text-ink-muted">{t(`steps.${s.key}Body`)}</span>
                {s.done && <span className="sr-only">{t("done")}</span>}
              </span>
            </Link>
          </li>
        ))}
      </ol>
    </Panel>
  );
}
