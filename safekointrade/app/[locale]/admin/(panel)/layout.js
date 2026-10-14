import { getTranslations, setRequestLocale } from "next-intl/server";
import { requireStaff } from "@/lib/authorization/guards";
import { can } from "@/lib/authorization/permissions";
import { adminNav } from "@/components/layout/nav-config";
import { AppShell } from "@/components/layout/app-shell";
import { SimulationBanner } from "@/components/layout/simulation-banner";
import { NotConfigured } from "@/components/dashboard/not-configured";
import { Alert } from "@/components/ui/feedback";

export const metadata = { robots: { index: false, follow: false } };

/**
 * Every admin page renders inside this layout, which verifies on the server
 * that the signed-in user holds a staff role (read from user_roles under RLS).
 * Pages check their own permission again, and every mutation is re-checked
 * by its Server Action and by the database function it calls.
 */
export default async function AdminLayout({ children, params }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const staff = await requireStaff("admin.view", "/admin");
  if (staff.notConfigured) return <NotConfigured />;
  const t = await getTranslations("admin.common");

  const allowed = adminNav.flatMap((g) => g.items).filter((it) => can(staff.roles, it.perm)).map((it) => it.href);
  const { data: factors } = await staff.supabase.auth.mfa.listFactors();
  const hasMfa = Boolean(factors?.totp?.some((f) => f.status === "verified"));

  return (
    <AppShell
      variant="admin"
      viewer={{ id: staff.user.id, name: staff.profile?.full_name, email: staff.profile?.email, isStaff: true }}
      allowed={allowed}
      banner={<SimulationBanner />}
    >
      {!hasMfa && <Alert tone="warn" className="mb-6">{t("mfaEnrol")}</Alert>}
      {children}
    </AppShell>
  );
}
