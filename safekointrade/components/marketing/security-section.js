import { getTranslations } from "next-intl/server";
import { Database, Fingerprint, ScrollText, UsersRound } from "lucide-react";
import { SectionHeading } from "./section-heading";
import { RevealGroup, RevealItem } from "@/components/animations/reveal";

// Ordered from the data layer outward — the layers a request passes through.
const layers = [
  { key: "rls", icon: Database },
  { key: "mfa", icon: Fingerprint },
  { key: "review", icon: UsersRound },
  { key: "audit", icon: ScrollText },
];

export async function SecuritySection() {
  const t = await getTranslations("home.security");
  return (
    <section aria-labelledby="security-title" className="bg-[#0c1a22] py-16 text-[#e8eeec] sm:py-24 dark:bg-surface">
      <div className="container-page grid gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:gap-20">
        <SectionHeading id="security-title" title={t("title")} body={t("body")} className="[&_p]:text-[#a7b7b9]" />
        <RevealGroup as="ul" className="relative space-y-3">
          {layers.map(({ key, icon: Icon }, i) => (
            <RevealItem
              as="li"
              key={key}
              className="flex gap-4 rounded-lg border border-[#22404b] bg-[#11232c] p-5 dark:border-line dark:bg-bg"
              style={{ marginInlineStart: `${i * 0.75}rem` }}
            >
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-md border border-[#6b5631] bg-[#2a2a1f] text-[#d2ad68]">
                <Icon className="h-5 w-5" strokeWidth={1.8} aria-hidden="true" />
              </span>
              <div>
                <h3 className="text-base font-semibold">{t(`items.${key}.title`)}</h3>
                <p className="mt-1 text-sm text-[#a7b7b9]">{t(`items.${key}.body`)}</p>
              </div>
            </RevealItem>
          ))}
        </RevealGroup>
      </div>
    </section>
  );
}
