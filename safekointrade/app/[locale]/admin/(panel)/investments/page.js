import { getTranslations, setRequestLocale } from "next-intl/server";
import { Layers } from "lucide-react";
import { requireStaff } from "@/lib/authorization/guards";
import { PageHeader } from "@/components/dashboard/page-header";
import { FilterBar, applySearch } from "@/components/admin/filter-bar";
import { ProcessMaturitiesButton } from "@/components/admin/admin-controls";
import { Card } from "@/components/ui/card";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/feedback";
import { DataTable } from "@/components/tables/data-table";
import { Pagination, parsePage } from "@/components/tables/pagination";
import { formatDate, formatMoney } from "@/lib/utils/format";
import { nowMs } from "@/lib/utils/time";

const STATUSES = ["active", "matured", "cancelled"];

export async function generateMetadata({ params }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "admin.investments" });
  return { title: t("title") };
}

export default async function AdminInvestmentsPage({ params, searchParams }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const sp = await searchParams;
  const staff = await requireStaff("finance.view", "/admin/investments");
  const t = await getTranslations("admin.investments");
  const ta = await getTranslations("admin.common");
  const tt = await getTranslations("dashboard.table");
  const tp = await getTranslations("dashboard.positions");
  const tc = await getTranslations("common");
  const status = STATUSES.includes(sp.status) ? sp.status : "";
  const sort = ["newest", "oldest", "largest"].includes(sp.sort) ? sp.sort : "newest";
  const { page, pageSize, from, to } = parsePage(sp, 20);

  let query = staff.supabase
    .from("investments")
    .select("id, reference, plan_name, amount, term_days, status, started_at, matures_at, user:profiles!investments_user_id_fkey(email, full_name)", { count: "exact" });
  if (status) query = query.eq("status", status);
  ({ query } = await applySearch(staff.supabase, query, sp.q));
  query = sort === "largest" ? query.order("amount", { ascending: false }) : query.order("started_at", { ascending: sort === "oldest" });
  const { data: rows, count } = await query.range(from, to);
  const now = nowMs();

  const columns = [
    { key: "reference", header: tt("reference"), primary: true, cell: (r) => <div><p className="tabular font-medium">{r.reference}</p><p className="text-xs text-ink-subtle">{r.plan_name} · {r.term_days} d</p></div> },
    { key: "user", header: tt("user"), cell: (r) => <span className="block max-w-48 truncate">{r.user?.email}</span> },
    { key: "amount", header: tt("amount"), align: "end", cell: (r) => <span className="tabular font-medium">{formatMoney(r.amount, { locale })}</span> },
    { key: "matures", header: tp("matures"), cell: (r) => <span className="text-ink-muted">{formatDate(r.matures_at, { locale })}</span> },
    {
      key: "status",
      header: tt("status"),
      cell: (r) => (
        <span className="flex flex-wrap gap-1">
          <StatusBadge status={r.status} label={tc(`status.${r.status}`)} />
          {r.status === "active" && new Date(r.matures_at).getTime() <= now && <Badge tone="warn">{t("due")}</Badge>}
        </span>
      ),
    },
  ];

  return (
    <>
      <PageHeader title={t("title")} description={t("description")} actions={staff.can("finance.review") ? <ProcessMaturitiesButton /> : null} />
      <Card className="min-w-0">
        <FilterBar
          pathname="/admin/investments"
          q={sp.q || ""}
          status={status}
          statuses={STATUSES}
          statusLabel={(s) => tc(`status.${s}`)}
          sort={sort}
          sorts={[{ value: "newest", label: ta("newest") }, { value: "oldest", label: ta("oldest") }, { value: "largest", label: ta("largest") }]}
        />
        <DataTable columns={columns} rows={rows || []} caption={t("title")} empty={<EmptyState icon={Layers} title={tc("noResults")} />} />
        <Pagination pathname="/admin/investments" page={page} pageSize={pageSize} total={count ?? 0} query={{ q: sp.q || "", status, sort }} />
      </Card>
    </>
  );
}
