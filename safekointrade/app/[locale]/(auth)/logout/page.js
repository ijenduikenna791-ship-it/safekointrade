import { getTranslations, setRequestLocale } from "next-intl/server";
import { LogOut } from "lucide-react";
import { LogoutConfirm } from "@/components/auth/simple-forms";

export async function generateMetadata({ params }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "auth.logout" });
  return { title: t("title") };
}

export default async function LogoutPage({ params }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("auth.logout");
  return (
    <div>
      <span className="grid h-12 w-12 place-items-center rounded-full border border-line bg-surface-2 text-ink-muted">
        <LogOut className="h-5 w-5 rtl-flip" aria-hidden="true" />
      </span>
      <h1 className="mt-6 text-3xl font-semibold tracking-[-0.03em]">{t("title")}</h1>
      <p className="mt-3 mb-8 text-ink-muted">{t("body")}</p>
      <LogoutConfirm />
    </div>
  );
}
