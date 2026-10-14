import Image from "next/image";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { FlaskConical } from "lucide-react";
import { brand } from "@/lib/config/brand";
import { images } from "@/lib/config/images";
import { Reveal } from "@/components/animations/reveal";

export async function generateMetadata({ params }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "about" });
  return { title: t("title", { brand: brand.name }), description: t("lead") };
}

export default async function AboutPage({ params }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("about");
  const tc = await getTranslations("common");
  const principles = ["records", "people", "plain"];

  return (
    <>
      <section className="container-page pb-12 pt-14 sm:pt-20">
        <h1 className="max-w-[18ch] text-4xl font-semibold tracking-[-0.035em] sm:text-6xl">{t("title", { brand: brand.name })}</h1>
        <p className="mt-6 max-w-[56ch] text-xl text-ink-muted">{t("lead")}</p>
      </section>

      <section className="container-page">
        <figure>
          <div className="relative aspect-[16/9] overflow-hidden rounded-lg border border-line bg-surface-3 sm:aspect-[21/9]">
            <Image src={images.aboutReview.src} alt={t("imageAlt")} fill priority sizes="(min-width: 1216px) 1152px, 100vw" className="object-cover" />
          </div>
          <figcaption className="mt-2 text-xs text-ink-subtle">
            <a href={images.aboutReview.page} target="_blank" rel="noopener noreferrer" className="hover:underline">
              {tc("photoCredit", { name: images.aboutReview.credit })}
            </a>
          </figcaption>
        </figure>
      </section>

      <section aria-labelledby="principles-title" className="container-page py-16 sm:py-24">
        <h2 id="principles-title" className="text-3xl font-semibold tracking-[-0.03em]">{t("principlesTitle")}</h2>
        <div className="mt-10 grid gap-10 md:grid-cols-3">
          {principles.map((k, i) => (
            <Reveal key={k} delay={i * 0.06} className="border-t border-line pt-6">
              <h3 className="text-lg font-semibold">{t(`principles.${k}.title`)}</h3>
              <p className="mt-2 text-ink-muted">{t(`principles.${k}.body`)}</p>
            </Reveal>
          ))}
        </div>
      </section>

      <section aria-labelledby="status-title" className="container-page pb-20">
        <div className="flex flex-col gap-4 rounded-lg border border-brass-line bg-brass-soft p-6 sm:flex-row sm:p-8">
          <FlaskConical className="h-6 w-6 shrink-0 text-brass" aria-hidden="true" />
          <div>
            <h2 id="status-title" className="text-xl font-semibold">{t("statusTitle")}</h2>
            <p className="mt-2 max-w-[70ch] text-ink-muted">{t("statusBody")}</p>
          </div>
        </div>
      </section>
    </>
  );
}
