import { getTranslations, setRequestLocale } from "next-intl/server";
import { getViewer } from "@/lib/auth/session";
import { PageHeader } from "@/components/dashboard/page-header";
import { InvestForm } from "@/components/dashboard/invest-form";

export async function generateMetadata({ params }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "dashboard.invest" });
  return { title: t("title") };
}

export default async function InvestPage({ params, searchParams }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const sp = await searchParams;
  const t = await getTranslations("dashboard.invest");
  const { supabase, user } = await getViewer();
  const [{ data: plans }, { data: balance }] = await Promise.all([
    supabase
      .from("investment_plans")
      .select("id, slug, name, description, min_amount, max_amount, currency, term_days, risk_level, risk_description, target_return_min, target_return_max, target_return_basis")
      .eq("is_active", true)
      .order("sort_order"),
    supabase.from("balances").select("available").eq("user_id", user.id).maybeSingle(),
  ]);

  return (
    <>
      <PageHeader title={t("title")} description={t("description")} />
      <InvestForm plans={plans || []} available={balance?.available ?? 0} initialSlug={typeof sp.plan === "string" ? sp.plan : undefined} />
    </>
  );
}
