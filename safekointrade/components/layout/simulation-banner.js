import { getTranslations } from "next-intl/server";
import { FlaskConical } from "lucide-react";
import { brand } from "@/lib/config/brand";

/** Persistent strip shown on every page while demo mode is on. */
export async function SimulationBanner() {
  if (!brand.demoMode) return null;
  const t = await getTranslations("common");
  return (
    <div className="border-b border-brass-line bg-brass-soft text-brass">
      <p className="container-page flex items-center gap-2 py-2 text-xs sm:text-sm">
        <FlaskConical className="h-4 w-4 shrink-0" aria-hidden="true" />
        <span>
          <strong className="font-semibold">{t("simulationTitle")}.</strong> {t("simulationNotice")}
        </span>
      </p>
    </div>
  );
}
