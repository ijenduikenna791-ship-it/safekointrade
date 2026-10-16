import { getTranslations, setRequestLocale } from "next-intl/server";
import { requireUser } from "@/lib/authorization/guards";
import { can } from "@/lib/authorization/permissions";
import { AppShell } from "@/components/layout/app-shell";
import { SimulationBanner } from "@/components/layout/simulation-banner";
import { NotConfigured } from "@/components/dashboard/not-configured";
import { Alert } from "@/components/ui/feedback";
import { PreferenceSync } from "@/components/dashboard/preference-sync";
import { WalletProvider } from "@/components/wallet/wallet-provider";

export const metadata = { robots: { index: false, follow: false } };

export default async function DashboardLayout({ children, params }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const viewer = await requireUser("/dashboard");
  if (viewer.notConfigured) return <NotConfigured />;

  const { count } = await viewer.supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .is("read_at", null);
  const te = await getTranslations("errors");

  return (
    <WalletProvider>
    <AppShell
      variant="user"
      viewer={{
        id: viewer.user.id,
        name: viewer.profile.full_name,
        email: viewer.profile.email,
        isStaff: can(viewer.roles, "admin.view"),
      }}
      unreadCount={count ?? 0}
      banner={<SimulationBanner />}
    >
      <PreferenceSync theme={viewer.profile.theme} locale={viewer.profile.locale} />
      {viewer.profile.status === "suspended" && (
        <Alert tone="error" className="mb-6">{te("account_suspended")}</Alert>
      )}
      {children}
    </AppShell>
    </WalletProvider>
  );
}
