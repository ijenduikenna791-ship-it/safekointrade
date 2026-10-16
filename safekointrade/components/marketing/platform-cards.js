import { getTranslations } from "next-intl/server";
import { CalendarClock, Check, LayoutDashboard, LifeBuoy, Lock, ShieldCheck } from "lucide-react";
import { RevealGroup, RevealItem } from "@/components/animations/reveal";
import { SectionHeading } from "./section-heading";
import { DeviceMockup } from "./device-mockup";

/*
 * A small slice of the real product at the top of each card — decorative
 * (aria-hidden) and labelled with real UI words, never figures that look like
 * someone's balance.
 */
function MiniScreen({ kind, m, status }) {
  if (kind === "dashboard") {
    // Balance split ring: proportions only, no amounts.
    const segs = [
      { c: "#4f8cff", v: 0.52, label: m.available },
      { c: "#34d399", v: 0.33, label: m.invested },
      { c: "#fb923c", v: 0.15, label: m.pending },
    ];
    const r = 38, C = 2 * Math.PI * r;
    let acc = 0;
    return (
      <div className="flex h-full items-center gap-4 px-5">
        <svg viewBox="0 0 100 100" className="h-28 w-28 shrink-0 -rotate-90 lg:h-24 lg:w-24 xl:h-28 xl:w-28">
          <circle cx="50" cy="50" r={r} fill="none" stroke="rgb(255 255 255 / 0.08)" strokeWidth="12" />
          {segs.map((sg) => {
            const len = sg.v * C - 3;
            const el = <circle key={sg.label} cx="50" cy="50" r={r} fill="none" stroke={sg.c} strokeWidth="12" strokeDasharray={`${len} ${C}`} strokeDashoffset={-acc * C} strokeLinecap="round" />;
            acc += sg.v;
            return el;
          })}
        </svg>
        <ul className="min-w-0 space-y-2.5 text-[13px] leading-tight">
          {segs.map((sg) => (
            <li key={sg.label} className="flex items-center gap-2 text-white/85">
              <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: sg.c }} />
              <span>{sg.label}</span>
            </li>
          ))}
        </ul>
      </div>
    );
  }
  if (kind === "plans") {
    // A month grid with the locked term highlighted.
    return (
      <div className="mx-auto flex h-full w-full max-w-[17rem] flex-col justify-center px-6">
        <div className="mb-3 flex items-center justify-between">
          <span className="text-xs font-medium text-white/60">{m.term}</span>
          <span className="inline-flex items-center gap-1 rounded-full bg-brand-mint/15 px-2 py-0.5 text-[11px] font-semibold text-brand-mint">
            <Lock className="h-3 w-3" />
            {m.locked}
          </span>
        </div>
        <div className="grid grid-cols-7 gap-1.5">
          {Array.from({ length: 28 }, (_, i) => {
            const start = i === 3, end = i === 24, inTerm = i > 3 && i < 24;
            return (
              <span
                key={i}
                className={
                  "grid aspect-square place-items-center rounded-md text-[10px] font-semibold " +
                  (start || end ? "bg-brand-mint text-brand-teal" : inTerm ? "bg-brand-mint/35" : "bg-white/[0.06]")
                }
              >
                {start ? "1" : end ? "90" : ""}
              </span>
            );
          })}
        </div>
      </div>
    );
  }
  if (kind === "money") {
    // One deposit moving through review.
    const steps = [
      { label: m.requested, done: true },
      { label: status.approved, done: true },
      { label: status.completed, done: false, active: true },
    ];
    return (
      <div className="flex h-full flex-col justify-center px-6">
        <div className="mb-4 flex items-center justify-between rounded-lg border border-white/10 bg-white/5 px-3 py-2">
          <span className="font-mono text-xs text-white/80">DEP-7K2M9Q</span>
          <span className="rounded-full bg-brand-mint/15 px-2 py-0.5 text-[11px] font-medium text-brand-mint">{status.approved}</span>
        </div>
        <ol className="relative space-y-3 ps-1">
          <span className="absolute start-[0.6rem] top-2 h-[calc(100%-1rem)] w-px bg-white/15" />
          {steps.map((st) => (
            <li key={st.label} className="relative flex items-center gap-3 text-sm">
              <span
                className={
                  "relative z-10 grid h-5 w-5 place-items-center rounded-full " +
                  (st.done ? "bg-brand-mint text-brand-teal" : "border-2 border-brand-mint bg-[#050914]")
                }
              >
                {st.done ? <Check className="h-3 w-3" strokeWidth={3} /> : <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-brand-mint motion-reduce:animate-none" />}
              </span>
              <span className={st.done ? "text-white/85" : "font-medium text-white"}>{st.label}</span>
            </li>
          ))}
        </ol>
      </div>
    );
  }
  // support: a short, real-sounding exchange
  return (
    <div className="flex h-full flex-col justify-center gap-2.5 px-5">
      <p className="max-w-[85%] rounded-2xl rounded-es-sm bg-white/10 px-3 py-2 text-[13px] leading-snug text-white/90">{m.userMsg}</p>
      <div className="ms-auto max-w-[88%]">
        <p className="mb-1 flex items-center justify-end gap-1.5 text-[10px] font-medium text-brand-mint">
          <span className="grid h-4 w-4 place-items-center rounded-full bg-brand-mint text-[8px] font-bold text-brand-teal">S</span>
          {m.staff}
        </p>
        <p className="rounded-2xl rounded-ee-sm bg-brand-mint px-3 py-2 text-[13px] font-medium leading-snug text-brand-teal">{m.staffMsg}</p>
      </div>
    </div>
  );
}

const cards = [
  { key: "dashboard", icon: LayoutDashboard },
  { key: "plans", icon: CalendarClock },
  { key: "money", icon: ShieldCheck },
  { key: "support", icon: LifeBuoy },
];

export async function PlatformCards() {
  const t = await getTranslations("home.platform");
  const ts = await getTranslations("common.status");
  const status = { pending: ts("pending"), approved: ts("approved"), completed: ts("completed") };
  const td = await getTranslations("dashboard");
  const mini = {
    available: td("overview.available"),
    invested: td("overview.invested"),
    pending: td("overview.pending"),
    requested: td("deposits.requested"),
    staff: td("support.staff"),
    term: t("mini.term"),
    locked: t("mini.locked"),
    userMsg: t("mini.userMsg"),
    staffMsg: t("mini.staffMsg"),
  };

  return (
    <section id="services" aria-labelledby="platform-title" className="container-page scroll-mt-24 py-20 sm:py-28">
      <SectionHeading id="platform-title" title={t("title")} body={t("body")} align="center" />

      <div className="mt-14">
        <DeviceMockup />
      </div>

      <RevealGroup className="mt-16 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map(({ key, icon: Icon }) => (
          <RevealItem key={key} className="group flex flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-sm">
            <div className="dark relative h-52 bg-[linear-gradient(160deg,#0f1a33_0%,#050914_100%)]" aria-hidden="true">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_0%,rgb(79_140_255/0.25),transparent_60%)]" />
              <div className="relative h-full">
                <MiniScreen kind={key} m={mini} status={status} />
              </div>
            </div>
            <div className="flex flex-1 flex-col p-6">
              <span className="grid h-10 w-10 place-items-center rounded-lg bg-brand-mint/15 text-brand-mint-ink">
                <Icon className="h-5 w-5" aria-hidden="true" />
              </span>
              <h3 className="mt-4 font-display text-xl font-bold tracking-tight">{t(`items.${key}.title`)}</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-muted">{t(`items.${key}.body`)}</p>
            </div>
          </RevealItem>
        ))}
      </RevealGroup>
    </section>
  );
}
