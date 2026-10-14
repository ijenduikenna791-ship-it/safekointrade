"use client";

import { useLocale } from "next-intl";
import { useReducedMotion } from "framer-motion";
import { TrendingDown, TrendingUp } from "lucide-react";
import { formatMoney, formatPercent } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";
import { CryptoCoin } from "@/components/ui/crypto-coin";

function Item({ item, locale, hidden }) {
  const up = (item.change ?? 0) >= 0;
  return (
    <li className="flex shrink-0 items-center gap-2.5 px-6 text-sm" aria-hidden={hidden || undefined}>
      <CryptoCoin symbol={item.symbol} className="h-6 w-6" />
      <span className="font-semibold">{item.symbol}</span>
      <span className="tabular text-ink-muted">{formatMoney(item.price, { locale })}</span>
      {item.change != null && (
        <span className={cn("tabular inline-flex items-center gap-1", up ? "text-gain" : "text-loss")}>
          {up ? <TrendingUp className="h-3.5 w-3.5" aria-hidden="true" /> : <TrendingDown className="h-3.5 w-3.5" aria-hidden="true" />}
          {formatPercent(item.change, { locale, signed: true })}
        </span>
      )}
    </li>
  );
}

export function TickerTrack({ items, source }) {
  const locale = useLocale();
  const reduce = useReducedMotion();

  if (reduce) {
    return (
      <div className="container-page overflow-x-auto py-3.5">
        <ul className="flex">{items.map((i) => <Item key={i.symbol} item={i} locale={locale} />)}</ul>
        <p className="sr-only">{source}</p>
      </div>
    );
  }

  return (
    <div className="group relative overflow-hidden py-3.5" dir="ltr">
      <div aria-hidden="true" className="pointer-events-none absolute inset-y-0 start-0 z-10 w-16 bg-gradient-to-r from-surface to-transparent" />
      <div aria-hidden="true" className="pointer-events-none absolute inset-y-0 end-0 z-10 w-16 bg-gradient-to-l from-surface to-transparent" />
      {/* The track holds two identical halves; animating -50% loops seamlessly.
          Short lists are repeated so each half is wider than the viewport. */}
      <ul className="flex w-max animate-ticker group-hover:[animation-play-state:paused]">
        {[0, 1].map((half) =>
          Array.from({ length: Math.max(1, Math.ceil(10 / items.length)) }).flatMap((_, rep) =>
            items.map((i) => (
              <Item key={`${half}-${rep}-${i.symbol}`} item={i} locale={locale} hidden={half === 1 || rep > 0} />
            ))
          )
        )}
      </ul>
      <p className="sr-only">{source}</p>
    </div>
  );
}
