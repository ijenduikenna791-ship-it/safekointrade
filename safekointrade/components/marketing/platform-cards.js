import { getTranslations } from "next-intl/server";
import { CalendarClock, LayoutDashboard, LifeBuoy, ShieldCheck } from "lucide-react";
import { RevealGroup, RevealItem } from "@/components/animations/reveal";
import { SectionHeading } from "./section-heading";
import { DeviceMockup } from "./device-mockup";

/* Small abstract screens for the top of each card (decorative, no figures). */
function MiniScreen({ kind, status }) {
  if (kind === "dashboard")
    return (
      <div className="flex h-full items-end gap-2 px-6 pb-6">
        {[38, 52, 46, 64, 58, 76, 70, 88].map((h, i) => (
          <span key={i} className="flex-1 rounded-t-sm bg-brand-mint/80" style={{ height: `${h}%`, opacity: 0.45 + i * 0.07 }} />
        ))}
      </div>
    );
  if (kind === "plans")
    return (
      <div className="flex h-full flex-col justify-center gap-3 px-6">
        {["30", "90", "180"].map((d, i) => (
          <div key={d} className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/5 px-3 py-2.5">
            <span className="font-display text-xl font-bold text-white">{d}</span>
            <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
              <span className="block h-full rounded-full bg-brand-mint" style={{ width: `${30 + i * 30}%` }} />
            </span>
          </div>
        ))}
      </div>
    );
  if (kind === "money")
    return (
      <div className="flex h-full flex-col justify-center gap-3 px-6">
        {[
          [status.pending, "bg-[#f2b45a]/15 text-[#f2c27a]"],
          [status.approved, "bg-brand-mint/15 text-brand-mint"],
          [status.completed, "bg-brand-mint/15 text-brand-mint"],
        ].map(([label, chip], i) => (
          <div key={i} className="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-white/5 px-3 py-2.5">
            <span className="h-2 w-20 rounded-full bg-white/20" />
            <span className={"rounded-full px-2 py-0.5 text-xs font-medium " + chip}>{label}</span>
          </div>
        ))}
      </div>
    );
  return (
    <div className="flex h-full flex-col justify-center gap-3 px-6">
      <span className="h-9 w-3/4 rounded-2xl rounded-es-sm bg-white/10" />
      <span className="ms-auto h-9 w-2/3 rounded-2xl rounded-ee-sm bg-brand-mint/70" />
      <span className="h-9 w-1/2 rounded-2xl rounded-es-sm bg-white/10" />
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

  return (
    <section id="services" aria-labelledby="platform-title" className="container-page scroll-mt-24 py-20 sm:py-28">
      <SectionHeading id="platform-title" title={t("title")} body={t("body")} align="center" />

      <div className="mt-14">
        <DeviceMockup />
      </div>

      <RevealGroup className="mt-16 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map(({ key, icon: Icon }) => (
          <RevealItem key={key} className="group flex flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-sm">
            <div className="dark relative h-52 bg-[linear-gradient(160deg,#0b2a24_0%,#050f0d_100%)]" aria-hidden="true">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_0%,rgb(60_227_163/0.25),transparent_60%)]" />
              <div className="relative h-full">
                <MiniScreen kind={key} status={status} />
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
