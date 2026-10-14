import { getTranslations, setRequestLocale } from "next-intl/server";
import { ArrowLeftRight } from "lucide-react";
import { requireStaff } from "@/lib/authorization/guards";
import { PageHeader } from "@/components/dashboard/page-header";
import { FilterBar, applySearch } from "@/components/admin/filter-bar";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/feedback";
import { DataTable } from "@/components/tables/data-table";
import { Pagination, parsePage } from "@/components/tables/pagination";
import { formatDate, formatMoney, toNumber } from "@/lib/utils/format";

const TYPES = ["deposit", "withdrawal_hold", "withdrawal_release", "withdrawal_payout", "investment_open", "investment_cancel", "investment_maturity"];

export async function generateMetadata({ params }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "admin.nav" });
  return { title: t("transactions") };
}

export default async function AdminLedgerPage({ params, searchParams }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const sp = await searchParams;
  const staff = await requireStaff("finance.view", "/admin/transactions");
  const tn = await getTranslations("admin.nav");
  const ta = await getTranslations("admin.common");
  const tt = await getTranslations("dashboard.table");
  const ttx = await getTranslations("dashboard.transactions");
  const tc = await getTranslations("common");
  const type = TYPES.includes(sp.status) ? sp.status : "";
  const sort = ["newest", "oldest", "largest"].includes(sp.sort) ? sp.sort : "newest";
  const { page, pageSize, from, to } = parsePage(sp, 30);

  let query = staff.supabase
    .from("transactions")
    .select("id, reference, type, amount, delta_available, delta_held, delta_invested, description, created_at, user:profiles!transactions_user_id_fkey(email)", { count: "exact" });
  if (type) query = query.eq("type", type);
  ({ query } = await applySearch(staff.supabase, query, sp.q));
  query = sort === "largest" ? query.order("amount", { ascending: false }) : query.order("created_at", { ascending: sort === "oldest" });
  const { data: rows, count } = await query.range(from, to);

  const delta = (v) => {
    const n = toNumber(v);
    return n ? <span className={n > 0 ? "text-gain" : "text-ink"}>{n > 0 ? "+" : "−"}{formatMoney(Math.abs(n), { locale })}</span> : <span className="text-ink-subtle">—</span>;
  };

  const columns = [
    { key: "type", header: tt("type"), primary: true, cell: (r) => <div><p className="font-medium">{ttx(`types.${r.type}`)}</p><p className="tabular text-xs text-ink-subtle">{r.reference} · {formatDate(r.created_at, { locale, withTime: true })}</p></div> },
    { key: "user", header: tt("user"), cell: (r) => <span className="block max-w-44 truncate">{r.user?.email}</span> },
    { key: "available", header: tt("available"), align: "end", cell: (r) => <span className="tabular">{delta(r.delta_available)}</span> },
    { key: "held", header: tt("held"), align: "end", cell: (r) => <span className="tabular">{delta(r.delta_held)}</span> },
    { key: "invested", header: tt("invested"), align: "end", cell: (r) => <span className="tabular">{delta(r.delta_invested)}</span> },
  ];

  return (
    <>
      <PageHeader title={tn("transactions")} description={ttx("description")} />
      <Card className="min-w-0">
        <FilterBar
          pathname="/admin/transactions"
          q={sp.q || ""}
          status={type}
          statuses={TYPES}
          statusLabel={(s) => ttx(`types.${s}`)}
          sort={sort}
          sorts={[{ value: "newest", label: ta("newest") }, { value: "oldest", label: ta("oldest") }, { value: "largest", label: ta("largest") }]}
        />
        <DataTable columns={columns} rows={rows || []} caption={tn("transactions")} empty={<EmptyState icon={ArrowLeftRight} title={tc("noResults")} />} />
        <Pagination pathname="/admin/transactions" page={page} pageSize={pageSize} total={count ?? 0} query={{ q: sp.q || "", status: type, sort }} />
      </Card>
    </>
  );
}
