import { getTranslations, setRequestLocale } from "next-intl/server";
import { getViewer } from "@/lib/auth/session";
import { PageHeader } from "@/components/dashboard/page-header";
import { NotificationList } from "@/components/dashboard/notification-list";
import { Card } from "@/components/ui/card";
import { Pagination, parsePage } from "@/components/tables/pagination";

export async function generateMetadata({ params }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "dashboard.notifications" });
  return { title: t("title") };
}

export default async function NotificationsPage({ params, searchParams }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const sp = await searchParams;
  const { page, pageSize, from, to } = parsePage(sp, 20);
  const t = await getTranslations("dashboard.notifications");
  const { supabase } = await getViewer();
  const { data, count } = await supabase
    .from("notifications")
    .select("id, type, template, params, title, body, link, read_at, created_at", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, to);

  return (
    <>
      <PageHeader title={t("title")} description={t("description")} />
      <Card className="overflow-hidden">
        <NotificationList items={data || []} />
        <Pagination pathname="/dashboard/notifications" page={page} pageSize={pageSize} total={count ?? 0} />
      </Card>
    </>
  );
}
