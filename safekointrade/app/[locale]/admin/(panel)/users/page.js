import { getTranslations, setRequestLocale } from "next-intl/server";
import { Users } from "lucide-react";
import { Link } from "@/lib/i18n/navigation";
import { requireStaff } from "@/lib/authorization/guards";
import { PageHeader } from "@/components/dashboard/page-header";
import { FilterBar } from "@/components/admin/filter-bar";
import { Card } from "@/components/ui/card";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/feedback";
import { DataTable } from "@/components/tables/data-table";
import { Pagination, parsePage } from "@/components/tables/pagination";
import { formatDate, formatMoney, toNumber } from "@/lib/utils/format";

export async function generateMetadata({ params }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "admin.users" });
  return { title: t("title") };
}

export default async function AdminUsersPage({ params, searchParams }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const sp = await searchParams;
  const staff = await requireStaff("users.view", "/admin/users");
  const t = await getTranslations("admin.users");
  const ta = await getTranslations("admin.common");
  const tt = await getTranslations("dashboard.table");
  const tc = await getTranslations("common");
  const status = ["active", "suspended"].includes(sp.status) ? sp.status : "";
  const sort = ["newest", "oldest"].includes(sp.sort) ? sp.sort : "newest";
  const { page, pageSize, from, to } = parsePage(sp, 25);

  let query = staff.supabase
    .from("profiles")
    .select("id, email, full_name, username, status, kyc_status, created_at, last_seen_at, balances(available, held, invested), user_roles!user_roles_user_id_fkey(role)", { count: "exact" });
  if (status) query = query.eq("status", status);
  const q = String(sp.q || "").trim().replace(/[%_,()]/g, "").slice(0, 120);
  if (q) query = query.or(`email.ilike.%${q}%,full_name.ilike.%${q}%,username.ilike.%${q}%`);
  const { data: rows, count } = await query.order("created_at", { ascending: sort === "oldest" }).range(from, to);

  const columns = [
    {
      key: "user",
      header: tt("user"),
      primary: true,
      cell: (r) => (
        <Link href={`/admin/users/${r.id}`} className="group block min-w-0">
          <p className="truncate font-medium group-hover:text-brass">{r.full_name || r.username || "—"}</p>
          <p className="truncate text-xs text-ink-subtle">{r.email}</p>
        </Link>
      ),
    },
    {
      key: "roles",
      header: t("roles"),
      cell: (r) =>
        r.user_roles?.length ? (
          <span className="flex flex-wrap gap-1">{r.user_roles.map((x) => <Badge key={x.role} tone="brass">{t(`roleNames.${x.role}`)}</Badge>)}</span>
        ) : (
          <span className="text-ink-subtle">{t("noRoles")}</span>
        ),
    },
    {
      key: "balance",
      header: t("balance"),
      align: "end",
      cell: (r) => {
        const b = Array.isArray(r.balances) ? r.balances[0] : r.balances;
        return <span className="tabular">{formatMoney(toNumber(b?.available) + toNumber(b?.held) + toNumber(b?.invested), { locale })}</span>;
      },
    },
    { key: "status", header: tt("status"), cell: (r) => <StatusBadge status={r.status} label={tc(`status.${r.status}`)} /> },
    { key: "joined", header: t("joined"), align: "end", cell: (r) => <span className="text-ink-muted">{formatDate(r.created_at, { locale })}</span> },
  ];

  return (
    <>
      <PageHeader title={t("title")} description={t("description")} />
      <Card className="min-w-0">
        <FilterBar
          pathname="/admin/users"
          q={sp.q || ""}
          status={status}
          statuses={["active", "suspended"]}
          statusLabel={(s) => tc(`status.${s}`)}
          sort={sort}
          sorts={[{ value: "newest", label: ta("newest") }, { value: "oldest", label: ta("oldest") }]}
        />
        <DataTable columns={columns} rows={rows || []} caption={t("title")} empty={<EmptyState icon={Users} title={tc("noResults")} />} />
        <Pagination pathname="/admin/users" page={page} pageSize={pageSize} total={count ?? 0} query={{ q: sp.q || "", status, sort }} />
      </Card>
    </>
  );
}
