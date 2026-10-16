"use client";

import { useId, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ArrowDownToLine, TrendingDown, TrendingUp } from "lucide-react";
import { Link } from "@/lib/i18n/navigation";
import { buttonClasses } from "@/components/ui/button";
import { formatMoney, formatPercent } from "@/lib/utils/format";
import { localeMeta } from "@/lib/i18n/routing";
import { cn } from "@/lib/utils/cn";

const RANGES = [
  { key: "week", days: 7 },
  { key: "month", days: 30 },
  { key: "all", days: null },
];

function GlowTooltip({ active, payload, label, fmtX, fmtY }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-line bg-surface/95 px-3 py-2 text-sm shadow-lg backdrop-blur">
      <p className="text-xs text-ink-subtle">{fmtX(label)}</p>
      <p className="mt-0.5 font-semibold text-ink">{fmtY(payload[0].value)}</p>
    </div>
  );
}

/**
 * Portfolio value with a glowing area chart. Every point is a real ledger entry
 * (total balance after it). `now` comes from the server so ranges are stable.
 */
export function PortfolioHero({ points, total, now }) {
  const t = useTranslations("dashboard.overview");
  const locale = useLocale();
  const [range, setRange] = useState("all");
  const gid = useId().replace(/:/g, "");
  const intl = localeMeta[locale]?.intl;
  const fmtY = (v) => formatMoney(v, { locale });
  const short = new Intl.DateTimeFormat(intl, { month: "short", day: "numeric", timeZone: "UTC" });
  const full = new Intl.DateTimeFormat(intl, { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" });

  const series = useMemo(() => {
    const all = points.map((p) => ({ x: new Date(p.t).getTime(), y: p.total })).sort((a, b) => a.x - b.x);
    if (!all.length) return all;
    const end = Math.max(new Date(now).getTime(), all[all.length - 1].x);
    const days = RANGES.find((r) => r.key === range)?.days;
    // Before the first ledger entry the balance was zero — that's a fact, so
    // the line starts there and the first deposit shows as a step up.
    const span = end - all[0].x;
    const from = days ? end - days * 86400000 : all[0].x - Math.max(86400000, span * 0.08);
    const before = [...all].reverse().find((p) => p.x < from);
    const out = [{ x: from, y: before ? before.y : 0 }, ...all.filter((p) => p.x >= from)];
    // Extend to "now" so a quiet period still draws a flat line.
    out.push({ x: end, y: out[out.length - 1].y });
    return out;
  }, [points, range, now]);

  const first = series[0]?.y ?? 0;
  const last = series[series.length - 1]?.y ?? 0;
  const change = last - first;
  const pct = first > 0 ? (change / first) * 100 : null;
  const up = change >= 0;
  const Trend = up ? TrendingUp : TrendingDown;

  return (
    <section
      aria-labelledby="portfolio-title"
      className="glass relative overflow-hidden p-5 sm:p-6"
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 id="portfolio-title" className="mono-label">{t("total")}</h2>
          <p className="mt-1 font-display text-3xl font-semibold tracking-tight sm:text-4xl">{fmtY(total)}</p>
          {series.length >= 2 && (
            <p className={cn("mt-1.5 inline-flex items-center gap-1 text-sm font-medium", up ? "text-gain" : "text-loss")}>
              <Trend className="h-4 w-4" aria-hidden="true" />
              {formatMoney(change, { locale })}
              {pct != null && <span className="text-ink-subtle">({formatPercent(pct, { locale, signed: true })})</span>}
              <span className="ms-1 font-normal text-ink-subtle">· {t("rangeChange")}</span>
            </p>
          )}
        </div>
        <div role="group" aria-label={t("range.label")} className="inline-flex rounded-lg border border-line bg-surface-2 p-0.5">
          {RANGES.map((r) => (
            <button
              key={r.key}
              type="button"
              onClick={() => setRange(r.key)}
              aria-pressed={range === r.key}
              className={cn(
                "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                range === r.key ? "bg-surface text-ink shadow-sm" : "text-ink-muted hover:text-ink"
              )}
            >
              {t(`range.${r.key}`)}
            </button>
          ))}
        </div>
      </div>

      {series.length >= 2 ? (
        <figure aria-label={t("historyTitle")} className="mt-4">
          <div className="h-56 sm:h-64" aria-hidden="true" dir="ltr">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={series} margin={{ top: 10, right: 4, bottom: 0, left: 4 }}>
                <defs>
                  <linearGradient id={`g-${gid}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#4f8cff" stopOpacity={0.45} />
                    <stop offset="45%" stopColor="var(--brass)" stopOpacity={0.18} />
                    <stop offset="100%" stopColor="var(--brass)" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id={`s-${gid}`} x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="var(--brass)" />
                    <stop offset="100%" stopColor="#a78bfa" />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="x"
                  type="number"
                  scale="time"
                  domain={["dataMin", "dataMax"]}
                  tickFormatter={(v) => short.format(new Date(v))}
                  tick={{ fill: "var(--ink-subtle)", fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  minTickGap={40}
                />
                <YAxis hide domain={[0, (max) => (max > 0 ? max * 1.15 : 1)]} />
                <Tooltip
                  content={<GlowTooltip fmtX={(v) => full.format(new Date(v))} fmtY={fmtY} />}
                  cursor={{ stroke: "var(--ink-subtle)", strokeDasharray: "4 4" }}
                />
                <Area
                  // Balances change only at ledger events, so steps (not curves) are accurate.
                  type="stepAfter"
                  dataKey="y"
                  stroke={`url(#s-${gid})`}
                  strokeWidth={3}
                  fill={`url(#g-${gid})`}
                  className="chart-glow"
                  activeDot={{ r: 6, stroke: "var(--surface)", strokeWidth: 2.5, fill: "#a78bfa" }}
                  isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <table className="sr-only">
            <caption>{t("historyTitle")}</caption>
            <tbody>
              {series.map((p, i) => (
                <tr key={i}>
                  <th scope="row">{full.format(new Date(p.x))}</th>
                  <td>{fmtY(p.y)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </figure>
      ) : (
        <div className="relative mt-4 h-56 sm:h-64">
          {/* Decorative silhouette only — no values, not data. */}
          <svg viewBox="0 0 600 200" preserveAspectRatio="none" className="absolute inset-0 h-full w-full opacity-35" aria-hidden="true">
            <defs>
              <linearGradient id={`ghost-${gid}`} x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="var(--brass)" stopOpacity="0.35" />
                <stop offset="100%" stopColor="var(--brass)" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path d="M0 170 C60 160 90 120 150 125 S240 150 300 105 S400 60 450 80 S540 40 600 30 L600 200 L0 200 Z" fill={`url(#ghost-${gid})`} />
            <path d="M0 170 C60 160 90 120 150 125 S240 150 300 105 S400 60 450 80 S540 40 600 30" fill="none" stroke="var(--brass)" strokeWidth="2.5" strokeDasharray="6 8" vectorEffect="non-scaling-stroke" />
          </svg>
          <div className="relative flex h-full items-center justify-center">
            <div className="flex flex-col items-center gap-4 rounded-xl border border-line bg-surface/85 px-6 py-5 text-center shadow-lg backdrop-blur-sm">
            <p className="max-w-[36ch] text-sm text-ink-muted">{t("historyEmpty")}</p>
            <Link href="/dashboard/deposits" className={buttonClasses({ size: "sm" })}>
              <ArrowDownToLine className="h-4 w-4" aria-hidden="true" />
              {t("quick.deposit")}
            </Link>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
