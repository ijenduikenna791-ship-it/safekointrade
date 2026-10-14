"use client";

import { useTranslations } from "next-intl";

/**
 * Renders a notification in the reader's language when the database stored a
 * template key; falls back to the stored English text otherwise.
 */
export function useNotificationText() {
  const t = useTranslations("dashboard.notifications.templates");
  return (n) => {
    if (n.template && t.has(`${n.template}.title`)) {
      const params = n.params || {};
      return { title: t(`${n.template}.title`, params), body: t(`${n.template}.body`, params) };
    }
    return { title: n.title, body: n.body };
  };
}
