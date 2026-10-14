import { getTranslations } from "next-intl/server";
import { Link } from "@/lib/i18n/navigation";
import { buttonClasses } from "@/components/ui/button";
import { Logo } from "@/components/ui/logo";

export default async function NotFound() {
  const t = await getTranslations("common");
  return (
    <main id="main" className="grid min-h-dvh place-items-center px-6 py-16">
      <div className="max-w-md text-center">
        <Logo className="justify-center" />
        <p className="mt-10 font-display text-6xl font-semibold text-brass">404</p>
        <h1 className="mt-4 text-2xl font-semibold">{t("notFoundTitle")}</h1>
        <p className="mt-2 text-ink-muted">{t("notFoundBody")}</p>
        <Link href="/" className={buttonClasses({ className: "mt-8" })}>{t("goHome")}</Link>
      </div>
    </main>
  );
}
