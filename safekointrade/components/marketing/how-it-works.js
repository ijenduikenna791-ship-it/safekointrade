import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { SectionHeading } from "./section-heading";
import { RevealGroup, RevealItem } from "@/components/animations/reveal";
import { images } from "@/lib/config/images";

const steps = ["account", "deposit", "invest", "withdraw"];

export async function HowItWorks() {
  const t = await getTranslations("home.how");
  const tc = await getTranslations("common");
  const img = images.howItWorks;
  return (
    <section id="how" aria-labelledby="how-title" className="container-page py-16 sm:py-24">
      <div className="grid gap-12 lg:grid-cols-[1fr_0.75fr] lg:gap-16">
        <div>
          <SectionHeading id="how-title" title={t("title")} body={t("body")} />
          {/* A real sequence, so numbered markers carry meaning here. */}
          <RevealGroup as="ol" className="mt-10">
            {steps.map((key, i) => (
              <RevealItem key={key} as="li" className="grid grid-cols-[2.75rem_1fr] gap-4 border-t border-line py-6">
                <span className="font-display text-2xl font-semibold text-brass">{i + 1}</span>
                <div>
                  <h3 className="text-lg font-semibold">{t(`steps.${key}.title`)}</h3>
                  <p className="mt-1.5 text-ink-muted">{t(`steps.${key}.body`)}</p>
                </div>
              </RevealItem>
            ))}
          </RevealGroup>
        </div>
        <figure className="relative lg:pt-4">
          <div className="relative aspect-[4/3] overflow-hidden rounded-lg border border-line bg-surface-3 sm:aspect-[16/10] lg:aspect-[3/4]">
            <Image
              src={img.src}
              alt={t("imageAlt")}
              fill
              sizes="(min-width: 1024px) 36vw, 100vw"
              className="object-cover"
            />
          </div>
          <figcaption className="mt-2 text-xs text-ink-subtle">
            <a href={img.page} className="underline-offset-2 hover:underline" rel="noopener noreferrer" target="_blank">{tc("photoCredit", { name: img.credit })}</a>
          </figcaption>
        </figure>
      </div>
    </section>
  );
}
