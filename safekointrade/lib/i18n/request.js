import { getRequestConfig } from "next-intl/server";
import { hasLocale } from "next-intl";
import { routing } from "./routing";
import en from "@/messages/en.json";

function deepMerge(base, override) {
  if (typeof base !== "object" || base === null) return override ?? base;
  const out = Array.isArray(base) ? [...base] : { ...base };
  for (const key of Object.keys(override || {})) {
    const value = override[key];
    out[key] =
      value && typeof value === "object" && !Array.isArray(value)
        ? deepMerge(base[key] ?? {}, value)
        : value;
  }
  return out;
}

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = hasLocale(routing.locales, requested) ? requested : routing.defaultLocale;

  // English is the source language; other locales are merged over it so any
  // untranslated key falls back to English instead of showing a raw key.
  let messages = en;
  if (locale !== "en") {
    const localeMessages = (await import(`@/messages/${locale}.json`)).default;
    messages = deepMerge(en, localeMessages);
  }

  return {
    locale,
    messages,
    timeZone: "UTC",
    onError(error) {
      if (error.code !== "MISSING_MESSAGE") console.error(error);
    },
    getMessageFallback({ namespace, key }) {
      return [namespace, key].filter(Boolean).join(".");
    },
  };
});
