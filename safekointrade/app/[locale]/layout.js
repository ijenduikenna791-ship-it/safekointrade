import { SplashScript } from "@/components/animations/splash-script";
import { notFound } from "next/navigation";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { routing, isRtl } from "@/lib/i18n/routing";
import { brand } from "@/lib/config/brand";
import { AppProviders } from "@/components/providers/app-providers";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "meta" });
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  return {
    metadataBase: new URL(appUrl),
    title: { default: `${brand.name} — ${t("title")}`, template: `%s · ${brand.name}` },
    description: t("description"),
    applicationName: brand.name,
    alternates: {
      languages: Object.fromEntries(routing.locales.map((l) => [l, l === routing.defaultLocale ? "/" : `/${l}`])),
    },
    openGraph: { siteName: brand.name, type: "website", locale },
  };
}

export const viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f4f6f5" },
    { media: "(prefers-color-scheme: dark)", color: "#0c1a22" },
  ],
};


export default async function LocaleLayout({ children, params }) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const dir = isRtl(locale) ? "rtl" : "ltr";
  const t = await getTranslations({ locale, namespace: "common" });

  return (
    <html lang={locale} dir={dir} suppressHydrationWarning>
      <head>
        <SplashScript />
      </head>
      <body className="min-h-dvh">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:start-3 focus:top-3 focus:z-[200] focus:rounded-md focus:bg-surface focus:px-4 focus:py-2 focus:shadow-md"
        >
          {t("skipToContent")}
        </a>
        <NextIntlClientProvider>
          <AppProviders dir={dir}>{children}</AppProviders>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
