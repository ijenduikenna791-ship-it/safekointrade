import { getTranslations, setRequestLocale } from "next-intl/server";
import { ScrollText } from "lucide-react";
import { requireStaff } from "@/lib/authorization/guards";
import { PageHeader } from "@/components/dashboard/page-header";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/feedback";
import { DataTable } from "@/components/tables/data-table";
import { Pagination, parsePage } from "@/components/tables/pagination";
import { formatDate } from "@/lib/utils/format";

export async function generateMetadata({ params }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "admin.audit" });
  return { title: t("title") };
}

export default async function AuditLogPage({ params, searchParams }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const sp = await searchParams;
  const staff = await requireStaff("audit.view", "/admin/audit-logs");
  const t = await getTranslations("admin.audit");
  const ta = await getTranslations("admin.common");
  const tc = await getTranslations("common");
  const action = String(sp.action || "").replace(/[^a-z_.]/g, "").slice(0, 60);
  const { page, pageSize, from, to } = parsePage(sp, 40);

  let query = staff.supabase
    .from("audit_logs")
    .select("id, actor_id, actor_roles, action, entity_type, entity_id, details, created_at, actor:profiles!audit_logs_actor_id_fkey(email)", { count: "exact" })
    .order("created_at", { ascending: false });
  if (action) query = query.ilike("action", `%${action}%`);
  const { data: rows, count } = await query.range(from, to);

  const columns = [
    { key: "action", header: t("action"), primary: true, cell: (r) => <div><p className="font-mono text-xs font-medium">{r.action}</p><p className="text-xs text-ink-subtle">{formatDate(r.created_at, { locale, withTime: true })}</p></div> },
    { key: "actor", header: t("actor"), cell: (r) => <div className="min-w-0"><p className="max-w-48 truncate">{r.actor?.email || t("system")}</p>{r.actor_roles?.length > 0 && <p className="text-xs text-ink-subtle">{r.actor_roles.join(", ")}</p>}</div> },
    { key: "entity", header: t("entity"), cell: (r) => <span className="font-mono text-xs">{r.entity_type}{r.entity_id ? ` · ${String(r.entity_id).slice(0, 8)}` : ""}</span> },
    {
      key: "details",
      header: t("details"),
      hideOnMobile: true,
      cell: (r) => <code className="line-clamp-2 block max-w-md break-all text-xs text-ink-muted">{JSON.stringify(r.details)}</code>,
    },
  ];

  return (
    <>
      <PageHeader title={t("title")} description={t("description")} />
      <Card className="min-w-0">
        <form method="get" className="flex flex-wrap items-end gap-3 border-b border-line px-5 py-4">
          <label className="text-sm">
            <span className="mb-1.5 block font-medium">{t("filterAction")}</span>
            <input name="action" defaultValue={action} placeholder="withdrawal." className="h-10 w-60 rounded-sm border border-line bg-surface px-3 font-mono text-sm" />
          </label>
          <button type="submit" className="h-10 rounded-md bg-primary px-4 text-sm font-medium text-primary-ink">{ta("apply")}</button>
        </form>
        <DataTable columns={columns} rows={rows || []} caption={t("title")} empty={<EmptyState icon={ScrollText} title={tc("noResults")} />} />
        <Pagination pathname="/admin/audit-logs" page={page} pageSize={pageSize} total={count ?? 0} query={action ? { action } : {}} />
      </Card>
    </>
  );
}
