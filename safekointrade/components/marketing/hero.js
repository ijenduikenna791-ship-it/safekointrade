"use client";

import { useLocale, useTranslations } from "next-intl";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowUpRight, ShieldCheck, TrendingDown, TrendingUp } from "lucide-react";
import { Link } from "@/lib/i18n/navigation";
import { buttonClasses } from "@/components/ui/button";
import { Starfield } from "@/components/animations/starfield";
import { formatMoney, formatPercent } from "@/lib/utils/format";
import { CryptoCoin } from "@/components/ui/crypto-coin";

const ease = [0.25, 1, 0.5, 1];

/** Live price card. With no data it says so — never a made-up number. */
function CoinCard({ coin, unavailable, side, delay }) {
  const locale = useLocale();
  const reduce = useReducedMotion();
  const up = (coin.change ?? 0) >= 0;
  const Trend = up ? TrendingUp : TrendingDown;
  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, x: side === "start" ? -24 : 24 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.8, delay, ease }}
      className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-5 py-4 backdrop-blur-md sm:w-auto 2xl:w-64"
    >
      <div className="flex items-center gap-3">
        <CryptoCoin symbol={coin.symbol} className="h-11 w-11 shrink-0 drop-shadow-[0_6px_14px_rgb(0_0_0/0.45)]" />
        <div className="min-w-0 text-start">
          <p className="font-display text-lg font-semibold leading-tight text-white">{coin.name}</p>
          <p className="text-xs text-white/55">{coin.symbol} / USD</p>
        </div>
      </div>
      {coin.price != null ? (
        <div className="mt-3 flex items-baseline justify-between gap-3">
          <p className="font-display text-xl font-semibold text-white">{formatMoney(coin.price, { locale })}</p>
          {coin.change != null && (
            <p className={"inline-flex items-center gap-1 text-sm font-medium " + (up ? "text-brand-mint" : "text-[#ff8a6b]")}>
              <Trend className="h-3.5 w-3.5" aria-hidden="true" />
              {formatPercent(coin.change, { locale, signed: true })}
            </p>
          )}
        </div>
      ) : (
        <p className="mt-3 text-start text-sm text-white/55">{unavailable}</p>
      )}
    </motion.div>
  );
}

// Decorative coins around the headline. Sizes/positions are per breakpoint so
// they frame the copy without covering it. `float-*` classes add a gentle bob.
const FLOATERS = [
  { symbol: "BTC", cls: "start-[3%] top-[2.5%] h-14 w-14 md:start-[5%] md:top-[12%] md:h-36 md:w-36 lg:h-44 lg:w-44", rot: -14, f: "float-a", show: "" },
  { symbol: "ETH", cls: "end-[4%] top-[3%] h-12 w-12 md:end-[6%] md:top-[16%] md:h-32 md:w-32 lg:h-36 lg:w-36", rot: 12, f: "float-b", show: "" },
  { symbol: "SOL", cls: "start-[9%] bottom-[16%] h-20 w-20 lg:h-24 lg:w-24", rot: 10, f: "float-c", show: "hidden md:block" },
  { symbol: "USDT", cls: "end-[10%] bottom-[20%] h-20 w-20 lg:h-28 lg:w-28", rot: -8, f: "float-a", show: "hidden md:block" },
  { symbol: "USDC", cls: "start-[26%] top-[5%] h-12 w-12 opacity-60 blur-[1.5px]", rot: 18, f: "float-b", show: "hidden lg:block" },
  { symbol: "BTC", cls: "end-[24%] top-[4%] h-10 w-10 opacity-50 blur-[2px]", rot: -20, f: "float-c", show: "hidden lg:block" },
  { symbol: "ETH", cls: "start-[22%] bottom-[6%] h-10 w-10 opacity-40 blur-[2px]", rot: 25, f: "float-a", show: "hidden lg:block" },
];

function FloatingCoins() {
  const reduce = useReducedMotion();
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
      {FLOATERS.map((c, i) => (
        <motion.div
          key={i}
          initial={reduce ? false : { opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.9, delay: 0.3 + i * 0.08, ease }}
          className={"absolute " + c.cls + " " + c.show}
        >
          <div className={c.f + " h-full w-full"} style={{ rotate: `${c.rot}deg` }}>
            <CryptoCoin symbol={c.symbol} className="h-full w-full drop-shadow-[0_18px_30px_rgb(0_0_0/0.55)]" />
          </div>
        </motion.div>
      ))}
    </div>
  );
}

/**
 * Night-sky hero with a green aurora. Account creation lives on /register —
 * this section only links to it.
 */
export function Hero({ coins = [] }) {
  const t = useTranslations("home.hero");
  const tt = useTranslations("home.ticker");
  const reduce = useReducedMotion();

  const enter = (i) =>
    reduce
      ? {}
      : {
          initial: { opacity: 0, y: 18 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.7, delay: 0.15 + i * 0.09, ease },
        };

  const [left, right] = coins;

  return (
    <section className="dark relative isolate overflow-hidden bg-brand-night text-white">
      {/* aurora: layered blurred glows drifting slowly */}
      <div aria-hidden="true" className="absolute inset-0 -z-20">
        <div className="aurora-a absolute -top-[20%] start-[8%] h-[70%] w-[55%] rounded-full bg-[radial-gradient(closest-side,rgb(46_204_140/0.42),transparent)] blur-3xl" />
        <div className="aurora-b absolute -top-[10%] end-[2%] h-[60%] w-[45%] rounded-full bg-[radial-gradient(closest-side,rgb(30_150_110/0.38),transparent)] blur-3xl" />
        <div className="absolute -bottom-[35%] start-1/2 h-[70%] w-[120%] -translate-x-1/2 rounded-[50%] bg-[radial-gradient(closest-side,rgb(40_190_130/0.45),transparent)] blur-2xl rtl:translate-x-1/2" />
      </div>
      <Starfield className="absolute inset-0 -z-10 h-full w-full" />
      <FloatingCoins />

      <div className="container-page relative flex min-h-[calc(100svh-7rem)] flex-col items-center justify-center pb-20 pt-28 text-center sm:py-24">
        <motion.h1
          {...enter(0)}
          className="max-w-[14ch] font-display text-[3rem] font-bold leading-[0.98] tracking-[-0.045em] sm:text-7xl lg:text-[6.25rem]"
        >
          {t("headline")}
        </motion.h1>
        <motion.p {...enter(1)} className="mt-6 max-w-[54ch] text-base text-white/80 sm:text-xl">
          {t("body")}
        </motion.p>
        <motion.div {...enter(2)} className="mt-10 flex flex-wrap justify-center gap-4">
          <Link href="/register" className={buttonClasses({ variant: "orange", size: "lg", className: "h-14 px-8 text-lg" })}>
            {t("primary")}
            <ArrowUpRight className="h-5 w-5 rtl:-scale-x-100" aria-hidden="true" />
          </Link>
          <Link href="/#how" className={buttonClasses({ variant: "mint", size: "lg", className: "h-14 px-8 text-lg" })}>
            {t("learnMore")}
          </Link>
        </motion.div>
        <motion.p {...enter(3)} className="mt-8 flex max-w-[54ch] items-start justify-center gap-2 text-sm text-white/55">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          {t("note")}
        </motion.p>

        {/* Live coin cards: float at the sides on wide screens, stack below on small ones */}
        {(left || right) && (
          <div className="mt-12 grid w-full max-w-xl gap-3 sm:grid-cols-2 2xl:pointer-events-none 2xl:absolute 2xl:inset-x-0 2xl:top-[58%] 2xl:mt-0 2xl:flex 2xl:max-w-none 2xl:-translate-y-1/2 2xl:justify-between 2xl:px-10">
            {left && <CoinCard coin={left} unavailable={tt("unavailable")} side="start" delay={0.7} />}
            {right && <CoinCard coin={right} unavailable={tt("unavailable")} side="end" delay={0.85} />}
          </div>
        )}
      </div>
    </section>
  );
}
