"use client";

import { useTranslations } from "next-intl";
import {
  ArrowDownToLine,
  ArrowLeftRight,
  ArrowUpFromLine,
  Bell,
  CalendarClock,
  FlaskConical,
  Layers,
  LayoutDashboard,
  LifeBuoy,
  PiggyBank,
  Search,
  Settings,
} from "lucide-react";
import { Logo } from "@/components/ui/logo";
import { CryptoCoin } from "@/components/ui/crypto-coin";

/*
 * A drawn picture of the customer dashboard for the hero. Sample figures only,
 * and it says so with an "Illustration" tag — never presented as real balances.
 * Decorative for screen readers (the section text carries the meaning).
 */

const LINE = [22, 26, 24, 31, 29, 36, 34, 41, 39, 47, 44, 52, 50, 57, 55, 63, 60, 68, 66, 74];
function chartPath(w = 520, h = 150) {
  const max = Math.max(...LINE);
  const min = Math.min(...LINE);
  const x = (i) => (i / (LINE.length - 1)) * w;
  const y = (v) => h - 10 - ((v - min) / (max - min)) * (h - 30);
  const d = LINE.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  return { d, area: `${d} L${w},${h} L0,${h} Z`, last: { x: x(LINE.length - 1), y: y(LINE[LINE.length - 1]) } };
}

export function HeroDashboard() {
  const t = useTranslations("dashboard");
  const tc = useTranslations("common");
  const c = chartPath();
  const nav = [
    { icon: LayoutDashboard, key: "overview", active: true },
    { icon: PiggyBank, key: "invest" },
    { icon: Layers, key: "investments" },
    { icon: ArrowDownToLine, key: "deposits" },
    { icon: ArrowUpFromLine, key: "withdrawals" },
    { icon: ArrowLeftRight, key: "transactions" },
    { icon: LifeBuoy, key: "support" },
    { icon: Settings, key: "settings" },
  ];
  const rows = [
    { sym: "USDT", ref: "DEP-7K2M9Q", amt: "$12,500.00", st: "completed", tone: "text-[#34d399] bg-[#34d399]/10" },
    { sym: "BTC", ref: "DEP-4H8P1Z", amt: "$8,000.00", st: "approved", tone: "text-[#74a5ff] bg-[#4f8cff]/12" },
    { sym: "ETH", ref: "WDR-9QX3LA", amt: "$1,200.00", st: "pending", tone: "text-[#fb923c] bg-[#fb923c]/10" },
    { sym: "USDC", ref: "DEP-2LM8RT", amt: "$3,750.00", st: "completed", tone: "text-[#34d399] bg-[#34d399]/10" },
  ];

  return (
    <div aria-hidden="true" className="relative select-none">
      <div className="overflow-hidden rounded-[1.4rem] border border-white/10 bg-[#070d1c]/95 shadow-[0_50px_100px_-30px_rgb(0_0_0/0.9)] backdrop-blur">
        <div className="flex">
          {/* sidebar */}
          <aside className="hidden w-48 shrink-0 border-e border-white/[0.07] p-4 md:block">
            <div className="origin-left scale-[0.82]"><Logo /></div>
            <ul className="mt-6 space-y-1">
              {nav.map(({ icon: Icon, key, active }) => (
                <li
                  key={key}
                  className={
                    "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[12px] " +
                    (active ? "bg-[linear-gradient(90deg,rgb(79_140_255/0.22),rgb(167_139_250/0.1))] font-medium text-white" : "text-white/55")
                  }
                >
                  <Icon className={"h-3.5 w-3.5 " + (active ? "text-[#74a5ff]" : "")} />
                  {t(`nav.${key}`)}
                </li>
              ))}
            </ul>
          </aside>

          <div className="min-w-0 flex-1 p-4 sm:p-5">
            {/* top bar */}
            <div className="flex items-center gap-3">
              <div className="flex h-8 flex-1 items-center gap-2 rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 text-[11px] text-white/40 sm:max-w-xs">
                <Search className="h-3.5 w-3.5" />
                {tc("search")}
              </div>
              <span className="hidden items-center gap-1 rounded-full border border-[#4f8cff]/30 bg-[#4f8cff]/10 px-2 py-1 text-[10px] font-semibold text-[#74a5ff] sm:inline-flex">
                <FlaskConical className="h-3 w-3" />
                {tc("illustration")}
              </span>
              <Bell className="h-4 w-4 text-white/50" />
              <span className="grid h-7 w-7 place-items-center rounded-full bg-[linear-gradient(135deg,#4f8cff,#a78bfa)] text-[10px] font-bold text-white">JC</span>
            </div>

            <div className="mt-4 grid gap-3 lg:grid-cols-[1.55fr_1fr]">
              {/* portfolio */}
              <div className="rounded-xl border border-white/[0.08] bg-[linear-gradient(180deg,rgb(79_140_255/0.08),transparent)] p-4">
                <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-white/45">{t("overview.total")}</p>
                <div className="mt-1 flex flex-wrap items-baseline gap-2">
                  <p className="font-display text-2xl font-semibold text-white sm:text-[1.7rem]">$48,250.00</p>
                  <span className="rounded-full bg-[#34d399]/12 px-1.5 py-0.5 text-[10px] font-semibold text-[#34d399]">+4.2%</span>
                </div>
                <svg viewBox="0 0 520 150" preserveAspectRatio="none" className="mt-3 h-28 w-full sm:h-32">
                  <defs>
                    <linearGradient id="hd-area" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#4f8cff" stopOpacity="0.4" />
                      <stop offset="100%" stopColor="#4f8cff" stopOpacity="0" />
                    </linearGradient>
                    <linearGradient id="hd-line" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#4f8cff" />
                      <stop offset="100%" stopColor="#a78bfa" />
                    </linearGradient>
                  </defs>
                  {[30, 70, 110].map((y) => <line key={y} x1="0" x2="520" y1={y} y2={y} stroke="rgb(255 255 255 / 0.05)" />)}
                  <path d={c.area} fill="url(#hd-area)" />
                  <path d={c.d} fill="none" stroke="url(#hd-line)" strokeWidth="2.5" vectorEffect="non-scaling-stroke" style={{ filter: "drop-shadow(0 0 6px rgb(79 140 255 / 0.7))" }} />
                  <circle cx={c.last.x - 2} cy={c.last.y} r="5" fill="#a78bfa" stroke="#070d1c" strokeWidth="2.5" />
                </svg>
                <div className="mt-3 grid grid-cols-3 gap-2">
                  {[
                    [t("overview.available"), "$28,050", "#4f8cff"],
                    [t("overview.invested"), "$18,000", "#34d399"],
                    [t("overview.pending"), "$2,200", "#fb923c"],
                  ].map(([k, v, col]) => (
                    <div key={k} className="rounded-lg border border-white/[0.07] bg-white/[0.02] px-2.5 py-2">
                      <p className="flex items-center gap-1.5 truncate text-[10px] text-white/50">
                        <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: col }} />
                        {k}
                      </p>
                      <p className="mt-0.5 text-[13px] font-semibold text-white">{v}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* recent requests */}
              <div className="hidden rounded-xl border border-white/[0.08] bg-white/[0.02] p-4 sm:block">
                <p className="text-[12px] font-semibold text-white">{t("cmd.history.title")}</p>
                <ul className="mt-3 space-y-2.5">
                  {rows.map((r) => (
                    <li key={r.ref} className="flex items-center gap-2.5">
                      <CryptoCoin symbol={r.sym} className="h-7 w-7 shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-mono text-[10.5px] text-white/85">{r.ref}</p>
                        <p className="text-[10px] text-white/45">{r.sym}</p>
                      </div>
                      <div className="text-end">
                        <p className="text-[11.5px] font-semibold text-white">{r.amt}</p>
                        <span className={"rounded-full px-1.5 py-px text-[9px] font-semibold " + r.tone}>{tc(`status.${r.st}`)}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* bottom row */}
            <div className="mt-3 hidden grid-cols-3 gap-3 md:grid">
              <div className="rounded-xl border border-[#a78bfa]/25 bg-[radial-gradient(120%_90%_at_100%_0%,rgb(167_139_250/0.16),transparent_60%)] p-3.5">
                <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-white/45">{t("cmd.stats.plan")}</p>
                <p className="mt-1 text-[15px] font-semibold text-[#a78bfa]">Growth</p>
                <p className="text-[10px] text-white/45">{t("cmd.plans.days", { count: 90 })}</p>
              </div>
              <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-3.5">
                <p className="flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.14em] text-white/45">
                  <CalendarClock className="h-3 w-3" />
                  {t("overview.maturity.title")}
                </p>
                <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-white/10">
                  <div className="h-full w-[52%] rounded-full bg-[linear-gradient(90deg,#4f8cff,#22d3ee)]" />
                </div>
                <p className="mt-1.5 text-[10px] text-white/50">{t("overview.maturity.dayOf", { day: 47, total: 90 })}</p>
              </div>
              <div className="flex items-center gap-3 rounded-xl border border-white/[0.08] bg-white/[0.02] p-3.5">
                <svg viewBox="0 0 36 36" className="h-11 w-11 shrink-0 -rotate-90">
                  <circle cx="18" cy="18" r="14" fill="none" stroke="rgb(255 255 255 / 0.08)" strokeWidth="5" />
                  <circle cx="18" cy="18" r="14" fill="none" stroke="#4f8cff" strokeWidth="5" strokeDasharray="51 88" />
                  <circle cx="18" cy="18" r="14" fill="none" stroke="#34d399" strokeWidth="5" strokeDasharray="30 88" strokeDashoffset="-52" />
                  <circle cx="18" cy="18" r="14" fill="none" stroke="#fb923c" strokeWidth="5" strokeDasharray="5 88" strokeDashoffset="-83" />
                </svg>
                <p className="text-[11px] font-medium leading-tight text-white/80">{t("overview.breakdownTitle")}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
