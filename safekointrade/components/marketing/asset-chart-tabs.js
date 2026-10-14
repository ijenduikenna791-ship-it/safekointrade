"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { motion } from "framer-motion";
import { TrendingDown, TrendingUp } from "lucide-react";
import { LineChart } from "@/components/charts/line-chart";
import { formatMoney, formatPercent } from "@/lib/utils/format";
import { localeMeta } from "@/lib/i18n/routing";
import { cn } from "@/lib/utils/cn";

export function AssetChartTabs({ series }) {
  const t = useTranslations("home.analytics");
  const locale = useLocale();
  const [active, setActive] = useState(series[0].symbol);
  const current = series.find((s) => s.symbol === active) ?? series[0];
  const first = current.points[0].price;
  const last = current.points.at(-1).price;
  const change = ((last - first) / first) * 100;
  const up = change >= 0;

  const dateFmt = new Intl.DateTimeFormat(localeMeta[locale]?.intl, { month: "short", day: "numeric", timeZone: "UTC" });
  const fullDate = new Intl.DateTimeFormat(localeMeta[locale]?.intl, { dateStyle: "medium", timeZone: "UTC" });

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div role="tablist" aria-label={t("range")} className="flex gap-1">
          {series.map((s) => (
            <button
              key={s.symbol}
              role="tab"
              type="button"
              aria-selected={s.symbol === active}
              aria-controls="asset-chart-panel"
              onClick={() => setActive(s.symbol)}
              className={cn(
                "relative rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                s.symbol === active ? "text-ink" : "text-ink-muted hover:text-ink"
              )}
            >
              {s.symbol === active && (
                <motion.span
                  layoutId="asset-tab"
                  className="absolute inset-0 rounded-md bg-surface-2"
                  transition={{ type: "spring", duration: 0.35, bounce: 0.15 }}
                />
              )}
              <span className="relative">{s.symbol}</span>
            </button>
          ))}
        </div>
        <div className="text-end">
          <p className="font-display text-xl font-semibold">{formatMoney(last, { locale })}</p>
          <p className={cn("tabular inline-flex items-center gap-1 text-sm", up ? "text-gain" : "text-loss")}>
            {up ? <TrendingUp className="h-3.5 w-3.5" aria-hidden="true" /> : <TrendingDown className="h-3.5 w-3.5" aria-hidden="true" />}
            {formatPercent(change, { locale, signed: true })}
            <span className="text-ink-subtle">· {t("change")}</span>
          </p>
        </div>
      </div>
      <motion.div
        key={current.symbol}
        id="asset-chart-panel"
        role="tabpanel"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.25 }}
        className="mt-5"
      >
        <LineChart
          data={current.points.map((p) => ({ x: p.t, y: p.price }))}
          label={`${current.name} — ${t("range")}`}
          formatX={(v) => fullDate.format(new Date(v))}
          formatTick={(v) => dateFmt.format(new Date(v))}
          formatY={(v) => formatMoney(v, { locale })}
          formatYTick={(v) => formatMoney(v, { locale, compact: true })}
          tableHeaders={["", t("range")]}
        />
      </motion.div>
      <p className="mt-3 text-xs text-ink-subtle">{t("range")} · CoinGecko</p>
    </div>
  );
}
