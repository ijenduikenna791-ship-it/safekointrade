import { getTranslations, setRequestLocale } from "next-intl/server";
import { requireStaff } from "@/lib/authorization/guards";
import { PageHeader, StatTile } from "@/components/dashboard/page-header";
import { Alert } from "@/components/ui/feedback";

const STATUSES = ["unverified", "pending", "verified", "rejected"];

export async function generateMetadata({ params }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "admin.kyc" });
  return { title: t("title") };
}

/**
 * Identity verification must come from a compliant provider (e.g. via a
 * webhook into /api/webhooks). Staff can't mark people verified by hand, so
 * this page reports statuses rather than offering approve buttons.
 */
export default async function AdminKycPage({ params }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const staff = await requireStaff("kyc.view", "/admin/kyc");
  const t = await getTranslations("admin.kyc");
  const tc = await getTranslations("common");
  const counts = await Promise.all(
    STATUSES.map((s) => staff.supabase.from("profiles").select("id", { count: "exact", head: true }).eq("kyc_status", s))
  );
  const providerConfigured = Boolean(process.env.KYC_PROVIDER_API_KEY);

  return (
    <>
      <PageHeader title={t("title")} description={t("description")} />
      {!providerConfigured && <Alert tone="warn" className="mb-6">{t("notConfigured")}</Alert>}
      <h2 className="mb-3 text-sm font-medium text-ink-muted">{t("counts")}</h2>
      <section className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {STATUSES.map((s, i) => (
          <StatTile key={s} label={tc(`status.${s}`)} value={counts[i].count ?? 0} />
        ))}
      </section>
    </>
  );
}
