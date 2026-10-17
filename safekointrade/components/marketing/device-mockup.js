"use client";

import { useLocale, useTranslations } from "next-intl";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowDownToLine, CalendarClock, CircleCheck, FlaskConical, PiggyBank } from "lucide-react";
import { LogoMark } from "@/components/ui/logo";
import { formatMoney } from "@/lib/utils/format";

// Illustration only: fixed sample figures, labelled as such on screen.
const SAMPLE = { available: 1250, invested: 4200, pending: 500 };
const SERIES = [40, 42, 41, 45, 44, 48, 47, 52, 51, 55, 54, 53, 58, 60, 59, 63, 62, 66, 65, 70, 69, 72, 71, 75, 74, 78];
const DAY = 47;
const TOTAL = 90;
const ease = [0.25, 1, 0.5, 1];

function sparkPath(values, width, height, pad = 4) {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const x = (i) => (i / (values.length - 1)) * width;
  const y = (v) => pad + (1 - (v - min) / (max - min)) * (height - pad * 2);
  const line = values.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  return { line, area: `${line} L${width},${height} L0,${height} Z` };
}

export function DeviceMockup() {
  const t = useTranslations("dashboard.overview");
  const tl = useTranslations("home.lifecycle");
  const tc = useTranslations("common");
  const locale = useLocale();
  const reduce = useReducedMotion();
  const { line, area } = sparkPath(SERIES, 300, 90);

  const steps = [
    { key: "deposit", icon: ArrowDownToLine, state: "done" },
    { key: "opened", icon: PiggyBank, state: "done" },
    { key: "running", icon: CalendarClock, state: "current" },
    { key: "matures", icon: CircleCheck, state: "next" },
  ];

  return (
    <motion.figure
      initial={reduce ? false : { opacity: 0, y: 32 }}
      viewport={{ once: true, margin: "0px 0px -10% 0px" }}
        whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, delay: 0.45, ease }}
      className="relative mx-auto w-full max-w-4xl pb-10 text-start sm:pb-14"
      aria-label={tl("label")}
    >
      {/* Desktop */}
      <div className="rounded-[1.1rem] border border-line-strong bg-[#0b090a] p-2 shadow-[0_40px_80px_-30px_rgb(0_0_0/0.7)] sm:p-3">
        <div className="overflow-hidden rounded-[0.6rem] border border-line bg-bg">
          {/* window bar */}
          <div className="flex items-center justify-between border-b border-line bg-surface px-3 py-2 sm:px-4">
            <div className="flex items-center gap-2">
              <LogoMark className="h-4 w-4" />
              <span className="h-1.5 w-16 rounded-full bg-surface-3" />
            </div>
            <span className="inline-flex items-center gap-1 rounded-full border border-brass-line bg-brass-soft px-2 py-0.5 text-[0.65rem] font-medium text-brass sm:text-xs">
              <FlaskConical className="h-3 w-3" aria-hidden="true" />
              {tc("sampleData")}
            </span>
          </div>

          <div className="grid grid-cols-[2.5rem_1fr] sm:grid-cols-[3.25rem_1fr]">
            {/* rail */}
            <div className="flex flex-col items-center gap-3 border-e border-line bg-surface py-4" aria-hidden="true">
              {[0, 1, 2, 3, 4].map((i) => (
                <span key={i} className={"h-2 w-2 rounded-full sm:h-2.5 sm:w-2.5 " + (i === 0 ? "bg-gain" : "bg-surface-3")} />
              ))}
            </div>

            <div className="p-3 sm:p-5">
              <dl className="grid grid-cols-3 gap-2 sm:gap-3">
                {["available", "invested", "pending"].map((k) => (
                  <div key={k} className="rounded-md border border-line bg-surface px-2 py-2 sm:px-3 sm:py-3">
                    <dt className="truncate text-[0.7rem] text-ink-subtle sm:text-sm">{t(k)}</dt>
                    <dd className="tabular mt-0.5 truncate text-xs font-semibold sm:text-base">{formatMoney(SAMPLE[k], { locale })}</dd>
                  </div>
                ))}
              </dl>

              <div className="mt-3 rounded-md border border-line bg-surface p-3 sm:mt-4 sm:p-4">
                <p className="text-xs text-ink-subtle sm:text-sm">{t("historyTitle")}</p>
                <svg viewBox="0 0 300 90" preserveAspectRatio="none" className="mt-2 h-20 w-full sm:h-28" aria-hidden="true">
                  <defs>
                    <linearGradient id="mock-fill" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="0%" stopColor="var(--gain)" stopOpacity="0.28" />
                      <stop offset="100%" stopColor="var(--gain)" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  {[22, 45, 68].map((y) => (
                    <line key={y} x1="0" x2="300" y1={y} y2={y} stroke="var(--chart-grid)" strokeWidth="0.6" />
                  ))}
                  <path d={area} fill="url(#mock-fill)" />
                  <motion.path
                    d={line}
                    fill="none"
                    stroke="var(--gain)"
                    strokeWidth="2"
                    strokeLinejoin="round"
                    strokeLinecap="round"
                    vectorEffect="non-scaling-stroke"
                    initial={reduce ? false : { pathLength: 0 }}
                    viewport={{ once: true, margin: "0px 0px -10% 0px" }}
                    whileInView={{ pathLength: 1 }}
                    transition={{ duration: 1.6, delay: 0.9, ease }}
                  />
                </svg>
              </div>

              <div className="mt-3 hidden gap-3 sm:grid sm:grid-cols-2">
                {[
                  { plan: "Growth", amount: 4200, p: DAY / TOTAL },
                  { plan: "Starter", amount: 600, p: 1 },
                ].map((r) => (
                  <div key={r.plan} className="rounded-md border border-line bg-surface px-3 py-2.5">
                    <div className="flex items-baseline justify-between text-sm">
                      <span className="font-medium">{r.plan}</span>
                      <span className="tabular text-ink-muted">{formatMoney(r.amount, { locale })}</span>
                    </div>
                    <div className="mt-2 h-1 overflow-hidden rounded-full bg-surface-3">
                      <div className={"h-full rounded-full " + (r.p >= 1 ? "bg-gain" : "bg-brass")} style={{ width: `${r.p * 100}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* stand */}
      <div aria-hidden="true" className="mx-auto h-5 w-24 bg-gradient-to-b from-line-strong to-line sm:h-8 sm:w-36" />
      <div aria-hidden="true" className="mx-auto h-1.5 w-40 rounded-full bg-line-strong sm:w-56" />

      {/* Phone */}
      <motion.div
        initial={reduce ? false : { opacity: 0, y: 24 }}
        viewport={{ once: true, margin: "0px 0px -10% 0px" }}
      whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 0.8, ease }}
        className="absolute bottom-0 end-1 hidden w-[32%] max-w-[11.5rem] sm:block rounded-[1.4rem] border border-line-strong bg-[#060c1a] p-1.5 shadow-[0_30px_60px_-20px_rgb(0_0_0/0.8)] sm:end-4 sm:p-2"
      >
        <div className="overflow-hidden rounded-[1.05rem] border border-line bg-surface px-3 pb-4 pt-3 sm:px-4">
          <div aria-hidden="true" className="mx-auto mb-3 h-1 w-10 rounded-full bg-surface-3" />
          <p className="truncate text-[0.6rem] text-ink-subtle sm:text-xs">{tl("label")}</p>
          <p className="mt-0.5 truncate font-display text-xs font-semibold sm:text-sm">{tl("plan")}</p>
          <p className="mt-1 font-display text-sm font-semibold sm:text-xl">{formatMoney(4200, { locale })}</p>
          <div className="mt-2 h-1 overflow-hidden rounded-full bg-surface-3" aria-hidden="true">
            <div className="h-full rounded-full bg-brass" style={{ width: `${(DAY / TOTAL) * 100}%` }} />
          </div>
          <p className="tabular mt-1 text-[0.6rem] text-ink-muted sm:text-xs">{tl("day", { day: DAY, total: TOTAL })}</p>
          <ol className="mt-2 hidden space-y-1.5 sm:block">
            {steps.map(({ key, icon: Icon, state }) => (
              <li key={key} className="flex items-center gap-2 text-xs">
                <Icon
                  className={"h-3.5 w-3.5 shrink-0 " + (state === "done" ? "text-gain" : state === "current" ? "text-brass" : "text-ink-subtle")}
                  aria-hidden="true"
                />
                <span className={"truncate " + (state === "next" ? "text-ink-subtle" : "text-ink")}>{tl(`steps.${key}`)}</span>
              </li>
            ))}
          </ol>
        </div>
      </motion.div>
      <figcaption className="sr-only">{tl("caption")}</figcaption>
    </motion.figure>
  );
}
