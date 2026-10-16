import { getTranslations } from "next-intl/server";
import { FlaskConical, X } from "lucide-react";
import { brand } from "@/lib/config/brand";

/**
 * Small corner tag shown on every page while demo mode is on. Opens to the full
 * notice. Turns off everywhere with NEXT_PUBLIC_DEMO_MODE=false.
 */
export async function SimulationBanner() {
  if (!brand.demoMode) return null;
  const t = await getTranslations("common");
  return (
    <details className="group fixed bottom-5 start-5 z-40 sm:bottom-6 sm:start-6">
      <summary className="flex h-9 cursor-pointer list-none items-center gap-1.5 rounded-full border border-white/15 bg-[#0a1224]/90 px-3 text-xs font-semibold text-white shadow-lg backdrop-blur-md hover:bg-[#0a1224] [&::-webkit-details-marker]:hidden">
        <FlaskConical className="h-3.5 w-3.5 text-[#74a5ff]" aria-hidden="true" />
        {t("simulationTag")}
      </summary>
      <div className="absolute bottom-11 start-0 w-[min(20rem,calc(100vw-2.5rem))] rounded-xl border border-white/15 bg-[#0a1224] p-4 text-sm text-white/85 shadow-xl">
        <p className="flex items-center justify-between gap-2 font-semibold text-white">
          {t("simulationTitle")}
          <X className="h-4 w-4 text-white/50" aria-hidden="true" />
        </p>
        <p className="mt-1.5 leading-relaxed">{t("simulationNotice")}</p>
      </div>
    </details>
  );
}
