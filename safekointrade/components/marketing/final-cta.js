import { getTranslations } from "next-intl/server";
import { ArrowUpRight } from "lucide-react";
import { Link } from "@/lib/i18n/navigation";
import { buttonClasses } from "@/components/ui/button";
import { CryptoCoin } from "@/components/ui/crypto-coin";

/** Full-width brand-green band. */
export async function FinalCta() {
  const t = await getTranslations("home.cta");
  return (
    <section aria-labelledby="cta-title" className="relative isolate overflow-hidden bg-brand-mint text-brand-teal">
      <div aria-hidden="true" className="pointer-events-none absolute inset-y-0 end-0 -z-10 hidden w-[30rem] lg:block">
        <CryptoCoin symbol="BTC" className="absolute end-[38%] top-[-18%] h-48 w-48 rotate-[-14deg] opacity-90 drop-shadow-[0_20px_30px_rgb(20_64_59/0.35)]" />
        <CryptoCoin symbol="ETH" className="absolute end-[6%] top-[22%] h-36 w-36 rotate-[10deg] opacity-90 drop-shadow-[0_20px_30px_rgb(20_64_59/0.35)]" />
        <CryptoCoin symbol="USDT" className="absolute bottom-[-14%] end-[30%] h-28 w-28 rotate-[8deg] opacity-80 drop-shadow-[0_20px_30px_rgb(20_64_59/0.35)]" />
      </div>
      <div className="container-page flex flex-col items-start gap-8 py-16 sm:py-20">
        <div>
          <h2 id="cta-title" className="max-w-[20ch] font-display text-4xl font-bold tracking-[-0.035em] sm:text-5xl">{t("title")}</h2>
          <p className="mt-4 max-w-[52ch] text-lg text-brand-teal/80">{t("body")}</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link href="/register" className={buttonClasses({ variant: "orange", size: "lg", className: "h-14 px-8 text-lg" })}>
            {t("primary")}
            <ArrowUpRight className="h-5 w-5 rtl:-scale-x-100" aria-hidden="true" />
          </Link>
          <Link href="/legal/risk" className={buttonClasses({ variant: "teal", size: "lg", className: "h-14 px-8 text-lg" })}>
            {t("secondary")}
          </Link>
        </div>
      </div>
    </section>
  );
}
