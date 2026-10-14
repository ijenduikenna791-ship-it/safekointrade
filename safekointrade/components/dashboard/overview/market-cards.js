import { getTranslations } from "next-intl/server";
import { TrendingDown, TrendingUp } from "lucide-react";
import { getMarkets } from "@/lib/market/coingecko";
import { CryptoCoin } from "@/components/ui/crypto-coin";
import { formatMoney, formatPercent } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";

const COINS = [
  { id: "bitcoin", symbol: "BTC", name: "Bitcoin", tint: "#f7931a" },
  { id: "ethereum", symbol: "ETH", name: "Ethereum", tint: "#6f7ee8" },
  { id: "solana", symbol: "SOL", name: "Solana", tint: "#9945ff" },
];

function sparkline(values, w = 220, h = 64, pad = 4) {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const x = (i) => (i / (values.length - 1)) * (w - 6); // room for the end dot
  const y = (v) => pad + (1 - (v - min) / span) * (h - pad * 2);
  const line = values.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  return { line, area: `${line} L${w},${h} L0,${h} Z`, end: { x: x(values.length - 1), y: y(values[values.length - 1]) } };
}

/** Live prices + 7-day trend. Missing data shows "unavailable", never placeholders. */
export async function MarketCards({ locale }) {
  const t = await getTranslations("dashboard.overview.markets");
  const tt = await getTranslations("home.ticker");
  // One request for prices, 24h change and the 7-day sparkline of every coin.
  const markets = await getMarkets(COINS.map((c) => c.id));

  return (
    <section aria-labelledby="markets-title">
      <div className="mb-3 flex items-end justify-between gap-3">
        <div>
          <h2 id="markets-title" className="text-base font-semibold">{t("title")}</h2>
          <p className="text-xs text-ink-subtle">{t("description")}</p>
        </div>
      </div>
      <ul className="grid gap-4 sm:grid-cols-3">
        {COINS.map((c) => {
          const p = markets?.[c.id];
          // ~168 hourly points; every 4th keeps the shape and a light SVG.
          const hist = (p?.sparkline || []).filter((_, i, a) => i % 4 === 0 || i === a.length - 1);
          const change = p?.usd_24h_change ?? null;
          const up = (change ?? 0) >= 0;
          const Trend = up ? TrendingUp : TrendingDown;
          const sp = hist.length > 1 ? sparkline(hist) : null;
          const color = c.tint;
          return (
            <li key={c.id} className="relative isolate overflow-hidden rounded-2xl border border-line bg-surface p-5">
              <div
                aria-hidden="true"
                className="coin-glow absolute inset-0 -z-10"
                style={{ "--tint": c.tint }}
              />
              <div className="flex items-center gap-3">
                <CryptoCoin symbol={c.symbol} className="h-9 w-9" />
                <div className="min-w-0">
                  <p className="text-sm font-semibold">{c.name}</p>
                  <p className="text-xs text-ink-subtle">{c.symbol} / USD</p>
                </div>
              </div>
              {p?.usd != null ? (
                <div className="mt-4">
                  <p className="font-display text-2xl font-semibold tracking-tight">{formatMoney(p.usd, { locale })}</p>
                  {change != null && (
                    <p className={cn("mt-1 inline-flex items-center gap-1 text-xs font-medium", up ? "text-gain" : "text-loss")}>
                      <Trend className="h-3.5 w-3.5" aria-hidden="true" />
                      {formatPercent(change, { locale, signed: true })} · 24h
                    </p>
                  )}
                </div>
              ) : (
                <p className="mt-4 text-sm text-ink-subtle">{tt("unavailable")}</p>
              )}
              {sp && (
                <svg viewBox="0 0 220 64" preserveAspectRatio="none" className="mt-4 h-16 w-full" role="img" aria-label={`${c.name} ${t("trend")}`}>
                  <defs>
                    <linearGradient id={`spark-${c.id}`} x1="0" x2="0" y1="0" y2="1">
                      <stop offset="0%" stopColor={color} stopOpacity="0.35" />
                      <stop offset="100%" stopColor={color} stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  <path d={sp.area} fill={`url(#spark-${c.id})`} />
                  <path d={sp.line} fill="none" stroke={color} strokeWidth="2" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
                  <circle cx={sp.end.x} cy={sp.end.y} r="4" fill={color} stroke="var(--surface)" strokeWidth="2" />
                </svg>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
