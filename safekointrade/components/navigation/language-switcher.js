"use client";

import { useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useParams } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { usePathname, useRouter } from "@/lib/i18n/navigation";
import { locales, localeMeta } from "@/lib/i18n/routing";
import { Dropdown } from "@/components/ui/dropdown";
import { cn } from "@/lib/utils/cn";

function Flag({ locale, className }) {
  return (
    // Decorative: the language name is always shown or announced next to it.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`/flags/${localeMeta[locale].flag}.svg`}
      alt=""
      width={20}
      height={14}
      className={cn("h-3.5 w-5 shrink-0 rounded-[2px] object-cover shadow-[0_0_0_1px_rgb(0_0_0/0.12)]", className)}
    />
  );
}

export function LanguageSwitcher({ compact = false, onChanged }) {
  const t = useTranslations("language");
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams();
  const [, startTransition] = useTransition();

  const change = (next) => {
    startTransition(() => {
      // Keeps the current page (and its dynamic params) in the new language.
      router.replace({ pathname, params }, { locale: next, scroll: false });
      onChanged?.(next);
    });
  };

  return (
    <Dropdown
      label={t("change")}
      trigger={
        <>
          <Flag locale={locale} />
          <span className={compact ? "sr-only" : "text-sm font-medium"}>{compact ? localeMeta[locale].native : locale.toUpperCase()}</span>
          <ChevronDown className="h-3.5 w-3.5 opacity-60" aria-hidden="true" />
        </>
      }
      items={locales.map((l) => ({
        key: l,
        icon: <Flag locale={l} />,
        label: localeMeta[l].native,
        hint: l === locale ? undefined : localeMeta[l].label,
        lang: l,
        checked: l === locale,
        onSelect: () => l !== locale && change(l),
      }))}
    />
  );
}
