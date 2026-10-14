import { getTranslations, setRequestLocale } from "next-intl/server";
import { ArrowUpFromLine } from "lucide-react";
import { requireStaff } from "@/lib/authorization/guards";
import { PageHeader } from "@/components/dashboard/page-header";
import { FilterBar, applySearch } from "@/components/admin/filter-bar";
import { ReviewWithdrawal } from "@/components/admin/review-withdrawal";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/feedback";
import { DataTable } from "@/components/tables/data-table";
import { Pagination, parsePage } from "@/components/tables/pagination";
import { formatDate, formatMoney } from "@/lib/utils/format";

const STATUSES = ["pending", "processing", "approved", "completed", "rejected", "cancelled"];
const OPEN = ["pending", "processing", "approved"];

export async function generateMetadata({ params }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "admin.withdrawals" });
  return { title: t("title") };
}

export default async function AdminWithdrawalsPage({ params, searchParams }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const sp = await searchParams;
  const staff = await requireStaff("finance.view", "/admin/withdrawals");
  const t = await getTranslations("admin.withdrawals");
  const ta = await getTranslations("admin.common");
  const tt = await getTranslations("dashboard.table");
  const tc = await getTranslations("common");
  // Default view: everything still open.
  const status = STATUSES.includes(sp.status) ? sp.status : sp.status === undefined || sp.status === "open" ? "open" : "";
  const sort = ["newest", "oldest", "largest"].includes(sp.sort) ? sp.sort : "oldest";
  const { page, pageSize, from, to } = parsePage(sp, 20);

  let query = staff.supabase
    .from("withdrawal_requests")
    .select("id, reference, user_id, amount, fee, net_amount, asset_symbol, network, destination, status, review_note, payout_reference, created_at, user:profiles!withdrawal_requests_user_id_fkey(email, full_name)", { count: "exact" });
  if (status === "open") query = query.in("status", OPEN);
  else if (status) query = query.eq("status", status);
  ({ query } = await applySearch(staff.supabase, query, sp.q));
  query = sort === "largest" ? query.order("amount", { ascending: false }) : query.order("created_at", { ascending: sort === "oldest" });
  const { data: rows, count } = await query.range(from, to);
  const canReview = staff.can("finance.review");

  const columns = [
    {
      key: "reference",
      header: tt("reference"),
      primary: true,
      cell: (r) => (
        <div>
          <p className="tabular font-medium">{r.reference}</p>
          <p className="text-xs text-ink-subtle">{formatDate(r.created_at, { locale, withTime: true })}</p>
        </div>
      ),
    },
    { key: "user", header: tt("user"), cell: (r) => <div className="min-w-0"><p className="truncate">{r.user?.full_name || "—"}</p><p className="truncate text-xs text-ink-subtle">{r.user?.email}</p></div> },
    { key: "destination", header: tt("destination"), hideOnMobile: true, cell: (r) => <span className="block max-w-40 truncate font-mono text-xs" dir="ltr" title={r.destination}>{r.asset_symbol} · {r.destination}</span> },
    { key: "amount", header: tt("amount"), align: "end", cell: (r) => <span className="tabular font-medium">{formatMoney(r.amount, { locale })}</span> },
    { key: "status", header: tt("status"), cell: (r) => <StatusBadge status={r.status} label={tc(`status.${r.status}`)} /> },
    { key: "actions", header: tt("actions"), align: "end", cell: (r) => <ReviewWithdrawal withdrawal={r} canReview={canReview} selfReview={r.user_id === staff.user.id} /> },
  ];

  return (
    <>
      <PageHeader title={t("title")} description={t("description")} />
      <Card className="min-w-0">
        <FilterBar
          pathname="/admin/withdrawals"
          q={sp.q || ""}
          status={status === "open" ? "" : status}
          statuses={STATUSES}
          statusLabel={(s) => tc(`status.${s}`)}
          sort={sort}
          sorts={[
            { value: "oldest", label: ta("oldest") },
            { value: "newest", label: ta("newest") },
            { value: "largest", label: ta("largest") },
          ]}
        />
        <DataTable columns={columns} rows={rows || []} caption={t("title")} empty={<EmptyState icon={ArrowUpFromLine} title={tc("noResults")} />} />
        <Pagination pathname="/admin/withdrawals" page={page} pageSize={pageSize} total={count ?? 0} query={{ q: sp.q || "", status: status || "", sort }} />
      </Card>
    </>
  );
}
