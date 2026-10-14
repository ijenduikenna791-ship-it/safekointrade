import { setRequestLocale } from "next-intl/server";
import { AuthShell } from "@/components/auth/auth-shell";

export default async function AuthLayout({ children, params }) {
  const { locale } = await params;
  setRequestLocale(locale);
  return (
    <div className="site-public">
      <AuthShell>{children}</AuthShell>
    </div>
  );
}
