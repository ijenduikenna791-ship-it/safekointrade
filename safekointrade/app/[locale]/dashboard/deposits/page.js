import { getLocale, getTranslations, setRequestLocale } from "next-intl/server";
import { ArrowDownToLine } from "lucide-react";
import { getViewer } from "@/lib/auth/session";
import { getPublicSettings } from "@/lib/database/settings";
import { brand } from "@/lib/config/brand";
import { PageHeader } from "@/components/dashboard/page-header";
import { DepositForm } from "@/components/dashboard/deposit-form";
import { ReceiptControls } from "@/components/dashboard/receipt-controls";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/feedback";
import { DataTable } from "@/components/tables/data-table";
import { Pagination, parsePage } from "@/components/tables/pagination";
import { formatDate, formatMoney } from "@/lib/utils/format";

export async function generateMetadata({ params }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "dashboard.deposits" });
  return { title: t("title") };
}

export default async function DepositsPage({ params, searchParams }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const sp = await searchParams;
  const { page, pageSize, from, to } = parsePage(sp);
  const t = await getTranslations("dashboard.deposits");
  const tt = await getTranslations("dashboard.table");
  const tc = await getTranslations("common");
  const { supabase } = await getViewer();
  const lc = await getLocale();

  const [{ data: assets }, settings, { data: rows, count }] = await Promise.all([
    supabase.from("supported_assets").select("symbol, name").eq("is_active", true).eq("accepts_deposits", true).order("sort_order"),
    getPublicSettings(supabase),
    supabase
      .from("deposit_requests")
      .select("id, reference, amount, credited_amount, asset_symbol, method, status, receipt_path, review_note, created_at", { count: "exact" })
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
          <p className="text-xs text-ink-subtle">{formatDate(r.created_at, { locale: lc, withTime: true })}</p>
        </div>
      ),
    },
    { key: "asset", header: tt("asset"), cell: (r) => `${r.asset_symbol} · ${t(`methods.${r.method}`)}` },
    {
      key: "amount",
      header: tt("amount"),
      align: "end",
      cell: (r) => (
        <div className="tabular">
          <p className="font-medium">{formatMoney(r.amount, { locale: lc })}</p>
          {r.credited_amount && r.credited_amount !== r.amount && (
            <p className="text-xs text-ink-subtle">{t("credited")} {formatMoney(r.credited_amount, { locale: lc })}</p>
          )}
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
        </div>
      ),
    },
    {
      key: "receipt",
      header: t("receipt"),
      align: "end",
      cell: (r) => <ReceiptControls depositId={r.id} hasReceipt={Boolean(r.receipt_path)} canUpload={r.status === "pending"} />,
    },
  ];

  return (
    <>
      <PageHeader title={t("title")} description={t("description")} />
      <div className="grid gap-6 xl:grid-cols-[minmax(0,26rem)_1fr]">
        <Card className="self-start">
          <CardHeader title={t("formTitle")} />
          <CardBody>
            <DepositForm
              assets={assets || []}
              limits={{ min: settings.deposit_min, max: settings.deposit_max }}
              demoMode={brand.demoMode}
            />
          </CardBody>
        </Card>
        <Card className="min-w-0 self-start">
          <CardHeader title={t("historyTitle")} />
          <DataTable
            columns={columns}
            rows={rows || []}
            caption={t("historyTitle")}
            empty={<EmptyState icon={ArrowDownToLine} title={t("empty")} />}
          />
          <Pagination pathname="/dashboard/deposits" page={page} pageSize={pageSize} total={count ?? 0} />
        </Card>
      </div>
    </>
  );
}
