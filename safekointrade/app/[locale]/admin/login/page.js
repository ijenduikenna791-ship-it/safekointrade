import { getTranslations, setRequestLocale } from "next-intl/server";
import { ShieldCheck } from "lucide-react";
import { Link } from "@/lib/i18n/navigation";
import { AuthShell } from "@/components/auth/auth-shell";
import { AuthHeading } from "@/components/auth/auth-heading";
import { LoginForm } from "@/components/auth/login-form";
import { Alert } from "@/components/ui/feedback";
import { safeNextPath } from "@/lib/security/request";

export async function generateMetadata({ params }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "auth.admin" });
  return { title: t("title"), robots: { index: false, follow: false } };
}

// Staff sign-in. There is no staff registration route: roles are granted only
// by an existing owner/admin or the server-side bootstrap script.
export default async function AdminLoginPage({ params, searchParams }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const sp = await searchParams;
  const t = await getTranslations("auth.admin");
  return (
    <AuthShell>
      <span className="mb-6 grid h-12 w-12 place-items-center rounded-full border border-line bg-surface-2 text-ink-muted">
        <ShieldCheck className="h-5 w-5" aria-hidden="true" />
      </span>
      <AuthHeading title={t("title")} subtitle={t("subtitle")} />
      {sp.error === "forbidden" && <Alert tone="error" className="mb-5">{t("forbidden")}</Alert>}
      <LoginForm staff next={safeNextPath(sp.next, "/admin")} />
      <p className="mt-8 text-center text-sm text-ink-muted">
        {t.rich("customer", { link: (c) => <Link href="/login" className="text-brass hover:underline">{c}</Link> })}
      </p>
    </AuthShell>
  );
}
