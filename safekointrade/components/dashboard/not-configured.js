import { getTranslations } from "next-intl/server";
import { Database } from "lucide-react";
import { Link } from "@/lib/i18n/navigation";
import { buttonClasses } from "@/components/ui/button";

/** Shown in place of private areas until Supabase credentials are configured. */
export async function NotConfigured() {
  const t = await getTranslations("common");
  return (
    <main id="main" className="grid min-h-dvh place-items-center px-6">
      <div className="max-w-lg text-center">
        <span className="mx-auto grid h-12 w-12 place-items-center rounded-full border border-warn/30 bg-warn-soft text-warn">
          <Database className="h-5 w-5" aria-hidden="true" />
        </span>
        <h1 className="mt-6 text-2xl font-semibold">{t("notConfiguredTitle")}</h1>
        <p className="mt-2 text-ink-muted">{t("notConfigured")}</p>
        <Link href="/" className={buttonClasses({ variant: "secondary", className: "mt-8" })}>{t("goHome")}</Link>
      </div>
    </main>
  );
}
