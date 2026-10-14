import {
  ArrowDownToLine, ArrowLeftRight, ArrowUpFromLine, Bell, CircleDollarSign, FileText, IdCard, Layers,
  LayoutDashboard, LifeBuoy, Megaphone, PiggyBank, ScrollText, Settings, Users, Wallet,
} from "lucide-react";

/**
 * Navigation for both shells. `perm` entries are filtered with the viewer's
 * roles on the server before rendering (lib/authorization/permissions.js).
 */
export const userNav = [
  {
    section: null,
    items: [
      { href: "/dashboard", key: "overview", icon: LayoutDashboard, exact: true },
      { href: "/dashboard/invest", key: "invest", icon: PiggyBank },
      { href: "/dashboard/investments", key: "investments", icon: Layers },
    ],
  },
  {
    section: "money",
    items: [
      { href: "/dashboard/deposits", key: "deposits", icon: ArrowDownToLine },
      { href: "/dashboard/withdrawals", key: "withdrawals", icon: ArrowUpFromLine },
      { href: "/dashboard/transactions", key: "transactions", icon: ArrowLeftRight },
    ],
  },
  {
    section: "account",
    items: [
      { href: "/dashboard/notifications", key: "notifications", icon: Bell },
      { href: "/dashboard/support", key: "support", icon: LifeBuoy },
      { href: "/dashboard/settings", key: "settings", icon: Settings },
    ],
  },
];

export const adminNav = [
  {
    section: null,
    items: [{ href: "/admin", key: "overview", icon: LayoutDashboard, exact: true, perm: "admin.view" }],
  },
  {
    section: "money",
    items: [
      { href: "/admin/deposits", key: "deposits", icon: ArrowDownToLine, perm: "finance.view" },
      { href: "/admin/withdrawals", key: "withdrawals", icon: ArrowUpFromLine, perm: "finance.view" },
      { href: "/admin/investments", key: "investments", icon: Wallet, perm: "finance.view" },
      { href: "/admin/transactions", key: "transactions", icon: ArrowLeftRight, perm: "finance.view" },
      { href: "/admin/plans", key: "plans", icon: CircleDollarSign, perm: "finance.view" },
    ],
  },
  {
    section: "people",
    items: [
      { href: "/admin/users", key: "users", icon: Users, perm: "users.view" },
      { href: "/admin/kyc", key: "kyc", icon: IdCard, perm: "kyc.view" },
      { href: "/admin/support", key: "support", icon: LifeBuoy, perm: "support.manage" },
      { href: "/admin/notifications", key: "notifications", icon: Megaphone, perm: "notifications.send" },
    ],
  },
  {
    section: "system",
    items: [
      { href: "/admin/audit-logs", key: "audit", icon: ScrollText, perm: "audit.view" },
      { href: "/admin/settings", key: "settings", icon: Settings, perm: "settings.manage" },
      { href: "/dashboard", key: "exit", icon: FileText, perm: "admin.view" },
    ],
  },
];
