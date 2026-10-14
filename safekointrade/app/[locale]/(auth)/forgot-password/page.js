import { getTranslations, setRequestLocale } from "next-intl/server";
import { AuthHeading } from "@/components/auth/auth-heading";
import { ForgotPasswordForm } from "@/components/auth/simple-forms";

export async function generateMetadata({ params }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "auth.forgot" });
  return { title: t("title") };
}

export default async function ForgotPasswordPage({ params }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("auth.forgot");
  return (
    <>
      <AuthHeading title={t("title")} subtitle={t("subtitle")} />
      <ForgotPasswordForm />
    </>
  );
}
