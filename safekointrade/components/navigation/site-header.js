"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { AnimatePresence, motion } from "framer-motion";
import { Building2, ChartCandlestick, CircleHelp, Layers, LayoutDashboard, LogIn, Menu, UserPlus, Workflow, X } from "lucide-react";
import { Link, usePathname } from "@/lib/i18n/navigation";
import { Logo } from "@/components/ui/logo";
import { buttonClasses } from "@/components/ui/button";
import { LanguageSwitcher } from "./language-switcher";
import { ThemeToggle, ThemeSegmented } from "./theme-toggle";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils/cn";

const links = [
  { href: "/#markets", key: "markets", icon: ChartCandlestick },
  { href: "/#plans", key: "plans", icon: Layers, highlight: true },
  { href: "/#how", key: "how", icon: Workflow },
  { href: "/about", key: "about", icon: Building2 },
  { href: "/#faq", key: "faq", icon: CircleHelp },
];

function useSignedIn() {
  const [signedIn, setSignedIn] = useState(false);
  useEffect(() => {
    const supabase = createClient();
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => setSignedIn(Boolean(data.session)));
    const { data } = supabase.auth.onAuthStateChange((_e, session) => setSignedIn(Boolean(session)));
    return () => data.subscription.unsubscribe();
  }, []);
  return signedIn;
}

export function SiteHeader() {
  const t = useTranslations("nav");
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const signedIn = useSignedIn();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close the drawer on navigation and lock body scroll while it's open.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <header
      className={cn(
        "sticky top-0 z-40 border-b bg-surface transition-shadow duration-200",
        scrolled || open ? "border-line shadow-md" : "border-line/60"
      )}
    >
      <div className="container-page flex h-[4.5rem] items-center gap-4">
        <Link href="/" className="rounded-sm" aria-label={t("home")}>
          <Logo />
        </Link>

        <nav aria-label={t("primary")} className="hidden flex-1 xl:block">
          <ul className="flex items-center gap-1">
            {links.map((l) => (
              <li key={l.key}>
                <Link
                  href={l.href}
                  className={cn(
                    "group inline-flex items-center gap-1.5 whitespace-nowrap rounded-md px-2.5 py-2 text-[0.95rem] font-medium transition-colors",
                    l.highlight
                      ? "ms-1 bg-brand-mint text-brand-teal hover:bg-brand-mint-hover"
                      : "text-ink hover:bg-surface-2 hover:text-brand-mint-ink"
                  )}
                >
                  <l.icon
                    className={cn("h-4 w-4 shrink-0", l.highlight ? "text-brand-teal" : "text-ink-subtle group-hover:text-brand-mint-ink")}
                    aria-hidden="true"
                  />
                  {t(l.key)}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="ms-auto hidden items-center gap-1 xl:flex">
          <LanguageSwitcher />
          <ThemeToggle />
          <span className="mx-2 h-5 w-px bg-line" aria-hidden="true" />
          {signedIn ? (
            <Link href="/dashboard" className={buttonClasses({ variant: "teal", size: "md" })}>
              <LayoutDashboard className="h-4 w-4" aria-hidden="true" />
              {t("dashboard")}
            </Link>
          ) : (
            <>
              <Link href="/login" className={buttonClasses({ variant: "teal", size: "md" })}>
                <LogIn className="h-4 w-4" aria-hidden="true" />
                {t("login")}
              </Link>
              <Link href="/register" className={buttonClasses({ variant: "orange", size: "md", className: "ms-2" })}>
                <UserPlus className="h-4 w-4" aria-hidden="true" />
                {t("signUp")}
              </Link>
            </>
          )}
        </div>

        <button
          type="button"
          className="ms-auto grid h-10 w-10 place-items-center rounded-md text-ink hover:bg-surface-2 xl:hidden"
          aria-expanded={open}
          aria-controls="mobile-nav"
          aria-label={open ? t("closeMenu") : t("openMenu")}
          onClick={() => setOpen((o) => !o)}
        >
          {open ? <X className="h-5 w-5" aria-hidden="true" /> : <Menu className="h-5 w-5" aria-hidden="true" />}
        </button>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            id="mobile-nav"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "calc(100dvh - 4.5rem)" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.22, ease: [0.25, 1, 0.5, 1] }}
            className="overflow-y-auto border-t border-line bg-surface xl:hidden"
          >
            <nav aria-label={t("primary")} className="container-page flex flex-col py-4">
              {links.map((l, i) => (
                <motion.div
                  key={l.key}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.04 * i + 0.05 }}
                >
                  <Link
                    href={l.href}
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-3 border-b border-line py-3.5 font-display text-lg font-medium"
                  >
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-brand-mint/15 text-brand-mint-ink" aria-hidden="true">
                      <l.icon className="h-[1.1rem] w-[1.1rem]" />
                    </span>
                    {t(l.key)}
                  </Link>
                </motion.div>
              ))}
              <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
                <LanguageSwitcher compact={false} />
                <ThemeSegmented />
              </div>
              <div className="mt-6 grid gap-2">
                {signedIn ? (
                  <Link href="/dashboard" className={buttonClasses({ variant: "teal", size: "lg" })}>{t("dashboard")}</Link>
                ) : (
                  <>
                    <Link href="/register" className={buttonClasses({ variant: "orange", size: "lg" })}>{t("signUp")}</Link>
                    <Link href="/login" className={buttonClasses({ variant: "teal", size: "lg" })}>{t("login")}</Link>
                  </>
                )}
              </div>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
