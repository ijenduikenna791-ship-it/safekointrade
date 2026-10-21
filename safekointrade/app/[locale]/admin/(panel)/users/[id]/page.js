import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ArrowLeft } from "lucide-react";
import { Link } from "@/lib/i18n/navigation";
import { requireStaff } from "@/lib/authorization/guards";
import { PageHeader, StatTile } from "@/components/dashboard/page-header";
import { UserStatusControl, RoleControls } from "@/components/admin/user-controls";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/badge";
import { buttonClasses } from "@/components/ui/button";
import { formatDate, formatMoney } from "@/lib/utils/format";

export default async function AdminUserDetail({ params }) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const staff = await requireStaff("users.view", `/admin/users/${id}`);
  const t = await getTranslations("admin.users");
  const tc = await getTranslations("common");
  const tt = await getTranslations("dashboard.table");
  const ttx = await getTranslations("dashboard.transactions");
  const tn = await getTranslations("admin.nav");
  const sb = staff.supabase;

  const [{ data: p }, { data: bal }, { data: roles }, { data: txns }, { data: deps }, { data: wds }] = await Promise.all([
    sb.from("profiles").select("*").eq("id", id).maybeSingle(),
    sb.from("balances").select("available, held, invested").eq("user_id", id).maybeSingle(),
    sb.from("user_roles").select("role").eq("user_id", id),
    sb.from("transactions").select("id, reference, type, amount, created_at").eq("user_id", id).order("created_at", { ascending: false }).limit(10),
    sb.from("deposit_requests").select("id, reference, amount, status, created_at").eq("user_id", id).eq("status", "pending"),
    sb.from("withdrawal_requests").select("id, reference, amount, status, created_at").eq("user_id", id).in("status", ["pending", "processing", "approved"]),
  ]);
  if (!p) notFound();

  const roleList = (roles || []).map((r) => r.role);
  const isSelf = id === staff.user.id;
  const manageable = staff.can("roles.manageAdmins") ? ["owner", "admin", "finance", "support"] : staff.can("roles.manage") ? ["finance", "support"] : [];
  const m = (v) => formatMoney(v, { locale });
  const openRequests = [...(deps || []).map((d) => ({ ...d, kind: "deposits" })), ...(wds || []).map((w) => ({ ...w, kind: "withdrawals" }))];

  return (
    <>
      <PageHeader
        title={p.full_name || p.username || p.email}
        description={`${p.email} · @${p.username || "—"}`}
        actions={
          <>
            <StatusBadge status={p.status} label={tc(`status.${p.status}`)} />
            {staff.can("users.manage") && !isSelf && <UserStatusControl userId={p.id} status={p.status} />}
            <Link href="/admin/users" className={buttonClasses({ variant: "secondary", size: "sm" })}>
              <ArrowLeft className="h-4 w-4 rtl-flip" aria-hidden="true" />
              {tn("users")}
            </Link>
          </>
        }
      />

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
        <StatTile label={tt("available")} value={m(bal?.available)} />
        <StatTile label={tt("held")} value={m(bal?.held)} />
        <StatTile label={tt("invested")} value={m(bal?.invested)} />
      </section>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader title={t("profile")} />
          <CardBody>
            <dl className="divide-y divide-line text-sm">
              {[
                ["Phone", p.phone || "—"],
                ["Country", p.country || "—"],
                ["KYC", p.kyc_status],
                [t("joined"), formatDate(p.created_at, { locale, withTime: true })],
                ["Last seen", formatDate(p.last_seen_at, { locale, withTime: true })],
                ["Locale", p.locale],
                ["Referral", p.referral_code],
                ...(p.status_reason ? [[t("statusReason"), p.status_reason]] : []),
              ].map(([k, v]) => (
                <div key={k} className="grid grid-cols-[minmax(0,6.5rem)_minmax(0,1fr)] gap-3 py-2.5 sm:grid-cols-[8rem_minmax(0,1fr)]">
                  <dt className="text-ink-subtle">{k}</dt>
                  <dd className="min-w-0 break-words">{v}</dd>
                </div>
              ))}
            </dl>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title={t("rolesTitle")} description={t("rolesHelp")} />
          <CardBody>
            <RoleControls userId={p.id} roles={roleList} manageable={manageable} disabled={isSelf} />
          </CardBody>
        </Card>

        <Card>
          <CardHeader title={t("requests")} />
          {openRequests.length ? (
            <ul className="divide-y divide-line text-sm">
              {openRequests.map((r) => (
                <li key={r.id}>
                  <Link href={{ pathname: `/admin/${r.kind}`, query: { q: r.reference, status: r.status } }} className="flex justify-between gap-3 px-5 py-3 hover:bg-surface-2/50">
                    <span className="tabular font-medium">{r.reference}</span>
                    <span className="tabular">{m(r.amount)} · {tc(`status.${r.status}`)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-5 py-8 text-center text-sm text-ink-subtle">{tc("noResults")}</p>
          )}
        </Card>

        <Card>
          <CardHeader title={t("activity")} />
          {txns?.length ? (
            <ul className="divide-y divide-line text-sm">
              {txns.map((x) => (
                <li key={x.id} className="flex justify-between gap-3 px-5 py-3">
                  <span>
                    <span className="block">{ttx(`types.${x.type}`)}</span>
                    <span className="tabular text-xs text-ink-subtle">{x.reference} · {formatDate(x.created_at, { locale, withTime: true })}</span>
                  </span>
                  <span className="tabular">{m(x.amount)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-5 py-8 text-center text-sm text-ink-subtle">{tc("noResults")}</p>
          )}
        </Card>
      </div>
    </>
  );
}
