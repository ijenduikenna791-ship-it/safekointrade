import { getTranslations, setRequestLocale } from "next-intl/server";
import { HelpCircle, LifeBuoy } from "lucide-react";
import { Link } from "@/lib/i18n/navigation";
import { getViewer } from "@/lib/auth/session";
import { PageHeader } from "@/components/dashboard/page-header";
import { NewTicketButton } from "@/components/dashboard/support-forms";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/feedback";
import { DataTable } from "@/components/tables/data-table";
import { Pagination, parsePage } from "@/components/tables/pagination";
import { formatDate } from "@/lib/utils/format";

export async function generateMetadata({ params }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "dashboard.support" });
  return { title: t("title") };
}

export default async function SupportPage({ params, searchParams }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const sp = await searchParams;
  const { page, pageSize, from, to } = parsePage(sp);
  const t = await getTranslations("dashboard.support");
  const tt = await getTranslations("dashboard.table");
  const tc = await getTranslations("common");
  const { supabase } = await getViewer();
  const { data: rows, count } = await supabase
    .from("support_tickets")
    .select("id, reference, subject, category, status, last_message_at", { count: "exact" })
    .order("last_message_at", { ascending: false })
    .range(from, to);

  const columns = [
    {
      key: "subject",
      header: tt("subject"),
      primary: true,
      cell: (r) => (
        <Link href={`/dashboard/support/${r.id}`} className="group block">
          <p className="font-medium group-hover:text-brass">{r.subject}</p>
          <p className="tabular text-xs text-ink-subtle">{r.reference}</p>
        </Link>
      ),
    },
    { key: "category", header: tt("category"), cell: (r) => t(`categories.${r.category}`) },
    { key: "status", header: tt("status"), cell: (r) => <StatusBadge status={r.status} label={tc(`status.${r.status}`)} /> },
    { key: "updated", header: tt("updated"), align: "end", cell: (r) => <span className="text-ink-muted">{formatDate(r.last_message_at, { locale, withTime: true })}</span> },
  ];

  return (
    <>
      <PageHeader title={t("title")} description={t("description")} actions={<NewTicketButton />} />
      <div className="grid gap-6 xl:grid-cols-[1fr_18rem]">
        <Card className="min-w-0 self-start">
          <DataTable columns={columns} rows={rows || []} caption={t("title")} empty={<EmptyState icon={LifeBuoy} title={t("empty")} />} />
          <Pagination pathname="/dashboard/support" page={page} pageSize={pageSize} total={count ?? 0} />
        </Card>
        <aside className="self-start rounded-lg border border-line bg-surface p-5">
          <HelpCircle className="h-5 w-5 text-brass" aria-hidden="true" />
          <h2 className="mt-3 font-semibold">{t("faqTitle")}</h2>
          <p className="mt-1 text-sm text-ink-muted">{t("faqBody")}</p>
          <Link href="/#faq" className="mt-3 inline-block text-sm font-medium text-brass hover:underline">{t("faqLink")}</Link>
        </aside>
      </div>
    </>
  );
}
