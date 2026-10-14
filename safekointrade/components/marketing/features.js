import { getTranslations } from "next-intl/server";
import { Languages, LifeBuoy, ScrollText, ShieldCheck, CalendarClock, UserCheck } from "lucide-react";
import { SectionHeading } from "./section-heading";
import { RevealGroup, RevealItem } from "@/components/animations/reveal";

const items = [
  { key: "ledger", icon: ScrollText },
  { key: "terms", icon: CalendarClock },
  { key: "review", icon: UserCheck },
  { key: "security", icon: ShieldCheck },
  { key: "languages", icon: Languages },
  { key: "support", icon: LifeBuoy },
];

export async function Features() {
  const t = await getTranslations("home.features");
  return (
    <section aria-labelledby="features-title" className="container-page py-16 sm:py-24">
      <div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20">
        <SectionHeading id="features-title" title={t("title")} body={t("body")} className="lg:sticky lg:top-28 lg:self-start" />
        <RevealGroup className="grid gap-x-10 gap-y-10 sm:grid-cols-2">
          {items.map(({ key, icon: Icon }) => (
            <RevealItem key={key} className="border-t border-line pt-6">
              <Icon className="h-5 w-5 text-brass" strokeWidth={1.8} aria-hidden="true" />
              <h3 className="mt-4 text-lg font-semibold">{t(`items.${key}.title`)}</h3>
              <p className="mt-2 text-ink-muted">{t(`items.${key}.body`)}</p>
            </RevealItem>
          ))}
        </RevealGroup>
      </div>
    </section>
  );
}
