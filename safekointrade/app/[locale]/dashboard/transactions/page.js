import { getTranslations, setRequestLocale } from "next-intl/server";
import { ArrowLeftRight } from "lucide-react";
import { Link } from "@/lib/i18n/navigation";
import { getViewer } from "@/lib/auth/session";
import { PageHeader } from "@/components/dashboard/page-header";
import { signedAmount } from "@/components/dashboard/transaction-list";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/feedback";
import { DataTable } from "@/components/tables/data-table";
import { Pagination, parsePage } from "@/components/tables/pagination";
import { formatDate, formatMoney } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";

const TYPES = ["deposit", "withdrawal_hold", "withdrawal_release", "withdrawal_payout", "investment_open", "investment_cancel", "investment_maturity"];

export async function generateMetadata({ params }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "dashboard.transactions" });
  return { title: t("title") };
}

export default async function TransactionsPage({ params, searchParams }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const sp = await searchParams;
  const type = TYPES.includes(sp.type) ? sp.type : null;
  const { page, pageSize, from, to } = parsePage(sp, 20);
  const t = await getTranslations("dashboard.transactions");
  const tt = await getTranslations("dashboard.table");
  const tc = await getTranslations("common");
  const { supabase } = await getViewer();

  let query = supabase
    .from("transactions")
    .select("id, reference, type, amount, delta_available, delta_held, delta_invested, available_after, description, created_at", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, to);
  if (type) query = query.eq("type", type);
  const { data: rows, count } = await query;

  const columns = [
    {
      key: "type",
      header: tt("type"),
      primary: true,
      cell: (r) => (
        <Link href={`/dashboard/transactions/${r.id}`} className="group block">
          <p className="font-medium group-hover:text-brass">{t(`types.${r.type}`)}</p>
          <p className="tabular text-xs text-ink-subtle">{r.reference}</p>
        </Link>
      ),
    },
    { key: "date", header: tt("date"), cell: (r) => <span className="whitespace-nowrap text-ink-muted">{formatDate(r.created_at, { locale, withTime: true })}</span> },
    { key: "description", header: tt("description"), hideOnMobile: true, cell: (r) => <span className="line-clamp-1 text-ink-muted">{r.description}</span> },
    {
      key: "amount",
      header: tt("amount"),
      align: "end",
      cell: (r) => {
        const a = signedAmount(r);
        return (
          <span className={cn("tabular font-medium", a > 0 ? "text-gain" : "text-ink")}>
            {a > 0 ? "+" : a < 0 ? "−" : ""}{formatMoney(Math.abs(a), { locale })}
          </span>
        );
      },
    },
    { key: "available", header: tt("available"), align: "end", cell: (r) => <span className="tabular text-ink-muted">{formatMoney(r.available_after, { locale })}</span> },
  ];

  return (
    <>
      <PageHeader title={t("title")} description={t("description")} />
      <Card className="min-w-0">
        <form method="get" className="flex flex-wrap items-end gap-3 border-b border-line px-5 py-4">
          <label className="text-sm">
            <span className="mb-1.5 block font-medium">{t("filterType")}</span>
            <select
              name="type"
              defaultValue={type || ""}
              className="h-10 min-w-52 rounded-sm border border-line bg-surface px-3 text-sm"
            >
              <option value="">{t("all")}</option>
              {TYPES.map((x) => <option key={x} value={x}>{t(`types.${x}`)}</option>)}
            </select>
          </label>
          <button type="submit" className="h-10 rounded-md border border-line bg-surface px-4 text-sm font-medium hover:bg-surface-2">
            {tc("apply")}
          </button>
        </form>
        <DataTable columns={columns} rows={rows || []} caption={t("title")} empty={<EmptyState icon={ArrowLeftRight} title={t("empty")} />} />
        <Pagination pathname="/dashboard/transactions" page={page} pageSize={pageSize} total={count ?? 0} query={type ? { type } : {}} />
      </Card>
    </>
  );
}
