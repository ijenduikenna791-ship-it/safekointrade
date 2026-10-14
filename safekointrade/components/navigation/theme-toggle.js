"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { useTranslations } from "next-intl";
import { Monitor, Moon, Sun } from "lucide-react";
import { Dropdown } from "@/components/ui/dropdown";
import { cn } from "@/lib/utils/cn";

const options = [
  { key: "light", icon: Sun },
  { key: "dark", icon: Moon },
  { key: "system", icon: Monitor },
];

export function useMounted() {
  const [mounted, setMounted] = useState(false);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setMounted(true), []);
  return mounted;
}

/** Navbar theme menu. */
export function ThemeToggle({ onChange }) {
  const t = useTranslations("theme");
  const { theme, resolvedTheme, setTheme } = useTheme();
  const mounted = useMounted();
  const CurrentIcon = mounted && resolvedTheme === "dark" ? Moon : Sun;

  return (
    <Dropdown
      label={t("label")}
      trigger={<CurrentIcon className="h-4 w-4" aria-hidden="true" />}
      items={options.map(({ key, icon: I }) => ({
        key,
        label: t(key),
        icon: <I className="h-4 w-4" aria-hidden="true" />,
        checked: mounted ? theme === key : undefined,
        onSelect: () => {
          setTheme(key);
          onChange?.(key);
        },
      }))}
    />
  );
}

/** Segmented control for settings pages and the mobile drawer. */
export function ThemeSegmented({ onChange, className }) {
  const t = useTranslations("theme");
  const { theme, setTheme } = useTheme();
  const mounted = useMounted();
  return (
    <div role="radiogroup" aria-label={t("label")} className={cn("inline-flex rounded-md border border-line bg-surface-2 p-0.5", className)}>
      {options.map(({ key, icon: I }) => {
        const active = mounted && theme === key;
        return (
          <button
            key={key}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => {
              setTheme(key);
              onChange?.(key);
            }}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-sm px-3 py-1.5 text-sm transition-colors",
              active ? "bg-surface text-ink shadow-sm" : "text-ink-muted hover:text-ink"
            )}
          >
            <I className="h-4 w-4" aria-hidden="true" />
            {t(key)}
          </button>
        );
      })}
    </div>
  );
}
