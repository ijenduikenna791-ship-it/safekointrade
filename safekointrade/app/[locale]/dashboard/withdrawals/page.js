import { getTranslations, setRequestLocale } from "next-intl/server";
import { ArrowUpFromLine } from "lucide-react";
import { getViewer } from "@/lib/auth/session";
import { getPublicSettings } from "@/lib/database/settings";
import { PageHeader } from "@/components/dashboard/page-header";
import { WithdrawalForm } from "@/components/dashboard/withdrawal-form";
import { CancelWithdrawal } from "@/components/dashboard/cancel-withdrawal";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/feedback";
import { DataTable } from "@/components/tables/data-table";
import { Pagination, parsePage } from "@/components/tables/pagination";
import { formatDate, formatMoney } from "@/lib/utils/format";

export async function generateMetadata({ params }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "dashboard.withdrawals" });
  return { title: t("title") };
}

export default async function WithdrawalsPage({ params, searchParams }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const sp = await searchParams;
  const { page, pageSize, from, to } = parsePage(sp);
  const t = await getTranslations("dashboard.withdrawals");
  const tt = await getTranslations("dashboard.table");
  const tc = await getTranslations("common");
  const { supabase, user } = await getViewer();

  const [{ data: assets }, settings, { data: balance }, { data: rows, count }] = await Promise.all([
    supabase.from("supported_assets").select("symbol, name, network").eq("is_active", true).eq("accepts_withdrawals", true).order("sort_order"),
    getPublicSettings(supabase),
    supabase.from("balances").select("available").eq("user_id", user.id).maybeSingle(),
    supabase
      .from("withdrawal_requests")
      .select("id, reference, amount, fee, net_amount, asset_symbol, network, destination, status, review_note, payout_reference, created_at", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(from, to),
  ]);

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
      key: "destination",
      header: tt("destination"),
      cell: (r) => (
        <div className="min-w-0">
          <p className="text-sm">{r.asset_symbol} · {r.network}</p>
          <p className="max-w-44 truncate font-mono text-xs text-ink-subtle" dir="ltr" title={r.destination}>{r.destination}</p>
        </div>
      ),
    },
    {
      key: "amount",
      header: tt("amount"),
      align: "end",
      cell: (r) => (
        <div className="tabular">
          <p className="font-medium">{formatMoney(r.amount, { locale })}</p>
          <p className="text-xs text-ink-subtle">{tt("net")} {formatMoney(r.net_amount, { locale })}</p>
        </div>
      ),
    },
    {
      key: "status",
      header: tt("status"),
      cell: (r) => (
        <div>
          <StatusBadge status={r.status} label={tc(`status.${r.status}`)} />
          {r.status === "rejected" && r.review_note && <p className="mt-1 max-w-48 text-xs text-ink-subtle">{r.review_note}</p>}
          {r.status === "completed" && r.payout_reference && (
            <p className="mt-1 max-w-48 truncate font-mono text-xs text-ink-subtle" title={r.payout_reference}>{r.payout_reference}</p>
          )}
        </div>
      ),
    },
    {
      key: "actions",
      header: tt("actions"),
      align: "end",
      hideOnMobile: false,
      cell: (r) => (r.status === "pending" ? <CancelWithdrawal id={r.id} /> : <span className="text-ink-subtle">—</span>),
    },
  ];

  return (
    <>
      <PageHeader title={t("title")} description={t("description")} />
      <div className="grid gap-6 xl:grid-cols-[minmax(0,26rem)_1fr]">
        <Card className="self-start">
          <CardHeader title={t("formTitle")} />
          <CardBody>
            <WithdrawalForm assets={assets || []} settings={settings} available={balance?.available ?? 0} />
          </CardBody>
        </Card>
        <Card className="min-w-0 self-start">
          <CardHeader title={t("historyTitle")} />
          <DataTable columns={columns} rows={rows || []} caption={t("historyTitle")} empty={<EmptyState icon={ArrowUpFromLine} title={t("empty")} />} />
          <Pagination pathname="/dashboard/withdrawals" page={page} pageSize={pageSize} total={count ?? 0} />
        </Card>
      </div>
    </>
  );
}
