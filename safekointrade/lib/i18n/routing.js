import { defineRouting } from "next-intl/routing";

/**
 * Supported locales. To add a language:
 *   1. add its code here and in `localeMeta`
 *   2. create messages/<code>.json (copy en.json and translate)
 * Missing keys fall back to English automatically (see lib/i18n/request.js).
 */
export const locales = ["en", "fr", "es", "pt", "de", "it", "ru", "ar", "zh", "ja", "hi"];
export const defaultLocale = "en";
export const rtlLocales = ["ar"];

// `flag` is an ISO country code for the switcher icon (a language ≠ a country,
// so we pick the most common association).
export const localeMeta = {
  en: { label: "English", native: "English", intl: "en-US", flag: "GB" },
  fr: { label: "French", native: "Français", intl: "fr-FR", flag: "FR" },
  es: { label: "Spanish", native: "Español", intl: "es-ES", flag: "ES" },
  pt: { label: "Portuguese", native: "Português", intl: "pt-BR", flag: "BR" },
  de: { label: "German", native: "Deutsch", intl: "de-DE", flag: "DE" },
  it: { label: "Italian", native: "Italiano", intl: "it-IT", flag: "IT" },
  ru: { label: "Russian", native: "Русский", intl: "ru-RU", flag: "RU" },
  ar: { label: "Arabic", native: "العربية", intl: "ar", flag: "SA" },
  zh: { label: "Chinese", native: "中文", intl: "zh-CN", flag: "CN" },
  ja: { label: "Japanese", native: "日本語", intl: "ja-JP", flag: "JP" },
  hi: { label: "Hindi", native: "हिन्दी", intl: "hi-IN", flag: "IN" },
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
