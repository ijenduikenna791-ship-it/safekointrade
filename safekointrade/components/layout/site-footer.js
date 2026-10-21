import { getTranslations } from "next-intl/server";
import { MessageCircle, Mail } from "lucide-react";
import { Link } from "@/lib/i18n/navigation";
import { buttonClasses } from "@/components/ui/button";
import { Logo } from "@/components/ui/logo";
import { brand } from "@/lib/config/brand";

export async function SiteFooter() {
  const t = await getTranslations("footer");
  const nav = await getTranslations("nav");
  const tc = await getTranslations("contact");

  const columns = [
    {
      title: t("product"),
      links: [
        { href: "/#plans", label: nav("plans") },
        { href: "/#markets", label: nav("markets") },
        { href: "/#how", label: nav("how") },
        { href: "/#faq", label: nav("faq") },
      ],
    },
    {
      title: t("company"),
      links: [
        { href: "/about", label: t("about") },
        { href: "/contact", label: t("contact") },
      ],
    },
    {
      title: t("support"),
      links: [
        { href: "/dashboard/support", label: t("helpCentre") },
        { href: `mailto:${brand.supportEmail}`, label: brand.supportEmail, external: true },
        ...(brand.whatsapp ? [{ href: `https://wa.me/${brand.whatsapp}`, label: `WhatsApp ${brand.whatsappDisplay}`, external: true }] : []),
      ],
    },
    {
      title: t("legal"),
      links: [
        { href: "/legal/terms", label: t("terms") },
        { href: "/legal/privacy", label: t("privacy") },
        { href: "/legal/cookies", label: t("cookies") },
      ],
    },
  ];

  return (
    <footer className="dark bg-brand-night text-ink">
      {/* help block */}
      <div className="border-b border-line">
        <div className="container-page flex flex-col gap-6 py-12 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="font-display text-3xl font-bold tracking-tight">{tc("title")}</h2>
            <p className="mt-2 max-w-[52ch] text-ink-muted">{tc("ticketBody")}</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/dashboard/support" className={buttonClasses({ variant: "mint", size: "lg" })}>
              <MessageCircle className="h-5 w-5" aria-hidden="true" />
              {tc("ticketCta")}
            </Link>
            <a href={`mailto:${brand.supportEmail}`} className={buttonClasses({ variant: "secondary", size: "lg", className: "bg-transparent" })}>
              <Mail className="h-5 w-5" aria-hidden="true" />
              {tc("emailTitle")}
            </a>
          </div>
        </div>
      </div>
      <div className="container-page grid gap-10 py-14 lg:grid-cols-[1.2fr_2fr]">
        <div className="max-w-sm">
          <Logo />
          <p className="mt-4 text-sm text-ink-muted">{brand.tagline}</p>
        </div>
        <div className="grid grid-cols-2 gap-x-5 gap-y-8 sm:grid-cols-2 sm:gap-x-8 lg:grid-cols-4">
          {columns.map((col) => (
            <div key={col.title}>
              <h2 className="text-sm font-semibold text-brand-mint">{col.title}</h2>
              <ul className="mt-3 space-y-2.5">
                {col.links.map((l) => (
                  <li key={l.href}>
                    {l.external ? (
                      <a href={l.href} className="break-all text-sm text-ink-muted hover:text-ink">{l.label}</a>
                    ) : (
                      <Link href={l.href} className="text-sm text-ink-muted hover:text-ink">{l.label}</Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
      <div className="border-t border-line">
        <div className="container-page flex flex-col gap-3 py-6 text-xs text-ink-subtle md:flex-row md:items-start md:justify-between">
          <p className="max-w-3xl leading-relaxed">{t("riskWarning")}</p>
          <p className="shrink-0">{t("rights", { year: new Date().getUTCFullYear(), company: brand.legalName })}</p>
        </div>
      </div>
    </footer>
  );
}
