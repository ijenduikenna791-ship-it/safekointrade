import { getTranslations } from "next-intl/server";
import { getHistory } from "@/lib/market/coingecko";
import { getPublicAssets } from "@/lib/database/public-data";
import { SectionHeading } from "./section-heading";
import { AssetChartTabs } from "./asset-chart-tabs";
import { DashboardPreview } from "./dashboard-preview";

const CHART_ASSETS = ["BTC", "ETH", "SOL"];

export async function MarketAnalytics() {
  const t = await getTranslations("home.analytics");
  const assets = (await getPublicAssets()).filter((a) => CHART_ASSETS.includes(a.symbol) && a.coingecko_id);
  const histories = await Promise.all(assets.map((a) => getHistory(a.coingecko_id, 30)));
  const series = assets
    .map((a, i) => ({ symbol: a.symbol, name: a.name, points: histories[i] }))
    .filter((s) => s.points);

  return (
    <section aria-labelledby="analytics-title" className="border-t border-line py-16 sm:py-24">
      <div className="container-page">
        <SectionHeading id="analytics-title" title={t("title")} body={t("body")} />
        <div className="mt-12 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
          <div className="rounded-lg border border-line bg-surface p-5 shadow-sm sm:p-6">
            {series.length ? (
              <AssetChartTabs series={series} />
            ) : (
              <p className="grid h-72 place-items-center text-center text-sm text-ink-subtle">{t("unavailable")}</p>
            )}
          </div>
          <DashboardPreview />
        </div>
      </div>
    </section>
  );
}
