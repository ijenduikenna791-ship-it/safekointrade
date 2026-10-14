import "server-only";
import { getLocale } from "next-intl/server";
import { redirect } from "@/lib/i18n/navigation";
import { getMfaState, getViewer } from "@/lib/auth/session";
import { can } from "./permissions";

/**
 * Page guard for the user dashboard. Verifies the session on the server
 * (never trusts client state) and enforces a pending MFA challenge.
 */
export async function requireUser(nextPath = "/dashboard") {
  const viewer = await getViewer();
  const locale = await getLocale();
  if (!viewer.configured) return { ...viewer, notConfigured: true };
  if (!viewer.user || !viewer.profile) {
    redirect({ href: { pathname: "/login", query: { next: nextPath } }, locale });
  }
  const mfa = await getMfaState(viewer.supabase);
  if (mfa.needsChallenge) {
    redirect({ href: { pathname: "/mfa", query: { next: nextPath } }, locale });
  }
  return { ...viewer, mfa };
}

/**
 * Page guard for the admin area. Roles come from the user_roles table read
 * with the user's own RLS-scoped client — never from the URL, a cookie or
 * client state. Non-staff get a 404-style redirect to the admin login.
 */
export async function requireStaff(permission = "admin.view", nextPath = "/admin") {
  const viewer = await getViewer();
  const locale = await getLocale();
  if (!viewer.configured) return { ...viewer, notConfigured: true };
  if (!viewer.user) {
    redirect({ href: { pathname: "/admin/login", query: { next: nextPath } }, locale });
  }
  if (!can(viewer.roles, "admin.view")) {
    redirect({ href: { pathname: "/admin/login", query: { error: "forbidden" } }, locale });
  }
  const mfa = await getMfaState(viewer.supabase);
  if (mfa.needsChallenge) {
    redirect({ href: { pathname: "/mfa", query: { next: nextPath } }, locale });
  }
  const allowed = can(viewer.roles, permission);
  if (!allowed) {
    redirect({ href: { pathname: "/admin", query: { denied: "1" } }, locale });
  }
  return { ...viewer, mfa, allowed, can: (p) => can(viewer.roles, p) };
}

/**
 * Guard for Server Actions: returns the viewer or an error code. Actions call
 * this first; the database re-checks everything again.
 */
export async function actionUser() {
  const viewer = await getViewer();
  if (!viewer.configured) return { error: "not_configured" };
  if (!viewer.user || !viewer.profile) return { error: "unauthorized" };
  if (viewer.profile.status !== "active") return { error: "account_suspended" };
  return { viewer };
}

export async function actionStaff(permission) {
  const viewer = await getViewer();
  if (!viewer.configured) return { error: "not_configured" };
  if (!viewer.user) return { error: "unauthorized" };
  if (!can(viewer.roles, permission)) return { error: "forbidden" };
  return { viewer };
}
