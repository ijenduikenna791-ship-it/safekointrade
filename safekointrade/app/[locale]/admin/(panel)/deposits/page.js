import { getTranslations, setRequestLocale } from "next-intl/server";
import { ArrowDownToLine } from "lucide-react";
import { requireStaff } from "@/lib/authorization/guards";
import { PageHeader } from "@/components/dashboard/page-header";
import { FilterBar, applySearch } from "@/components/admin/filter-bar";
import { ReviewDeposit } from "@/components/admin/review-deposit";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/feedback";
import { DataTable } from "@/components/tables/data-table";
import { Pagination, parsePage } from "@/components/tables/pagination";
import { formatDate, formatMoney } from "@/lib/utils/format";

const STATUSES = ["pending", "completed", "rejected"];

export async function generateMetadata({ params }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "admin.deposits" });
  return { title: t("title") };
}

export default async function AdminDepositsPage({ params, searchParams }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const sp = await searchParams;
  const staff = await requireStaff("finance.view", "/admin/deposits");
  const t = await getTranslations("admin.deposits");
  const ta = await getTranslations("admin.common");
  const tt = await getTranslations("dashboard.table");
  const tc = await getTranslations("common");
  const status = STATUSES.includes(sp.status) ? sp.status : sp.status === "all" ? "" : sp.status === undefined ? "pending" : "";
  const sort = ["newest", "oldest", "largest"].includes(sp.sort) ? sp.sort : status === "pending" ? "oldest" : "newest";
  const { page, pageSize, from, to } = parsePage(sp, 20);

  let query = staff.supabase
    .from("deposit_requests")
    .select(
      "id, reference, user_id, amount, credited_amount, asset_symbol, network, from_address, method, tx_reference, note, receipt_path, status, review_note, created_at, user:profiles!deposit_requests_user_id_fkey(email, full_name), deposit_wallet:deposit_wallets(address)",
      { count: "exact" }
    );
  if (status) query = query.eq("status", status);
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
    {
      key: "user",
      header: tt("user"),
      cell: (r) => (
        <div className="min-w-0">
          <p className="truncate">{r.user?.full_name || "—"}</p>
          <p className="truncate text-xs text-ink-subtle">{r.user?.email}</p>
        </div>
      ),
    },
    {
      key: "asset",
      header: tt("asset"),
      cell: (r) => (
        <div>
          <p>{r.asset_symbol}</p>
          {r.network && <p className="text-xs text-ink-subtle">{r.network}</p>}
        </div>
      ),
    },
    {
      key: "wallets",
      header: t("wallets"),
      cell: (r) =>
        r.method !== "crypto_transfer" ? (
          "—"
        ) : (
          <div className="max-w-60 space-y-1 text-xs">
            <p>
              <span className="text-ink-subtle">{t("toAddress")}: </span>
              <span className="break-all font-mono">{r.deposit_wallet?.address || "—"}</span>
            </p>
            <p>
              <span className="text-ink-subtle">{t("fromAddress")}: </span>
              <span className="break-all font-mono">{r.from_address || t("notProvided")}</span>
            </p>
          </div>
        ),
    },
    { key: "amount", header: tt("amount"), align: "end", cell: (r) => <span className="tabular font-medium">{formatMoney(r.amount, { locale })}</span> },
    { key: "status", header: tt("status"), cell: (r) => <StatusBadge status={r.status} label={tc(`status.${r.status}`)} /> },
    {
      key: "actions",
      header: tt("actions"),
      align: "end",
      cell: (r) => <ReviewDeposit deposit={r} canReview={canReview} selfReview={r.user_id === staff.user.id} />,
    },
  ];

  return (
    <>
      <PageHeader title={t("title")} description={t("description")} />
      <Card className="min-w-0">
        <FilterBar
          pathname="/admin/deposits"
          q={sp.q || ""}
          status={status}
          statuses={STATUSES}
          statusLabel={(s) => tc(`status.${s}`)}
          sort={sort}
          sorts={[
            { value: "oldest", label: ta("oldest") },
            { value: "newest", label: ta("newest") },
            { value: "largest", label: ta("largest") },
          ]}
        />
        <DataTable columns={columns} rows={rows || []} caption={t("title")} empty={<EmptyState icon={ArrowDownToLine} title={tc("noResults")} />} />
        <Pagination pathname="/admin/deposits" page={page} pageSize={pageSize} total={count ?? 0} query={{ q: sp.q || "", status: status || "all", sort }} />
      </Card>
    </>
  );
}