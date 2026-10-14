import { getTranslations } from "next-intl/server";
import { LogoMark } from "@/components/ui/logo";

// Shared loading state for signed-in areas: a quiet pulse of the brand mark.
export default async function RouteLoading() {
  const t = await getTranslations("common");
  return (
    <div className="grid min-h-[60dvh] place-items-center" role="status" aria-live="polite">
      <LogoMark className="h-10 w-10 animate-pulse" />
      <span className="sr-only">{t("loading")}</span>
    </div>
  );
}
