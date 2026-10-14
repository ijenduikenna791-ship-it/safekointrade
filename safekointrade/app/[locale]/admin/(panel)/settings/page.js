import { getTranslations, setRequestLocale } from "next-intl/server";
import { requireStaff } from "@/lib/authorization/guards";
import { PageHeader } from "@/components/dashboard/page-header";
import { AssetFlags, BooleanSetting, NumberSetting } from "@/components/admin/settings-controls";
import { Card, CardHeader } from "@/components/ui/card";

const NUMBER_KEYS = ["deposit_min", "deposit_max", "withdrawal_min", "withdrawal_max", "withdrawal_fee_flat", "withdrawal_fee_percent"];
const BOOL_KEYS = ["maintenance_mode", "registrations_open"];

export async function generateMetadata({ params }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "admin.settings" });
  return { title: t("title") };
}

export default async function AdminSettingsPage({ params }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const staff = await requireStaff("settings.manage", "/admin/settings");
  const t = await getTranslations("admin.settings");

  const [{ data: settings }, { data: assets }] = await Promise.all([
    staff.supabase.from("application_settings").select("key, value"),
    staff.supabase.from("supported_assets").select("*").order("sort_order"),
  ]);
  const value = (k) => settings?.find((s) => s.key === k)?.value;

  return (
    <>
      <PageHeader title={t("title")} description={t("description")} />
      <div className="grid gap-6 xl:grid-cols-2">
        <Card className="self-start">
          <CardHeader title={t("limits")} />
          <div className="divide-y divide-line">
            {NUMBER_KEYS.map((k) => <NumberSetting key={k} settingKey={k} value={value(k) ?? 0} />)}
          </div>
        </Card>
        <div className="space-y-6">
          <Card>
            <CardHeader title={t("switches")} />
            <div className="divide-y divide-line">
              {BOOL_KEYS.map((k) => <BooleanSetting key={k} settingKey={k} value={value(k) === true} />)}
            </div>
          </Card>
          <Card>
            <CardHeader title={t("assets")} />
            <div className="divide-y divide-line">
              {(assets || []).map((a) => <AssetFlags key={a.symbol} asset={a} />)}
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}
