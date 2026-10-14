import { getTranslations, setRequestLocale } from "next-intl/server";
import { MailCheck, MailWarning } from "lucide-react";
import { Link } from "@/lib/i18n/navigation";
import { ResendVerification } from "@/components/auth/simple-forms";

export async function generateMetadata({ params }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "auth.verify" });
  return { title: t("title") };
}

/** Verification pending (after sign-up) and failed/expired link states. */
export default async function VerifyEmailPage({ params, searchParams }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const sp = await searchParams;
  const t = await getTranslations("auth.verify");
  const email = typeof sp.email === "string" && sp.email.length <= 254 ? sp.email : "";
  const failed = ["expired", "invalid", "not_configured"].includes(sp.status);

  return (
    <div>
      <span className={"grid h-12 w-12 place-items-center rounded-full border " + (failed ? "border-warn/30 bg-warn-soft text-warn" : "border-gain/30 bg-gain-soft text-gain")}>
        {failed ? <MailWarning className="h-5 w-5" aria-hidden="true" /> : <MailCheck className="h-5 w-5" aria-hidden="true" />}
      </span>
      <h1 className="mt-6 text-3xl font-semibold tracking-[-0.03em]">{failed ? t("expiredTitle") : t("title")}</h1>
      <p className="mt-3 text-ink-muted">
        {failed ? t("expiredBody") : email ? t("body", { email }) : t("bodyNoEmail")}
      </p>
      {!failed && <p className="mt-3 text-sm text-ink-subtle">{t("duplicateNote")}</p>}
      <div className="mt-8">
        <ResendVerification email={email} />
      </div>
      <p className="mt-6 text-center text-sm">
        <Link href="/login" className="text-brass hover:underline">{t("backToLogin")}</Link>
      </p>
    </div>
  );
}
