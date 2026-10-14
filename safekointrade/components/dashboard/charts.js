"use client";

import { useLocale, useTranslations } from "next-intl";
import { LineChart } from "@/components/charts/line-chart";
import { BarChart } from "@/components/charts/bar-chart";
import { formatMoney } from "@/lib/utils/format";
import { localeMeta } from "@/lib/i18n/routing";

/** Total balance after each ledger entry. points: [{ t: ISO, total: number }] */
export function PortfolioChart({ points }) {
  const t = useTranslations("dashboard.overview");
  const locale = useLocale();
  const intl = localeMeta[locale]?.intl;
  const short = new Intl.DateTimeFormat(intl, { month: "short", day: "numeric", timeZone: "UTC" });
  const full = new Intl.DateTimeFormat(intl, { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" });
  return (
    <LineChart
      data={points.map((p) => ({ x: new Date(p.t).getTime(), y: p.total }))}
      label={t("historyTitle")}
      formatX={(v) => full.format(new Date(v))}
      formatTick={(v) => short.format(new Date(v))}
      formatY={(v) => formatMoney(v, { locale })}
      formatYTick={(v) => formatMoney(v, { locale, compact: true })}
      tableHeaders={["", t("total")]}
      height={240}
    />
  );
}

/** Monthly confirmed deposits vs paid-out withdrawals. data: [{ month: "2026-10", deposits, withdrawals }] */
export function FlowsChart({ data }) {
  const t = useTranslations("dashboard.overview");
  const locale = useLocale();
  const month = new Intl.DateTimeFormat(localeMeta[locale]?.intl, { month: "short", year: "numeric", timeZone: "UTC" });
  return (
    <BarChart
      data={data.map((d) => ({ ...d, label: month.format(new Date(`${d.month}-01T00:00:00Z`)) }))}
      series={[
        { key: "deposits", label: t("depositsLabel"), color: "var(--chart-1)" },
        { key: "withdrawals", label: t("withdrawalsLabel"), color: "var(--chart-2)" },
      ]}
      label={t("flowsTitle")}
      formatY={(v) => formatMoney(v, { locale, compact: true })}
      height={220}
    />
  );
}
