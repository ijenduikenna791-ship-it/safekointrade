import { getLocale, getTranslations, setRequestLocale } from "next-intl/server";
import { Link, redirect } from "@/lib/i18n/navigation";
import { getSession } from "@/lib/auth/session";
import { safeNextPath } from "@/lib/security/request";
import { AuthHeading } from "@/components/auth/auth-heading";
import { LoginForm } from "@/components/auth/login-form";

export async function generateMetadata({ params }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "auth.login" });
  return { title: t("title") };
}

export default async function LoginPage({ params, searchParams }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const sp = await searchParams;
  const next = safeNextPath(sp.next, "/dashboard");
  const { user } = await getSession();
  if (user && !sp.signedOut) redirect({ href: next, locale: await getLocale() });
  const t = await getTranslations("auth.login");

  return (
    <>
      <AuthHeading title={t("title")} subtitle={t("subtitle")} />
      <LoginForm next={next} signedOut={sp.signedOut === "1"} />
      <p className="mt-8 text-center text-sm text-ink-muted">
        {t("noAccount")}{" "}
        <Link href="/register" className="font-medium text-brass hover:underline">{t("register")}</Link>
      </p>
    </>
  );
}
