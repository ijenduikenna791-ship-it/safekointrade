import { getTranslations, setRequestLocale } from "next-intl/server";
import { requireStaff } from "@/lib/authorization/guards";
import { PageHeader } from "@/components/dashboard/page-header";
import { AnnouncementForm } from "@/components/admin/announcement-form";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { formatDate } from "@/lib/utils/format";

export async function generateMetadata({ params }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "admin.notifications" });
  return { title: t("title") };
}

export default async function AdminAnnouncementsPage({ params }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const staff = await requireStaff("notifications.send", "/admin/notifications");
  const t = await getTranslations("admin.notifications");
  const tc = await getTranslations("common");
  // Sent announcements are recorded in the audit log (owners/admins can read it).
  const { data: recent } = staff.can("audit.view")
    ? await staff.supabase.from("audit_logs").select("id, details, created_at").eq("action", "announcement.sent").order("created_at", { ascending: false }).limit(10)
    : { data: null };

  return (
    <>
      <PageHeader title={t("title")} description={t("description")} />
      <div className="grid gap-6 xl:grid-cols-[1fr_22rem]">
        <Card className="self-start">
          <CardBody><AnnouncementForm /></CardBody>
        </Card>
        {recent && (
          <Card className="self-start">
            <CardHeader title={t("recent")} />
            {recent.length ? (
              <ul className="divide-y divide-line text-sm">
                {recent.map((r) => (
                  <li key={r.id} className="px-5 py-3">
                    <p className="font-medium">{r.details?.title}</p>
                    <p className="text-xs text-ink-subtle">{t("sent", { count: r.details?.recipients ?? 0 })} · {formatDate(r.created_at, { locale, withTime: true })}</p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="px-5 py-8 text-center text-sm text-ink-subtle">{tc("noResults")}</p>
            )}
          </Card>
        )}
      </div>
    </>
  );
}
