import { setRequestLocale } from "next-intl/server";
import { SiteHeader } from "@/components/navigation/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { SimulationBanner } from "@/components/layout/simulation-banner";
import { RatesBar } from "@/components/marketing/rates-bar";
import { WhatsAppButton } from "@/components/marketing/whatsapp-button";

export default async function MarketingLayout({ children, params }) {
  const { locale } = await params;
  setRequestLocale(locale);
  return (
    <div className="site-public">
      <SimulationBanner />
      <RatesBar />
      <SiteHeader />
      <main id="main" tabIndex={-1} className="outline-none">
        {children}
      </main>
      <SiteFooter />
      <WhatsAppButton />
    </div>
  );
}
