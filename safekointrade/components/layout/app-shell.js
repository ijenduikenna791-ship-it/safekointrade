"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronRight, LogOut, Menu, MessageCircleMore, Settings, ShieldCheck, User, X } from "lucide-react";
import { Link, usePathname } from "@/lib/i18n/navigation";
import { Logo, LogoMark } from "@/components/ui/logo";
import { Dropdown } from "@/components/ui/dropdown";
import { LanguageSwitcher } from "@/components/navigation/language-switcher";
import { NotificationBell } from "@/components/dashboard/notification-bell";
import { ConnectWalletButton } from "@/components/wallet/connect-button";
import { userNav, adminNav } from "./nav-config";
import { useRouter } from "@/lib/i18n/navigation";
import { cn } from "@/lib/utils/cn";
import { isRtl } from "@/lib/i18n/routing";


function isActive(pathname, item) {
  return item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`);
}

function NavList({ groups, pathname, collapsed, t, ts, onNavigate, variant = "user" }) {
  return (
    <nav aria-label={t("nav.breadcrumb")} className="flex flex-col gap-6">
      {groups.map((group, gi) => (
        <div key={group.section || gi}>
          {group.section && !collapsed && (
            <p className="mb-1.5 px-3 text-xs font-medium text-ink-subtle">{ts(group.section)}</p>
          )}
          {group.section && collapsed && <span className="mx-3 mb-2 block h-px bg-line" aria-hidden="true" />}
          <ul className="space-y-0.5">
            {group.items.map((item) => {
              const active = isActive(pathname, item);
              const Icon = item.icon;
              const label = t(`nav.${item.key}`);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={onNavigate}
                    aria-current={active ? "page" : undefined}
                    title={collapsed ? label : undefined}
                    className={cn(
                      "group relative flex h-10 items-center gap-3 rounded-md px-3 text-sm transition-colors",
                      active
                        ? variant === "user"
                          ? "bg-[linear-gradient(90deg,color-mix(in_oklab,var(--brass)_22%,transparent),color-mix(in_oklab,var(--chart-2)_10%,transparent))] font-medium text-ink"
                          : "bg-surface-2 font-medium text-ink"
                        : "text-ink-muted hover:bg-surface-2/70 hover:text-ink",
                      collapsed && "justify-center px-0"
                    )}
                  >
                    {active && variant !== "user" && (
                      <motion.span
                        layoutId="nav-active"
                        className="absolute inset-y-2 start-0 w-0.5 rounded-full bg-brass"
                        transition={{ type: "spring", duration: 0.3, bounce: 0.1 }}
                      />
                    )}
                    <Icon className={cn("h-[18px] w-[18px] shrink-0", active && "text-brass")} strokeWidth={1.8} aria-hidden="true" />
                    <span className={cn(collapsed && "sr-only")}>{label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

function Breadcrumbs({ pathname, variant, t }) {
  const root = variant === "admin" ? "/admin" : "/dashboard";
  const rest = pathname.replace(root, "").split("/").filter(Boolean);
  const nav = variant === "admin" ? adminNav : userNav;
  const items = nav.flatMap((g) => g.items);
  const crumbs = [{ href: root, label: t(variant === "admin" ? "nav.overview" : "nav.home") }];
  let acc = root;
  rest.forEach((seg, i) => {
    acc += `/${seg}`;
    const match = items.find((it) => it.href === acc);
    crumbs.push({ href: acc, label: match ? t(`nav.${match.key}`) : i === rest.length - 1 ? seg.slice(0, 8).toUpperCase() : seg });
  });
  return (
    <nav aria-label={t("nav.breadcrumb")} className="min-w-0">
      <ol className="flex min-w-0 items-center gap-1.5 text-sm">
        {crumbs.map((c, i) => (
          <li key={c.href} className="flex min-w-0 items-center gap-1.5">
            {i > 0 && <ChevronRight className="h-3.5 w-3.5 shrink-0 text-ink-subtle rtl-flip" aria-hidden="true" />}
            {i === crumbs.length - 1 ? (
              <span aria-current="page" className="truncate font-medium text-ink">{c.label}</span>
            ) : (
              <Link href={c.href} className="truncate text-ink-muted hover:text-ink">{c.label}</Link>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

/**
 * variant: "user" | "admin". `allowed` is the list of nav hrefs the server
 * decided this viewer may see (admin), so the client never decides access.
 */
export function AppShell({ variant = "user", viewer, allowed, unreadCount = 0, banner, children }) {
  const t = useTranslations(variant === "admin" ? "admin" : "dashboard");
  const ts = useTranslations(variant === "admin" ? "admin.nav.sections" : "dashboard.nav.sections");
  const tu = useTranslations("dashboard.nav");
  const pathname = usePathname();
  const router = useRouter();
  // The sidebar always shows labels; there is no collapsed mode.
  const collapsed = false;
  const [drawer, setDrawer] = useState(false);
  const offscreen = isRtl(useLocale()) ? "100%" : "-100%";

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setDrawer(false), [pathname]);
  // Content scrolls inside #app-scroll, so reset it on navigation like a page load would.
  useEffect(() => {
    document.getElementById("app-scroll")?.scrollTo({ top: 0 });
  }, [pathname]);
  useEffect(() => {
    if (!drawer) return;
    const onKey = (e) => e.key === "Escape" && setDrawer(false);
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [drawer]);


  const base = variant === "admin" ? adminNav : userNav;
  const groups = base
    .map((g) => ({ ...g, items: g.items.filter((it) => !allowed || allowed.includes(it.href)) }))
    .filter((g) => g.items.length);

  const initials = (viewer?.name || viewer?.email || "?").trim().split(/\s+/).map((s) => s[0]).slice(0, 2).join("").toUpperCase();

  return (
    // Fixed-height app frame: banner on top, sidebar fills the rest, only the
    // content column scrolls — so the sidebar never ends short of the window.
    <div id="app-frame" className={cn("relative flex h-dvh flex-col overflow-hidden text-ink", variant === "admin" ? "dark dash-cmd admin-cmd admin-console" : "dark dash-cmd")}>
      <div className="shrink-0">{banner}</div>
      <div className="flex min-h-0 flex-1">
        {/* Desktop sidebar */}
        <aside
          className={cn(
            "hidden h-full shrink-0 flex-col border-e transition-[width] duration-200 lg:flex",
            "cmd-chrome border-line",
            collapsed ? "w-[4.5rem]" : "w-64"
          )}
        >
          <div className={cn("flex h-16 items-center border-b border-line", collapsed ? "justify-center" : "justify-between px-4")}>
            <Link href={variant === "admin" ? "/admin" : "/dashboard"} className="flex flex-col rounded-sm">
              {collapsed ? <LogoMark /> : <Logo />}
              {!collapsed && variant === "admin" && (
                <span className="ms-10 mt-0.5 text-[11px] font-semibold uppercase tracking-wider text-[#ff9d5c]">{tu("admin")}</span>
              )}
              {!collapsed && variant === "user" && <span className="mono-label ms-10 mt-0.5 !text-[10px]">{tu("clientLabel")}</span>}
            </Link>
          </div>
          <div className="no-scrollbar flex-1 overflow-y-auto px-3 py-5">
            <NavList groups={groups} pathname={pathname} collapsed={collapsed} t={t} ts={ts} variant={variant} />
          </div>
        </aside>

        {/* Mobile drawer */}
        <AnimatePresence>
          {drawer && (
            <div className="fixed inset-0 z-50 lg:hidden">
              <motion.div
                className="absolute inset-0 bg-[rgb(8_18_24/0.5)]"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setDrawer(false)}
              />
              <motion.aside
                role="dialog"
                aria-modal="true"
                aria-label={tu("menu")}
                className={cn(
                  "absolute inset-y-0 start-0 flex w-[min(20rem,85vw)] flex-col shadow-lg",
                  "bg-surface"
                )}
                initial={{ x: offscreen }}
                animate={{ x: 0 }}
                exit={{ x: offscreen }}
                transition={{ duration: 0.24, ease: [0.25, 1, 0.5, 1] }}
              >
                <div className="flex h-16 items-center justify-between border-b border-line px-4">
                  <span className="flex items-center gap-2">
                    <Logo />
                    {variant === "admin" && (
                      <span className="rounded-full bg-brand-orange px-2 py-0.5 text-[11px] font-semibold text-white">{tu("admin")}</span>
                    )}
                  </span>
                  <button type="button" onClick={() => setDrawer(false)} aria-label={tu("closeMenu")} className="grid h-10 w-10 place-items-center rounded-md hover:bg-surface-2">
                    <X className="h-5 w-5" aria-hidden="true" />
                  </button>
                </div>
                <div className="no-scrollbar flex-1 overflow-y-auto px-3 py-5">
                  <NavList groups={groups} pathname={pathname} collapsed={false} t={t} ts={ts} variant={variant} onNavigate={() => setDrawer(false)} />
                </div>
                <div className="flex flex-wrap items-center gap-2 border-t border-line px-3 py-3 sm:hidden">
                  <LanguageSwitcher />
                </div>
                <div className="border-t border-line p-3">
                  <Link href="/logout" className="flex h-10 items-center gap-3 rounded-md px-3 text-sm text-ink-muted hover:bg-surface-2 hover:text-ink">
                    <LogOut className="h-[18px] w-[18px] rtl-flip" aria-hidden="true" />
                    {tu("logout")}
                  </Link>
                </div>
              </motion.aside>
            </div>
          )}
        </AnimatePresence>

        <div id="app-scroll" className="relative flex min-w-0 flex-1 flex-col overflow-y-auto">
          <header
            className={cn(
              "sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-line px-4 backdrop-blur-md sm:px-6",
              "cmd-chrome",
              variant === "admin" && "border-t-[3px] border-t-brand-orange"
            )}
          >
            <button
              type="button"
              onClick={() => setDrawer(true)}
              aria-label={tu("menu")}
              aria-expanded={drawer}
              className="grid h-10 w-10 shrink-0 place-items-center rounded-md hover:bg-surface-2 lg:hidden"
            >
              <Menu className="h-5 w-5" aria-hidden="true" />
            </button>
            {variant === "admin" && (
              <span className="hidden shrink-0 items-center gap-1.5 rounded-md bg-brand-orange/10 px-2 py-1 text-xs font-semibold text-brass sm:inline-flex">
                <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
                {tu("admin")}
              </span>
            )}
            <div className="min-w-0 flex-1">
              <Breadcrumbs pathname={pathname} variant={variant} t={t} />
            </div>
            <div className="flex items-center gap-0.5">
              {variant === "user" && <ConnectWalletButton className="me-1.5" />}
              <div className="hidden sm:flex sm:items-center sm:gap-0.5">
                <LanguageSwitcher />
              </div>
              {variant === "user" && <NotificationBell userId={viewer?.id} initialUnread={unreadCount} />}
              <Dropdown
                label={tu("account")}
                trigger={
                  <span className="grid h-8 w-8 place-items-center rounded-full border border-line bg-surface-2 text-xs font-semibold text-ink">
                    {initials}
                  </span>
                }
                items={[
                  { key: "who", label: viewer?.email || "", icon: <User className="h-4 w-4" aria-hidden="true" />, onSelect: () => router.push("/dashboard/settings") },
                  { key: "settings", label: tu("settings"), icon: <Settings className="h-4 w-4" aria-hidden="true" />, onSelect: () => router.push("/dashboard/settings") },
                  ...(viewer?.isStaff
                    ? [{ key: "admin", label: variant === "admin" ? tu("overview") : tu("admin"), icon: <ShieldCheck className="h-4 w-4" aria-hidden="true" />, onSelect: () => router.push(variant === "admin" ? "/dashboard" : "/admin") }]
                    : []),
                  { key: "logout", label: tu("logout"), icon: <LogOut className="h-4 w-4 rtl-flip" aria-hidden="true" />, onSelect: () => router.push("/logout") },
                ]}
              />
            </div>
          </header>
          <main id="main" tabIndex={-1} className="flex-1 px-4 py-6 outline-none sm:px-6 lg:px-8 lg:py-8">
            <div className="mx-auto w-full max-w-6xl">{children}</div>
          </main>
        </div>
      </div>
      {variant === "user" && !pathname.startsWith("/dashboard/support") && (
        <Link
          href="/dashboard/support"
          aria-label={tu("support")}
          title={tu("support")}
          className="fixed bottom-5 end-5 z-40 grid h-14 w-14 place-items-center rounded-full bg-[#22c55e] text-[#04120a] shadow-[0_10px_30px_-6px_rgb(34_197_94/0.6)] transition-transform hover:scale-105 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#22c55e] sm:bottom-6 sm:end-6"
        >
          <MessageCircleMore className="h-6 w-6" strokeWidth={2} aria-hidden="true" />
        </Link>
      )}
    </div>
  );
}
