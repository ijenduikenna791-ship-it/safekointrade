"use client";

import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowUpRight, ShieldCheck, TrendingDown, TrendingUp } from "lucide-react";
import { Link } from "@/lib/i18n/navigation";
import { buttonClasses } from "@/components/ui/button";
import { Starfield } from "@/components/animations/starfield";
import { formatMoney, formatPercent } from "@/lib/utils/format";
import { CryptoCoin } from "@/components/ui/crypto-coin";
import { images } from "@/lib/config/images";

const ease = [0.25, 1, 0.5, 1];

/** Live price card. With no data it says so — never a made-up number. */
function CoinCard({ coin, unavailable, side, delay, className = "" }) {
  const locale = useLocale();
  const reduce = useReducedMotion();
  const up = (coin.change ?? 0) >= 0;
  const Trend = up ? TrendingUp : TrendingDown;
  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, x: side === "start" ? -24 : 24 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.8, delay, ease }}
      className={"rounded-xl border border-white/15 bg-[#050914]/75 px-3 py-2.5 sm:px-4 sm:py-3 shadow-[0_18px_40px_-16px_rgb(0_0_0/0.8)] backdrop-blur-md " + className}
    >
      <div className="flex items-center gap-3">
        <CryptoCoin symbol={coin.symbol} className="h-9 w-9 shrink-0 drop-shadow-[0_6px_14px_rgb(0_0_0/0.45)]" />
        <div className="min-w-0 text-start">
          <p className="font-display text-base font-semibold leading-tight text-white">{coin.name}</p>
          <p className="text-xs text-white/55">{coin.symbol} / USD</p>
        </div>
      </div>
      {coin.price != null ? (
        <div className="mt-2 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5">
          <p className="font-display text-base font-semibold text-white sm:text-lg">{formatMoney(coin.price, { locale })}</p>
          {coin.change != null && (
            <p className={"inline-flex items-center gap-1 text-sm font-medium " + (up ? "text-brand-mint" : "text-[#ff8a6b]")}>
              <Trend className="h-3.5 w-3.5" aria-hidden="true" />
              {formatPercent(coin.change, { locale, signed: true })}
            </p>
          )}
        </div>
      ) : (
        <p className="mt-2 max-w-[16ch] text-start text-xs text-white/55">{unavailable}</p>
      )}
    </motion.div>
  );
}

// Decorative coins around the headline. Sizes/positions are per breakpoint so
// they frame the copy without covering it. `float-*` classes add a gentle bob.
const FLOATERS = [
  { symbol: "BTC", cls: "start-[2%] top-[6%] h-14 w-14 lg:h-20 lg:w-20", rot: -14, f: "float-a", show: "hidden sm:block" },
  { symbol: "ETH", cls: "start-[40%] top-[7%] h-12 w-12 lg:h-14 lg:w-14 opacity-75", rot: 12, f: "float-b", show: "hidden lg:block" },
  { symbol: "SOL", cls: "start-[44%] bottom-[5%] h-10 w-10 opacity-50 blur-[1.5px]", rot: 10, f: "float-c", show: "hidden lg:block" },
  { symbol: "USDT", cls: "end-[40%] top-[5%] h-9 w-9 opacity-40 blur-[2px]", rot: -8, f: "float-a", show: "hidden lg:block" },
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
  const tc = useTranslations("common");
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
        <div className="aurora-a absolute -top-[20%] start-[8%] h-[70%] w-[55%] rounded-full bg-[radial-gradient(closest-side,rgb(79_140_255/0.4),transparent)] blur-3xl" />
        <div className="aurora-b absolute -top-[10%] end-[2%] h-[60%] w-[45%] rounded-full bg-[radial-gradient(closest-side,rgb(139_92_246/0.32),transparent)] blur-3xl" />
        <div className="absolute -bottom-[35%] start-1/2 h-[70%] w-[120%] -translate-x-1/2 rounded-[50%] bg-[radial-gradient(closest-side,rgb(59_123_255/0.42),transparent)] blur-2xl rtl:translate-x-1/2" />
      </div>
      <Starfield className="absolute inset-0 -z-10 h-full w-full" />
      <FloatingCoins />

      <div className="container-page relative grid min-h-[calc(100svh-7rem)] items-center gap-12 pb-20 pt-16 sm:py-20 lg:grid-cols-[1.05fr_1fr] lg:gap-14 lg:py-24">
        <div className="text-center lg:text-start">
          <motion.h1
            {...enter(0)}
            className="mx-auto max-w-[14ch] font-display text-[2.9rem] font-bold leading-[0.98] tracking-[-0.045em] sm:text-7xl lg:mx-0 lg:text-[5.4rem]"
          >
            {t("headline")}
          </motion.h1>
          <motion.p {...enter(1)} className="mx-auto mt-6 max-w-[50ch] text-base text-white/80 sm:text-xl lg:mx-0">
            {t("body")}
          </motion.p>
          <motion.div {...enter(2)} className="mt-10 flex flex-wrap justify-center gap-4 lg:justify-start">
            <Link href="/register" className={buttonClasses({ variant: "orange", size: "lg", className: "h-14 px-8 text-lg" })}>
              {t("primary")}
              <ArrowUpRight className="h-5 w-5 rtl:-scale-x-100" aria-hidden="true" />
            </Link>
            <Link href="/#plans" className={buttonClasses({ variant: "mint", size: "lg", className: "h-14 px-8 text-lg" })}>
              {t("secondary")}
            </Link>
          </motion.div>
          <motion.p {...enter(3)} className="mx-auto mt-8 flex max-w-[50ch] items-start justify-center gap-2 text-sm text-white/55 lg:mx-0 lg:justify-start">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            {t("note")}
          </motion.p>
        </div>

        {/* Photo, framed, with the live price cards resting on it */}
        <motion.figure
          initial={reduce ? false : { opacity: 0, y: 24, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.9, delay: 0.35, ease }}
          className="relative mx-auto w-full max-w-2xl lg:max-w-none"
        >
          <div aria-hidden="true" className="absolute -inset-6 -z-10 rounded-[2.5rem] bg-[radial-gradient(closest-side,rgb(79_140_255/0.3),transparent)] blur-2xl" />
          <div className="relative overflow-hidden rounded-[1.75rem] border border-white/15 shadow-[0_40px_80px_-30px_rgb(0_0_0/0.9)]">
            <Image
              src={images.hero.src}
              width={images.hero.width}
              height={images.hero.height}
              alt={t("imageAlt")}
              priority
              sizes="(min-width: 1024px) 48vw, 92vw"
              className="aspect-[4/5] h-auto w-full object-cover sm:aspect-[4/3] lg:aspect-[5/6] xl:aspect-[1/1]"
            />
            <div aria-hidden="true" className="absolute inset-0 bg-[linear-gradient(180deg,rgb(5_9_20/0.05)_40%,rgb(5_9_20/0.72))]" />
            <span className="absolute start-4 top-4 inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-[#050914]/70 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-white backdrop-blur-md">
              <span className="relative flex h-2 w-2" aria-hidden="true">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-mint opacity-60 motion-reduce:animate-none" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-brand-mint" />
              </span>
              {t("liveBadge")}
            </span>
            {(left || right) && (
              <div className="absolute inset-x-3 bottom-3 grid grid-cols-2 gap-2 sm:inset-x-4 sm:bottom-4 sm:gap-3">
                {left && <CoinCard coin={left} unavailable={tt("unavailable")} side="start" delay={0.8} />}
                {right && <CoinCard coin={right} unavailable={tt("unavailable")} side="end" delay={0.95} />}
              </div>
            )}
          </div>
          <figcaption className="mt-2 text-end text-[11px] text-white/40">
            <a href={images.hero.page} target="_blank" rel="noopener noreferrer" className="hover:text-white/70">{tc("photoCredit", { name: images.hero.credit })}</a>
          </figcaption>
        </motion.figure>
      </div>
    </section>
  );
}
