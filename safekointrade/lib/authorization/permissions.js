/**
 * Role -> permission map for the admin UI. The database enforces the same
 * rules independently (require_role in every staff function), so this file
 * only decides what to show; it is never the last line of defence.
 */
export const ROLES = ["owner", "admin", "finance", "support"];

export const PERMISSIONS = {
  "admin.view": ["owner", "admin", "finance", "support"],
  "users.view": ["owner", "admin", "finance", "support"],
  "users.manage": ["owner", "admin"],
  "roles.manage": ["owner", "admin"],
  "roles.manageAdmins": ["owner"],
  "finance.review": ["owner", "admin", "finance"],
  "finance.view": ["owner", "admin", "finance", "support"],
  "plans.manage": ["owner", "admin"],
  "support.manage": ["owner", "admin", "support"],
  "notifications.send": ["owner", "admin", "support"],
  "audit.view": ["owner", "admin"],
  "settings.manage": ["owner", "admin"],
  "kyc.view": ["owner", "admin", "support"],
};

export function can(roles, permission) {
  const allowed = PERMISSIONS[permission];
  if (!allowed) return false;
  return (roles || []).some((r) => allowed.includes(r));
}
