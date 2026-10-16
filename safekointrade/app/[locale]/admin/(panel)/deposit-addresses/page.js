import { getTranslations, setRequestLocale } from "next-intl/server";
import { requireStaff } from "@/lib/authorization/guards";
import { PageHeader } from "@/components/dashboard/page-header";
import { Card, CardBody } from "@/components/ui/card";
import { DepositAddressManager } from "@/components/admin/deposit-address-manager";

export async function generateMetadata({ params }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "admin.depositAddresses" });
  return { title: t("title") };
}

export default async function AdminDepositAddressesPage({ params }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const staff = await requireStaff("settings.manage", "/admin/deposit-addresses");
  const t = await getTranslations("admin.depositAddresses");

  const [{ data: wallets }, { data: assets }] = await Promise.all([
    staff.supabase
      .from("deposit_wallets")
      .select("id, asset_symbol, network, address, memo, is_active, sort_order")
      .order("asset_symbol")
      .order("sort_order"),
    staff.supabase
      .from("supported_assets")
      .select("symbol, name, is_active, accepts_deposits, accepts_withdrawals")
      .eq("is_active", true)
      .order("sort_order"),
  ]);

  return (
    <>
      <PageHeader title={t("title")} description={t("description")} />
      <Card>
        <CardBody>
          <DepositAddressManager wallets={wallets || []} assets={assets || []} />
        </CardBody>
      </Card>
    </>
  );
}