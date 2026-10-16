import { getTranslations } from "next-intl/server";
import { MessageCircle } from "lucide-react";
import { brand } from "@/lib/config/brand";

export async function WhatsAppButton() {
  if (!brand.whatsapp) return null;
  const t = await getTranslations("whatsapp");
  return (
    <a
      href={`https://wa.me/${brand.whatsapp}`}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={t("chat")}
      className="group fixed bottom-5 end-5 z-40 flex h-14 items-center gap-2 rounded-full bg-[#25d366] px-4 text-[#062e16] shadow-[0_12px_30px_-8px_rgb(37_211_102/0.65)] transition-transform hover:scale-105 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#25d366] sm:bottom-6 sm:end-6"
    >
      <MessageCircle className="h-6 w-6" strokeWidth={2.2} aria-hidden="true" />
      <span className="hidden text-sm font-semibold sm:inline">{t("chat")}</span>
    </a>
  );
}
