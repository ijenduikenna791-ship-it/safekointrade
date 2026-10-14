import { getLocale, getTranslations, setRequestLocale } from "next-intl/server";
import { Link, redirect } from "@/lib/i18n/navigation";
import { getSession } from "@/lib/auth/session";
import { AuthHeading } from "@/components/auth/auth-heading";
import { RegisterForm } from "@/components/auth/register-form";

export async function generateMetadata({ params }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "auth.register" });
  return { title: t("title") };
}

export default async function RegisterPage({ params, searchParams }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const sp = await searchParams;
  const { user } = await getSession();
  if (user) redirect({ href: "/dashboard", locale: await getLocale() });
  const t = await getTranslations("auth.register");
  const ref = typeof sp.ref === "string" && /^[A-Za-z0-9]{1,16}$/.test(sp.ref) ? sp.ref.toUpperCase() : "";

  return (
    <>
      <AuthHeading title={t("title")} subtitle={t("subtitle")} />
      <RegisterForm referralCode={ref} />
      <p className="mt-8 text-center text-sm text-ink-muted">
        {t("haveAccount")}{" "}
        <Link href="/login" className="font-medium text-brass hover:underline">{t("login")}</Link>
      </p>
    </>
  );
}
