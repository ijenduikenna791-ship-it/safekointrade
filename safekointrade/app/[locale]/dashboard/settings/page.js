import { getTranslations, setRequestLocale } from "next-intl/server";
import { getViewer } from "@/lib/auth/session";
import { PageHeader } from "@/components/dashboard/page-header";
import { LinkTabs } from "@/components/ui/link-tabs";
import { Card, CardBody } from "@/components/ui/card";
import {
  NotificationSettings, PreferenceSettings, ProfileSettings, SecuritySettings,
} from "@/components/dashboard/settings-forms";

const TABS = ["profile", "security", "notifications", "preferences"];

export async function generateMetadata({ params }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "dashboard.settings" });
  return { title: t("title") };
}

export default async function SettingsPage({ params, searchParams }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const sp = await searchParams;
  const tab = TABS.includes(sp.tab) ? sp.tab : "profile";
  const t = await getTranslations("dashboard.settings");
  const { supabase, profile, user } = await getViewer();
  const prefs =
    tab === "notifications"
      ? (await supabase.from("notification_preferences").select("*").eq("user_id", user.id).maybeSingle()).data
      : null;

  return (
    <>
      <PageHeader title={t("title")} description={t("description")} />
      <LinkTabs
        id="settings"
        label={t("title")}
        active={tab}
        tabs={TABS.map((k) => ({ key: k, label: t(`tabs.${k}`), href: { pathname: "/dashboard/settings", query: { tab: k } } }))}
      />
      <Card>
        <CardBody className="py-8 sm:px-8">
          {tab === "profile" && <ProfileSettings profile={profile} />}
          {tab === "security" && <SecuritySettings />}
          {tab === "notifications" && <NotificationSettings prefs={prefs} />}
          {tab === "preferences" && <PreferenceSettings profile={profile} />}
        </CardBody>
      </Card>
    </>
  );
}
