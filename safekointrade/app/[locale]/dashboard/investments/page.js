import { getTranslations, setRequestLocale } from "next-intl/server";
import { Layers, PiggyBank } from "lucide-react";
import { Link } from "@/lib/i18n/navigation";
import { getViewer } from "@/lib/auth/session";
import { PageHeader } from "@/components/dashboard/page-header";
import { PositionCard } from "@/components/dashboard/position-card";
import { LinkTabs } from "@/components/ui/link-tabs";
import { EmptyState } from "@/components/ui/feedback";
import { buttonClasses } from "@/components/ui/button";
import { Pagination, parsePage } from "@/components/tables/pagination";

const STATUSES = ["active", "matured", "cancelled"];

export async function generateMetadata({ params }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "dashboard.positions" });
  return { title: t("title") };
}

export default async function InvestmentsPage({ params, searchParams }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const sp = await searchParams;
  const status = STATUSES.includes(sp.status) ? sp.status : "active";
  const { page, pageSize, from, to } = parsePage(sp, 12);
  const t = await getTranslations("dashboard.positions");
  const { supabase } = await getViewer();
  await supabase.rpc("mature_my_investments");

  const counts = await Promise.all(
    STATUSES.map((s) => supabase.from("investments").select("id", { count: "exact", head: true }).eq("status", s))
  );
  const { data, count } = await supabase
    .from("investments")
    .select("id, reference, plan_name, amount, term_days, started_at, matures_at, matured_at, cancelled_at, status", { count: "exact" })
    .eq("status", status)
    .order(status === "active" ? "matures_at" : "updated_at", { ascending: status === "active" })
    .range(from, to);
  const now = new Date().toISOString();

  return (
    <>
      <PageHeader
        title={t("title")}
        description={t("description")}
        actions={
          <Link href="/dashboard/invest" className={buttonClasses({ size: "sm" })}>
            <PiggyBank className="h-4 w-4" aria-hidden="true" />
            {t("openNew")}
          </Link>
        }
      />
      <LinkTabs
        label={t("title")}
        active={status}
        tabs={STATUSES.map((s, i) => ({
          key: s,
          label: t(`tabs.${s}`),
          count: counts[i].count ?? 0,
          href: { pathname: "/dashboard/investments", query: { status: s } },
        }))}
      />
      {data?.length ? (
        <>
          <div className="grid gap-4 md:grid-cols-2">
            {data.map((p) => <PositionCard key={p.id} position={p} now={now} />)}
          </div>
          <div className="mt-6 overflow-hidden rounded-lg border border-line bg-surface empty:hidden">
            <Pagination pathname="/dashboard/investments" page={page} pageSize={pageSize} total={count ?? 0} query={{ status }} />
          </div>
        </>
      ) : (
        <div className="rounded-lg border border-line bg-surface">
          <EmptyState
            icon={Layers}
            title={t(`empty.${status}`)}
            action={status === "active" ? <Link href="/dashboard/invest" className={buttonClasses({ size: "sm" })}>{t("openNew")}</Link> : null}
          />
        </div>
      )}
    </>
  );
}
