"use client";

import { useLocale, useTranslations } from "next-intl";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowUpRight, Check, ShieldCheck, TrendingDown, TrendingUp } from "lucide-react";
import { Link } from "@/lib/i18n/navigation";
import { buttonClasses } from "@/components/ui/button";
import { formatMoney, formatPercent } from "@/lib/utils/format";
import { CryptoCoin } from "@/components/ui/crypto-coin";

const ease = [0.25, 1, 0.5, 1];

/** Live price card. With no data it says so — never a made-up number. */
function CoinCard({ coin, unavailable, delay }) {
  const locale = useLocale();
  const reduce = useReducedMotion();
  const up = (coin.change ?? 0) >= 0;
  const Trend = up ? TrendingUp : TrendingDown;
  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, delay, ease }}
      className="hero-coin-card w-full rounded-xl border border-white/10 bg-white/[0.06] px-4 py-3 backdrop-blur-xl sm:w-56"
    >
      <div className="flex items-center gap-3">
        <CryptoCoin symbol={coin.symbol} className="h-9 w-9 shrink-0 drop-shadow-[0_6px_14px_rgb(0_0_0/0.45)]" />
        <div className="min-w-0 text-start">
          <p className="font-display text-base font-semibold leading-tight text-white">{coin.name}</p>
          <p className="text-xs text-white/75">{coin.symbol} / USD</p>
        </div>
      </div>
      {coin.price != null ? (
        <div className="mt-2 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5">
          <p className="font-display text-base font-semibold text-white sm:text-lg">{formatMoney(coin.price, { locale })}</p>
          {coin.change != null && (
            <p className={"inline-flex items-center gap-1 text-xs font-medium " + (up ? "text-[#dbb6bd]" : "text-[#ff9a8d]")}>
              <Trend className="h-3.5 w-3.5" aria-hidden="true" />
              {formatPercent(coin.change, { locale, signed: true })}
            </p>
          )}
        </div>
      ) : (
        <p className="mt-2 max-w-[20ch] text-start text-xs text-white/75">{unavailable}</p>
      )}
    </motion.div>
  );
}

/** Premium editorial hero with a lightweight, CSS-rendered metallic sculpture. */
export function Hero({ coins = [] }) {
  const t = useTranslations("home.hero");
  const tt = useTranslations("home.ticker");
  const reduce = useReducedMotion();
  const [left, right] = coins;

  const enter = (i) => reduce ? {} : {
    initial: { opacity: 0, y: 16 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.65, delay: 0.12 + i * 0.09, ease },
  };

  return (
    <section className="hero-crimson relative isolate overflow-hidden text-white">
      <div aria-hidden="true" className="hero-grain absolute inset-0 -z-10" />
      <div aria-hidden="true" className="hero-glow absolute inset-0 -z-10" />
      <div className="container-page hero-layout relative grid items-center gap-8 py-12 sm:py-16 lg:min-h-[43rem] lg:grid-cols-[1fr_1fr] lg:gap-4 lg:py-14">
        <div className="relative z-10 max-w-2xl text-center lg:text-start">
          <motion.h1
            {...enter(0)}
            className="font-display text-[2.7rem] font-semibold leading-[1.02] tracking-[-0.055em] sm:text-6xl lg:text-[4.7rem]"
          >
            {t("headline")}
          </motion.h1>
          <motion.p {...enter(1)} className="mx-auto mt-6 max-w-[54ch] text-base leading-7 text-white/65 sm:text-lg lg:mx-0">
            {t("body")}
          </motion.p>
          <motion.div {...enter(2)} className="mt-8 flex flex-wrap justify-center gap-3 lg:justify-start">
            <Link href="/register" className={buttonClasses({ variant: "orange", size: "lg", className: "h-12 rounded-full px-6 text-sm" })}>
              {t("primary")}
              <ArrowUpRight className="h-4 w-4 rtl:-scale-x-100" aria-hidden="true" />
            </Link>
            <Link href="/register" className={buttonClasses({ variant: "secondary", size: "lg", className: "hero-secondary h-12 rounded-full px-6 text-sm" })}>
              {t("secondary")}
            </Link>
            <Link href="/dashboard/invest" className={buttonClasses({ variant: "secondary", size: "lg", className: "hero-secondary h-12 rounded-full px-6 text-sm" })}>
              {t("invest")}
            </Link>
          </motion.div>
          <motion.ul {...enter(3)} className="mt-7 flex flex-col items-center gap-2 text-[13px] text-white/70 sm:flex-row sm:flex-wrap sm:justify-center sm:gap-x-6 lg:justify-start">
            {["reviewed", "terms", "ledger"].map((k) => (
              <li key={k} className="flex items-center gap-2">
                <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full border border-[#c98491]/30 bg-[#7a2d3c]/30 text-[#e0a0aa]" aria-hidden="true">
                  <Check className="h-3 w-3" strokeWidth={3} />
                </span>
                {t(`points.${k}`)}
              </li>
            ))}
          </motion.ul>
          <motion.p {...enter(4)} className="mx-auto mt-6 flex max-w-[50ch] items-start justify-center gap-2 text-start text-xs leading-5 text-white/70 lg:mx-0 lg:justify-start">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#c98491]" aria-hidden="true" />
            {t("note")}
          </motion.p>
        </div>

        <motion.div
          {...enter(2)}
          className="hero-stage relative mx-auto w-full max-w-[35rem] lg:min-h-[34rem]"
        >
          <div className="hero-orbit hero-orbit-one" aria-hidden="true" />
          <div className="hero-orbit hero-orbit-two" aria-hidden="true" />
          <div className="hero-orbit hero-orbit-three" aria-hidden="true" />
          <div className="hero-sculpture" aria-hidden="true">
            <span className="sculpture-ring sculpture-ring-one" />
            <span className="sculpture-ring sculpture-ring-two" />
            <span className="sculpture-ring sculpture-ring-three" />
            <span className="sculpture-core"><CryptoCoin symbol="BTC" className="h-[68%] w-[68%] drop-shadow-[0_4px_10px_rgb(0_0_0/0.4)]" /></span>
          </div>
          <div className="hero-price-stack">
            {left && <CoinCard coin={left} unavailable={tt("unavailable")} delay={0.65} />}
            {right && <CoinCard coin={right} unavailable={tt("unavailable")} delay={0.78} />}
          </div>
          <span className="hero-stage-caption" aria-hidden="true">{t("liveBadge")}</span>
        </motion.div>
      </div>
    </section>
  );
}




