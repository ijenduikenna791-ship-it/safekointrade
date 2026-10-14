import { defineRouting } from "next-intl/routing";

/**
 * Supported locales. To add a language:
 *   1. add its code here and in `localeMeta`
 *   2. create messages/<code>.json (copy en.json and translate)
 * Missing keys fall back to English automatically (see lib/i18n/request.js).
 */
export const locales = ["en", "fr", "es", "pt", "ar", "de", "zh", "yo"];
export const defaultLocale = "en";
export const rtlLocales = ["ar"];

export const localeMeta = {
  en: { label: "English", native: "English", intl: "en-US" },
  fr: { label: "French", native: "Français", intl: "fr-FR" },
  es: { label: "Spanish", native: "Español", intl: "es-ES" },
  pt: { label: "Portuguese", native: "Português", intl: "pt-BR" },
  ar: { label: "Arabic", native: "العربية", intl: "ar" },
  de: { label: "German", native: "Deutsch", intl: "de-DE" },
  zh: { label: "Chinese", native: "中文", intl: "zh-CN" },
  yo: { label: "Yoruba", native: "Yorùbá", intl: "yo-NG" },
};

export const routing = defineRouting({
  locales,
  defaultLocale,
  localePrefix: "as-needed",
  localeCookie: { name: "NEXT_LOCALE", maxAge: 60 * 60 * 24 * 365 },
});

export function isRtl(locale) {
  return rtlLocales.includes(locale);
}
