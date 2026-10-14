import { localeMeta, defaultLocale } from "@/lib/i18n/routing";

function intlLocale(locale) {
  return localeMeta[locale]?.intl || localeMeta[defaultLocale].intl;
}

/** Money values arrive from Postgres `numeric` as strings — keep precision until display. */
export function toNumber(value) {
  if (value === null || value === undefined || value === "") return 0;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
}

export function formatMoney(value, { locale = defaultLocale, currency = "USD", compact = false } = {}) {
  return new Intl.NumberFormat(intlLocale(locale), {
    style: "currency",
    currency,
    notation: compact ? "compact" : "standard",
    maximumFractionDigits: compact ? 1 : 2,
    minimumFractionDigits: compact ? 0 : 2,
  }).format(toNumber(value));
}

export function formatNumber(value, { locale = defaultLocale, maximumFractionDigits = 2 } = {}) {
  return new Intl.NumberFormat(intlLocale(locale), { maximumFractionDigits }).format(toNumber(value));
}

export function formatPercent(value, { locale = defaultLocale, signed = false } = {}) {
  return new Intl.NumberFormat(intlLocale(locale), {
    style: "percent",
    maximumFractionDigits: 2,
    signDisplay: signed ? "exceptZero" : "auto",
  }).format(toNumber(value) / 100);
}

export function formatDate(value, { locale = defaultLocale, withTime = false } = {}) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat(intlLocale(locale), {
    dateStyle: "medium",
    ...(withTime ? { timeStyle: "short" } : {}),
    timeZone: "UTC",
  }).format(date);
}

export function shortId(id) {
  return id ? String(id).slice(0, 8).toUpperCase() : "—";
}
