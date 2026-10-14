import { getTranslations } from "next-intl/server";
import { ScrollText, ShieldCheck, UserCheck } from "lucide-react";
import { Link } from "@/lib/i18n/navigation";
import { Logo } from "@/components/ui/logo";
import { LanguageSwitcher } from "@/components/navigation/language-switcher";
import { ThemeToggle } from "@/components/navigation/theme-toggle";
import { brand } from "@/lib/config/brand";

/** Two-column auth layout: brand panel (desktop) + form column. */
export async function AuthShell({ children }) {
  const t = await getTranslations("auth");
  const tc = await getTranslations("common");
  const points = [
    { key: "review", icon: UserCheck },
    { key: "ledger", icon: ScrollText },
    { key: "security", icon: ShieldCheck },
  ];
  return (
    <div className="grid min-h-dvh lg:grid-cols-[0.9fr_1.1fr]">
      <aside className="dark relative hidden overflow-hidden bg-brand-night p-12 text-[#e8eeec] lg:sticky lg:top-0 lg:flex lg:h-dvh lg:flex-col">
        <div aria-hidden="true" className="pointer-events-none absolute -top-1/4 start-0 h-2/3 w-full bg-[radial-gradient(closest-side,rgb(46_204_140/0.28),transparent)] blur-3xl" />
        <svg aria-hidden="true" className="pointer-events-none absolute -bottom-40 -start-40 h-[36rem] w-[36rem] text-[#123a31]" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="49" fill="none" stroke="currentColor" strokeWidth="0.3" strokeDasharray="0.6 0.9" />
          <circle cx="50" cy="50" r="38" fill="none" stroke="currentColor" strokeWidth="0.2" />
        </svg>
        <Link href="/" className="relative w-fit rounded-sm">
          <Logo />
        </Link>
        <div className="relative mt-auto max-w-md">
          <p className="font-display text-4xl font-semibold leading-tight tracking-[-0.03em]">{t("panelTitle")}</p>
          <ul className="mt-10 space-y-5">
            {points.map(({ key, icon: Icon }) => (
              <li key={key} className="flex gap-3 text-[#a7b7b9]">
                <Icon className="mt-0.5 h-5 w-5 shrink-0 text-brand-mint" aria-hidden="true" />
                {t(`panelPoints.${key}`)}
              </li>
            ))}
          </ul>
          {brand.demoMode && (
            <p className="mt-10 border-t border-[#123a31] pt-5 text-sm text-brand-mint">
              <strong>{tc("simulationTitle")}.</strong> {tc("simulationNotice")}
            </p>
          )}
        </div>
      </aside>

      <div className="flex flex-col">
        <header className="flex items-center justify-between gap-4 px-5 py-4 sm:px-8">
          <Link href="/" className="rounded-sm lg:invisible">
            <Logo />
          </Link>
          <div className="flex items-center gap-1">
            <LanguageSwitcher />
            <ThemeToggle />
          </div>
        </header>
        <main id="main" className="flex flex-1 items-start justify-center px-5 pb-16 pt-6 sm:items-center sm:px-8">
          <div className="w-full max-w-md">{children}</div>
        </main>
      </div>
    </div>
  );
}
