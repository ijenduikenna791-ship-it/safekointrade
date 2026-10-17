import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { CalendarClock, LayoutDashboard, LifeBuoy, ShieldCheck } from "lucide-react";
import { RevealGroup, RevealItem } from "@/components/animations/reveal";
import { SectionHeading } from "./section-heading";
import { images } from "@/lib/config/images";

const cards = [
  { key: "dashboard", icon: LayoutDashboard, image: images.hero },
  { key: "plans", icon: CalendarClock, image: images.howItWorks },
  { key: "money", icon: ShieldCheck, image: images.aboutReview },
  { key: "support", icon: LifeBuoy, image: images.cta },
];

function PhotoFrame({ image, sizes, className }) {
  return (
    <div className={`relative overflow-hidden bg-[#100b0d] ${className}`}>
      <Image
        src={image.src}
        alt=""
        fill
        sizes={sizes}
        quality={75}
        className="object-cover transition-transform duration-700 group-hover:scale-[1.035] motion-reduce:transition-none"
      />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#100b0d]/90 via-[#100b0d]/10 to-transparent" />
    </div>
  );
}

export async function PlatformCards() {
  const t = await getTranslations("home.platform");

  return (
    <section id="services" aria-labelledby="platform-title" className="container-page scroll-mt-24 py-16 sm:py-24">
      <SectionHeading id="platform-title" title={t("title")} body={t("body")} align="center" />

      <figure className="group relative mx-auto mt-10 aspect-[16/10] w-full max-w-6xl overflow-hidden rounded-2xl border border-[#56373f] bg-[#100b0d] shadow-[0_30px_80px_-36px_rgb(0_0_0/0.8)] sm:mt-12 sm:aspect-[16/8] sm:rounded-3xl">
        <Image
          src={images.aboutWork.src}
          alt=""
          fill
          sizes="(min-width: 1024px) 76rem, 100vw"
          quality={75}
          className="object-cover transition-transform duration-700 group-hover:scale-[1.02] motion-reduce:transition-none"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#100b0d]/80 via-[#100b0d]/30 to-[#100b0d]/5" />
      </figure>

      <RevealGroup className="mt-8 grid gap-4 sm:grid-cols-2 lg:mt-10 lg:grid-cols-4">
        {cards.map(({ key, icon: Icon, image }) => (
          <RevealItem key={key} className="group flex flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-sm transition duration-300 hover:-translate-y-1 hover:border-[#8b4655]">
            <PhotoFrame
              image={image}
              sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
              className="h-44 sm:h-48"
            />
            <div className="flex flex-1 flex-col p-5 sm:p-6">
              <span className="grid h-10 w-10 place-items-center rounded-lg bg-brand-mint/15 text-brand-mint-ink">
                <Icon className="h-5 w-5" aria-hidden="true" />
              </span>
              <h3 className="mt-4 font-display text-xl font-bold tracking-tight">{t(`items.${key}.title`)}</h3>
              <p className="mt-2 text-base leading-relaxed text-ink-muted">{t(`items.${key}.body`)}</p>
            </div>
          </RevealItem>
        ))}
      </RevealGroup>
    </section>
  );
}
