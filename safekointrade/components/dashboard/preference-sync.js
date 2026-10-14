"use client";

import { useEffect } from "react";
import { useLocale } from "next-intl";
import { useTheme } from "next-themes";
import { usePathname, useRouter } from "@/lib/i18n/navigation";

const KEY = "prefs-synced";

/**
 * Once per browser session, applies the theme and language saved on the
 * user's profile — so preferences follow them to a new device. Choices made
 * afterwards in this session (navbar toggles) are left alone.
 */
export function PreferenceSync({ theme, locale: savedLocale }) {
  const { setTheme } = useTheme();
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    let done = false;
    try {
      done = sessionStorage.getItem(KEY) === "1";
      sessionStorage.setItem(KEY, "1");
    } catch {}
    if (done) return;
    if (theme) setTheme(theme);
    if (savedLocale && savedLocale !== locale) router.replace(pathname, { locale: savedLocale });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
