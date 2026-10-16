import { getLocale, getTranslations } from "next-intl/server";
import { getMarkets } from "@/lib/market/coingecko";
import { CryptoCoin } from "@/components/ui/crypto-coin";
import { formatMoney, formatPercent } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";

const COINS = [
  { id: "bitcoin", symbol: "BTC" },
  { id: "ethereum", symbol: "ETH" },
  { id: "tether", symbol: "USDT" },
  { id: "binancecoin", symbol: "BNB" },
  { id: "euro-coin", symbol: "EURC" },
];

/** Thin live-prices strip above the header. Shows real prices or nothing. */
export async function RatesBar() {
  const t = await getTranslations("home.rates");
  const locale = await getLocale();
  const markets = await getMarkets(COINS.map((c) => c.id));
  const items = COINS.filter((c) => markets?.[c.id]?.usd != null).map((c) => ({ ...c, ...markets[c.id] }));
  if (!items.length) return null;

  return (
    <div className="dark bg-brand-night text-ink">
      <div className="container-page flex h-10 items-center gap-6 text-xs">
        <ul aria-label={t("label")} className="no-scrollbar flex min-w-0 flex-1 items-center gap-5 overflow-x-auto sm:gap-7">
          {items.map((c) => {
            const up = (c.usd_24h_change ?? 0) >= 0;
            return (
              <li key={c.id} className="flex shrink-0 items-center gap-1.5">
                <CryptoCoin symbol={c.symbol} className="h-4 w-4" />
                <span className="font-semibold">{c.symbol}</span>
                <span className="tabular text-ink-muted">{formatMoney(c.usd, { locale })}</span>
                {c.usd_24h_change != null && (
                  <span className={cn("tabular font-medium", up ? "text-brand-mint" : "text-[#ff8a7a]")}>
                    {formatPercent(c.usd_24h_change, { locale, signed: true })}
                  </span>
                )}
              </li>
            );
          })}
        </ul>
        <p className="hidden shrink-0 items-center gap-1.5 text-ink-subtle md:flex">
          <span className="h-1.5 w-1.5 rounded-full bg-brand-mint" aria-hidden="true" />
          {t("source")}
        </p>
      </div>
    </div>
  );
}
