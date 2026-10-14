"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, Search } from "lucide-react";
import { AsYouType, getCountries, getCountryCallingCode, parsePhoneNumberFromString } from "libphonenumber-js/min";
import { inputClasses } from "@/components/ui/field";
import { cn } from "@/lib/utils/cn";
import { localeMeta } from "@/lib/i18n/routing";

function Flag({ code, className }) {
  // Flags are static SVGs in /public/flags (country-flag-icons, MIT).
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={`/flags/${code}.svg`} alt="" width={21} height={14} loading="lazy" className={cn("h-3.5 w-[21px] shrink-0 rounded-[2px] object-cover shadow-[0_0_0_1px_rgb(0_0_0/0.08)]", className)} />;
}

/** Best-guess default country from the browser language, e.g. "en-NG" -> NG. */
function guessCountry(fallback) {
  if (typeof navigator === "undefined") return fallback;
  for (const lang of navigator.languages || [navigator.language]) {
    const region = lang?.split("-")[1]?.toUpperCase();
    if (region && getCountries().includes(region)) return region;
  }
  return fallback;
}

/**
 * International phone input: searchable country list (keyboard accessible),
 * flag + dial code, as-you-type formatting. Emits an E.164 string
 * (e.g. +2348012345678) through `onChange`; validation happens in the schema.
 */
export function PhoneInput({ value, onChange, onBlur, id, defaultCountry = "NG", invalid, describedBy, name }) {
  const t = useTranslations("phone");
  const locale = useLocale();
  const listId = useId();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const [country, setCountry] = useState(() => {
    const parsed = value ? parsePhoneNumberFromString(value) : null;
    return parsed?.country || defaultCountry;
  });
  const [national, setNational] = useState(() => {
    const parsed = value ? parsePhoneNumberFromString(value) : null;
    return parsed ? parsed.formatNational() : "";
  });
  const rootRef = useRef(null);
  const searchRef = useRef(null);
  const listRef = useRef(null);

  // Pick a sensible default after mount (browser region), unless a value was given.
  useEffect(() => {
    if (!value) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCountry((c) => guessCountry(c));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const names = useMemo(() => {
    let display;
    try {
      display = new Intl.DisplayNames([localeMeta[locale]?.intl || "en"], { type: "region" });
    } catch {
      display = null;
    }
    return getCountries()
      .map((code) => ({ code, name: display?.of(code) || code, dial: `+${getCountryCallingCode(code)}` }))
      .sort((a, b) => a.name.localeCompare(b.name, locale));
  }, [locale]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase().replace(/^\+/, "");
    if (!q) return names;
    return names.filter((c) => c.name.toLowerCase().includes(q) || c.code.toLowerCase() === q || c.dial.slice(1).startsWith(q));
  }, [names, query]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e) => !rootRef.current?.contains(e.target) && setOpen(false);
    document.addEventListener("pointerdown", onDown);
    const timer = setTimeout(() => searchRef.current?.focus(), 20);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      clearTimeout(timer);
    };
  }, [open]);

  useEffect(() => {
    listRef.current?.querySelector(`[data-index="${active}"]`)?.scrollIntoView({ block: "nearest" });
  }, [active]);

  const emit = (nextCountry, nextNational) => {
    const digits = nextNational.replace(/[^\d+]/g, "");
    if (!digits) return onChange?.("");
    const parsed = parsePhoneNumberFromString(digits, nextCountry);
    onChange?.(parsed?.number || `+${getCountryCallingCode(nextCountry)}${digits.replace(/^0+/, "")}`);
  };

  const choose = (code) => {
    setCountry(code);
    setOpen(false);
    setQuery("");
    emit(code, national);
  };

  const onListKey = (e) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => Math.min(filtered.length - 1, i + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(0, i - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (filtered[active]) choose(filtered[active].code);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  const dial = `+${getCountryCallingCode(country)}`;
  const current = names.find((c) => c.code === country);

  return (
    <div ref={rootRef} className="relative">
      <div className="flex" dir="ltr">
        <button
          type="button"
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-label={`${t("country")}: ${current?.name ?? country} ${dial}`}
          onClick={() => setOpen((o) => !o)}
          className={cn(
            inputClasses,
            "flex w-auto shrink-0 items-center gap-2 rounded-e-none border-e-0 px-3 text-sm",
            invalid && "border-loss"
          )}
        >
          <Flag code={country} />
          <span className="tabular text-ink-muted">{dial}</span>
          <ChevronDown className="h-3.5 w-3.5 text-ink-subtle" aria-hidden="true" />
        </button>
        <input
          id={id}
          name={name}
          type="tel"
          inputMode="tel"
          autoComplete="tel-national"
          value={national}
          onBlur={onBlur}
          onChange={(e) => {
            const formatted = new AsYouType(country).input(e.target.value);
            setNational(formatted);
            emit(country, formatted);
          }}
          aria-invalid={invalid || undefined}
          aria-describedby={describedBy}
          className={cn(inputClasses, "min-w-0 flex-1 rounded-s-none")}
        />
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.14 }}
            className="absolute inset-x-0 top-full z-50 mt-1.5 overflow-hidden rounded-md border border-line bg-surface shadow-lg sm:end-auto sm:w-80"
          >
            <div className="relative border-b border-line">
              <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-subtle" aria-hidden="true" />
              <input
                ref={searchRef}
                type="search"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setActive(0);
                }}
                onKeyDown={onListKey}
                placeholder={t("search")}
                aria-label={t("search")}
                aria-controls={listId}
                aria-activedescendant={filtered[active] ? `${listId}-${filtered[active].code}` : undefined}
                role="combobox"
                aria-expanded="true"
                className="h-11 w-full bg-transparent ps-9 pe-3 text-sm outline-none placeholder:text-ink-subtle"
              />
            </div>
            <ul ref={listRef} id={listId} role="listbox" aria-label={t("country")} className="max-h-64 overflow-y-auto py-1">
              {filtered.length === 0 && <li className="px-3 py-3 text-sm text-ink-subtle">{t("noMatch")}</li>}
              {filtered.map((c, i) => (
                <li
                  key={c.code}
                  id={`${listId}-${c.code}`}
                  data-index={i}
                  role="option"
                  aria-selected={c.code === country}
                  onMouseEnter={() => setActive(i)}
                  onClick={() => choose(c.code)}
                  className={cn(
                    "flex cursor-pointer items-center gap-3 px-3 py-2 text-sm",
                    i === active && "bg-surface-2",
                    c.code === country && "font-medium"
                  )}
                >
                  <Flag code={c.code} />
                  <span className="flex-1 truncate">{c.name}</span>
                  <span className="tabular text-ink-subtle" dir="ltr">{c.dial}</span>
                </li>
              ))}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
