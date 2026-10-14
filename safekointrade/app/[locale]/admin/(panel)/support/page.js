import { getTranslations, setRequestLocale } from "next-intl/server";
import { LifeBuoy } from "lucide-react";
import { Link } from "@/lib/i18n/navigation";
import { requireStaff } from "@/lib/authorization/guards";
import { PageHeader } from "@/components/dashboard/page-header";
import { FilterBar, applySearch } from "@/components/admin/filter-bar";
import { Card } from "@/components/ui/card";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/feedback";
import { DataTable } from "@/components/tables/data-table";
import { Pagination, parsePage } from "@/components/tables/pagination";
import { formatDate } from "@/lib/utils/format";

const STATUSES = ["open", "answered", "closed"];

export async function generateMetadata({ params }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "admin.support" });
  return { title: t("title") };
}

export default async function AdminSupportPage({ params, searchParams }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const sp = await searchParams;
  const staff = await requireStaff("support.manage", "/admin/support");
  const t = await getTranslations("admin.support");
  const ta = await getTranslations("admin.common");
  const tt = await getTranslations("dashboard.table");
  const ts = await getTranslations("dashboard.support");
  const tc = await getTranslations("common");
  const status = STATUSES.includes(sp.status) ? sp.status : sp.status === undefined ? "open" : "";
  const sort = ["newest", "oldest"].includes(sp.sort) ? sp.sort : "oldest";
  const { page, pageSize, from, to } = parsePage(sp, 20);

  let query = staff.supabase
    .from("support_tickets")
    .select("id, reference, subject, category, status, priority, last_message_at, assigned_to, user:profiles!support_tickets_user_id_fkey(email)", { count: "exact" });
  if (status) query = query.eq("status", status);
  ({ query } = await applySearch(staff.supabase, query, sp.q));
  const { data: rows, count } = await query.order("last_message_at", { ascending: sort === "oldest" }).range(from, to);

  const columns = [
    {
      key: "subject",
      header: tt("subject"),
      primary: true,
      cell: (r) => (
        <Link href={`/admin/support/${r.id}`} className="group block min-w-0">
          <p className="truncate font-medium group-hover:text-brass">{r.subject}</p>
          <p className="tabular text-xs text-ink-subtle">{r.reference} · {ts(`categories.${r.category}`)}</p>
        </Link>
      ),
    },
    { key: "user", header: t("customer"), cell: (r) => <span className="block max-w-44 truncate">{r.user?.email}</span> },
    { key: "priority", header: tt("priority"), cell: (r) => <Badge tone={r.priority === "high" ? "loss" : r.priority === "low" ? "neutral" : "info"}>{t(`priorities.${r.priority}`)}</Badge> },
    { key: "status", header: tt("status"), cell: (r) => <StatusBadge status={r.status} label={tc(`status.${r.status}`)} /> },
    { key: "updated", header: tt("updated"), align: "end", cell: (r) => <span className="text-ink-muted">{formatDate(r.last_message_at, { locale, withTime: true })}</span> },
  ];

  return (
    <>
      <PageHeader title={t("title")} description={t("description")} />
      <Card className="min-w-0">
        <FilterBar
          pathname="/admin/support"
          q={sp.q || ""}
          status={status}
          statuses={STATUSES}
          statusLabel={(s) => tc(`status.${s}`)}
          sort={sort}
          sorts={[{ value: "oldest", label: ta("oldest") }, { value: "newest", label: ta("newest") }]}
        />
        <DataTable columns={columns} rows={rows || []} caption={t("title")} empty={<EmptyState icon={LifeBuoy} title={tc("noResults")} />} />
        <Pagination pathname="/admin/support" page={page} pageSize={pageSize} total={count ?? 0} query={{ q: sp.q || "", status, sort }} />
      </Card>
    </>
  );
}
