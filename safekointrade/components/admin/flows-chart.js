"use client";

import { useLocale, useTranslations } from "next-intl";
import { BarChart } from "@/components/charts/bar-chart";
import { formatMoney } from "@/lib/utils/format";
import { localeMeta } from "@/lib/i18n/routing";

/** data: [{ day: "2026-10-01", deposits, withdrawals }] */
export function DailyFlowsChart({ data }) {
  const t = useTranslations("dashboard.overview");
  const locale = useLocale();
  const fmt = new Intl.DateTimeFormat(localeMeta[locale]?.intl, { month: "short", day: "numeric", timeZone: "UTC" });
  return (
    <BarChart
      data={data.map((d) => ({ ...d, label: fmt.format(new Date(`${d.day}T00:00:00Z`)) }))}
      series={[
        { key: "deposits", label: t("depositsLabel"), color: "var(--chart-1)" },
        { key: "withdrawals", label: t("withdrawalsLabel"), color: "var(--chart-2)" },
      ]}
      label={t("flowsTitle")}
      formatY={(v) => formatMoney(v, { locale, compact: true })}
      height={240}
    />
  );
}
