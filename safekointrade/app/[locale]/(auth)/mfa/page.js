import { getLocale, getTranslations, setRequestLocale } from "next-intl/server";
import { Fingerprint } from "lucide-react";
import { Link, redirect } from "@/lib/i18n/navigation";
import { getSession } from "@/lib/auth/session";
import { safeNextPath } from "@/lib/security/request";
import { MfaChallengeForm } from "@/components/auth/simple-forms";

export async function generateMetadata({ params }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "auth.mfa" });
  return { title: t("title") };
}

export default async function MfaPage({ params, searchParams }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const sp = await searchParams;
  const { user } = await getSession();
  if (!user) redirect({ href: "/login", locale: await getLocale() });
  const t = await getTranslations("auth.mfa");
  return (
    <div>
      <span className="grid h-12 w-12 place-items-center rounded-full border border-brass-line bg-brass-soft text-brass">
        <Fingerprint className="h-5 w-5" aria-hidden="true" />
      </span>
      <h1 className="mt-6 text-3xl font-semibold tracking-[-0.03em]">{t("title")}</h1>
      <p className="mt-3 mb-8 text-ink-muted">{t("subtitle")}</p>
      <MfaChallengeForm next={safeNextPath(sp.next, "/dashboard")} />
      <p className="mt-6 text-center text-sm">
        <Link href="/logout" className="text-ink-muted hover:text-ink">{t("useAnother")}</Link>
      </p>
    </div>
  );
}
