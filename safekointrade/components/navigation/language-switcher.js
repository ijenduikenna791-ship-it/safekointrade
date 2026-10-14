"use client";

import { useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useParams } from "next/navigation";
import { Languages } from "lucide-react";
import { usePathname, useRouter } from "@/lib/i18n/navigation";
import { locales, localeMeta } from "@/lib/i18n/routing";
import { Dropdown } from "@/components/ui/dropdown";

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
          <Languages className="h-4 w-4" aria-hidden="true" />
          <span className={compact ? "sr-only" : "uppercase tabular"}>{compact ? localeMeta[locale].native : locale}</span>
        </>
      }
      items={locales.map((l) => ({
        key: l,
        label: localeMeta[l].native,
        hint: l === locale ? undefined : localeMeta[l].label,
        lang: l,
        checked: l === locale,
        onSelect: () => l !== locale && change(l),
      }))}
    />
  );
}
