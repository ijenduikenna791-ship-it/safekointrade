import { getTranslations, setRequestLocale } from "next-intl/server";
import { LifeBuoy, Mail, MapPin, ShieldCheck } from "lucide-react";
import { Link } from "@/lib/i18n/navigation";
import { buttonClasses } from "@/components/ui/button";
import { brand } from "@/lib/config/brand";

export async function generateMetadata({ params }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "contact" });
  return { title: t("title"), description: t("lead") };
}

export default async function ContactPage({ params }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("contact");

  const rows = [
    { icon: Mail, title: t("emailTitle"), value: brand.supportEmail, href: `mailto:${brand.supportEmail}` },
    { icon: ShieldCheck, title: t("complianceTitle"), value: brand.complianceEmail, href: `mailto:${brand.complianceEmail}` },
    { icon: MapPin, title: t("addressTitle"), value: brand.address },
  ];

  return (
    <section className="container-page py-14 sm:py-20">
      <h1 className="text-4xl font-semibold tracking-[-0.035em] sm:text-5xl">{t("title")}</h1>
      <p className="mt-4 max-w-[56ch] text-lg text-ink-muted">{t("lead")}</p>

      <div className="mt-12 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-lg border border-line bg-surface p-6 sm:p-8">
          <LifeBuoy className="h-6 w-6 text-brass" aria-hidden="true" />
          <h2 className="mt-4 text-xl font-semibold">{t("ticketTitle")}</h2>
          <p className="mt-2 text-ink-muted">{t("ticketBody")}</p>
          <Link href="/dashboard/support" className={buttonClasses({ className: "mt-6" })}>{t("ticketCta")}</Link>
        </div>
        <dl className="divide-y divide-line rounded-lg border border-line bg-surface">
          {rows.map(({ icon: Icon, title, value, href }) => (
            <div key={title} className="flex gap-4 p-5">
              <Icon className="mt-0.5 h-5 w-5 shrink-0 text-ink-subtle" aria-hidden="true" />
              <div className="min-w-0">
                <dt className="text-sm text-ink-subtle">{title}</dt>
                <dd className="mt-0.5 break-words font-medium">
                  {href ? <a href={href} className="hover:text-brass">{value}</a> : value}
                </dd>
              </div>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
