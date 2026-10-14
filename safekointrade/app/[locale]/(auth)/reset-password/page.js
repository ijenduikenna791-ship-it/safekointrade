import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/lib/i18n/navigation";
import { getSession } from "@/lib/auth/session";
import { AuthHeading } from "@/components/auth/auth-heading";
import { ResetPasswordForm } from "@/components/auth/simple-forms";
import { Alert } from "@/components/ui/feedback";
import { buttonClasses } from "@/components/ui/button";

export async function generateMetadata({ params }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "auth.reset" });
  return { title: t("title") };
}

// Reached through the emailed recovery link, which signs the user in first.
export default async function ResetPasswordPage({ params }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("auth");
  const { user, configured } = await getSession();

  return (
    <>
      <AuthHeading title={t("reset.title")} subtitle={t("reset.subtitle")} />
      {user || !configured ? (
        <ResetPasswordForm />
      ) : (
        <div className="space-y-5">
          <Alert tone="warn">{t("reset.expired")}</Alert>
          <Link href="/forgot-password" className={buttonClasses({ size: "lg", className: "w-full" })}>{t("forgot.submit")}</Link>
        </div>
      )}
    </>
  );
}
