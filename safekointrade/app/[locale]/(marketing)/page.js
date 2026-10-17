import { getTranslations, setRequestLocale } from "next-intl/server";
import { Testimonials } from "@/components/marketing/testimonials";
import { StartupScreen } from "@/components/animations/startup-screen";
import { Hero } from "@/components/marketing/hero";
import { MarketTicker } from "@/components/marketing/market-ticker";
import { Features } from "@/components/marketing/features";
import { PlansComparison } from "@/components/marketing/plans-comparison";
import { HowItWorks } from "@/components/marketing/how-it-works";
import { MarketAnalytics } from "@/components/marketing/market-analytics";
import { SecuritySection } from "@/components/marketing/security-section";
import { SupportedAssets } from "@/components/marketing/supported-assets";
import { PlatformProof } from "@/components/marketing/platform-proof";
import { Faq } from "@/components/marketing/faq";
import { Newsletter } from "@/components/marketing/newsletter";
import { FinalCta } from "@/components/marketing/final-cta";
import { PlatformCards } from "@/components/marketing/platform-cards";
import { getPublicAssets, getPublicPlans } from "@/lib/database/public-data";
import { getPrices } from "@/lib/market/coingecko";
import { brand } from "@/lib/config/brand";
import EarningNotification from "@/components/EarningNotification";
// Market data and plans refresh at most once a minute.
export const revalidate = 60;

export default async function HomePage({ params }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("startup");
  const [{ plans, isDefault }, assets, prices] = await Promise.all([getPublicPlans(), getPublicAssets(), getPrices(["bitcoin", "ethereum"])]);
  // Hero cards show live prices or an "unavailable" note â€” never placeholder numbers.
  const coins = [
    { id: "bitcoin", symbol: "BTC", name: "Bitcoin" },
    { id: "ethereum", symbol: "ETH", name: "Ethereum" },
  ].map((c) => ({ ...c, price: prices?.[c.id]?.usd ?? null, change: prices?.[c.id]?.usd_24h_change ?? null }));

  return (
    <>
      <StartupScreen loadingLabel={t("loading", { brand: brand.name })} />
      <Hero coins={coins} />
      <MarketTicker />
      <PlatformCards />
      <Features />
      <PlansComparison plans={plans} isDefault={isDefault} />
      <PlatformProof plans={plans} assets={assets} />
      <HowItWorks />
      <MarketAnalytics />
      <SecuritySection />
      <Testimonials />
      <SupportedAssets assets={assets} />
      <Faq />
      <Newsletter />
      <FinalCta />
      <EarningNotification />
    </>
  );
}



