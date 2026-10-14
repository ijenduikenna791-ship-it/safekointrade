import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ArrowLeft } from "lucide-react";
import { Link } from "@/lib/i18n/navigation";
import { getViewer } from "@/lib/auth/session";
import { PageHeader } from "@/components/dashboard/page-header";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { buttonClasses } from "@/components/ui/button";
import { formatDate, formatMoney, toNumber } from "@/lib/utils/format";

const sourceHref = { deposit: "/dashboard/deposits", withdrawal: "/dashboard/withdrawals", investment: "/dashboard/investments" };

export default async function TransactionDetailPage({ params }) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const t = await getTranslations("dashboard.transactions");
  const tt = await getTranslations("dashboard.table");
  const tn = await getTranslations("dashboard.nav");
  const { supabase } = await getViewer();
  // RLS returns nothing for another user's transaction, so this is also the access check.
  const { data: r } = await supabase.from("transactions").select("*").eq("id", id).maybeSingle();
  if (!r) notFound();

  const delta = (v) => {
    const n = toNumber(v);
    if (!n) return <span className="text-ink-subtle">—</span>;
    return <span className={n > 0 ? "text-gain" : "text-ink"}>{n > 0 ? "+" : "−"}{formatMoney(Math.abs(n), { locale })}</span>;
  };

  const rows = [
    [tt("reference"), <span key="r" className="tabular">{r.reference}</span>],
    [tt("type"), t(`types.${r.type}`)],
    [tt("date"), formatDate(r.created_at, { locale, withTime: true })],
    [tt("amount"), formatMoney(r.amount, { locale })],
    [tt("description"), r.description],
  ];

  return (
    <>
      <PageHeader
        title={t("detailTitle", { reference: r.reference })}
        description={t("detailDescription")}
        actions={
          <Link href="/dashboard/transactions" className={buttonClasses({ variant: "secondary", size: "sm" })}>
            <ArrowLeft className="h-4 w-4 rtl-flip" aria-hidden="true" />
            {tn("transactions")}
          </Link>
        }
      />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardBody>
            <dl className="divide-y divide-line">
              {rows.map(([k, v]) => (
                <div key={k} className="grid grid-cols-[8rem_1fr] gap-4 py-3 text-sm">
                  <dt className="text-ink-subtle">{k}</dt>
                  <dd>{v}</dd>
                </div>
              ))}
              <div className="grid grid-cols-[8rem_1fr] gap-4 py-3 text-sm">
                <dt className="text-ink-subtle">{t("source")}</dt>
                <dd>
                  <Link href={sourceHref[r.source_type]} className="text-brass hover:underline">{tn(r.source_type === "investment" ? "investments" : `${r.source_type}s`)}</Link>
                </dd>
              </div>
            </dl>
          </CardBody>
        </Card>
        <Card>
          <CardHeader title={t("balanceAfter")} />
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-ink-subtle">
                <th scope="col" className="px-5 py-3 text-start font-medium" />
                <th scope="col" className="px-5 py-3 text-end font-medium">{t("change")}</th>
                <th scope="col" className="px-5 py-3 text-end font-medium">{t("balanceAfter")}</th>
              </tr>
            </thead>
            <tbody className="tabular divide-y divide-line">
              {[
                [tt("available"), r.delta_available, r.available_after],
                [tt("held"), r.delta_held, r.held_after],
                [tt("invested"), r.delta_invested, r.invested_after],
              ].map(([label, d, after]) => (
                <tr key={label}>
                  <th scope="row" className="px-5 py-3 text-start font-normal text-ink-muted">{label}</th>
                  <td className="px-5 py-3 text-end">{delta(d)}</td>
                  <td className="px-5 py-3 text-end font-medium">{formatMoney(after, { locale })}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>
    </>
  );
}
