import { getTranslations } from "next-intl/server";
import { getPrices } from "@/lib/market/coingecko";
import { getPublicAssets } from "@/lib/database/public-data";
import { TickerTrack } from "./ticker-track";

export async function MarketTicker() {
  const t = await getTranslations("home.ticker");
  const assets = await getPublicAssets();
  const prices = await getPrices(assets.map((a) => a.coingecko_id).filter(Boolean));

  const items = prices
    ? assets
        .filter((a) => prices[a.coingecko_id]?.usd != null)
        .map((a) => ({
          symbol: a.symbol,
          name: a.name,
          price: prices[a.coingecko_id].usd,
          change: prices[a.coingecko_id].usd_24h_change ?? null,
        }))
    : [];

  return (
    <section id="markets" aria-label={t("label")} className="border-y border-line bg-surface">
      {items.length ? (
        <TickerTrack items={items} source={t("source")} />
      ) : (
        <p className="container-page py-4 text-sm text-ink-subtle">{t("unavailable")}</p>
      )}
    </section>
  );
}
