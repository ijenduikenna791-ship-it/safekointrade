"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { AnimatePresence, motion } from "framer-motion";
import { Bell } from "lucide-react";
import { Link } from "@/lib/i18n/navigation";
import { createClient } from "@/lib/supabase/client";
import { formatDate } from "@/lib/utils/format";
import { useNotificationText } from "./notification-text";
import { cn } from "@/lib/utils/cn";

/**
 * Header bell with unread badge. Subscribes to Supabase Realtime for new rows;
 * RLS ensures only the signed-in user's notifications are delivered.
 */
export function NotificationBell({ userId, initialUnread = 0 }) {
  const t = useTranslations("dashboard.notifications");
  const locale = useLocale();
  const text = useNotificationText();
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(initialUnread);
  const [items, setItems] = useState(null);
  const rootRef = useRef(null);

  const load = useCallback(async () => {
    const supabase = createClient();
    if (!supabase || !userId) return;
    const [{ data }, { count }] = await Promise.all([
      supabase.from("notifications").select("id, type, template, params, title, body, link, read_at, created_at").order("created_at", { ascending: false }).limit(6),
      supabase.from("notifications").select("id", { count: "exact", head: true }).is("read_at", null),
    ]);
    setItems(data || []);
    if (typeof count === "number") setUnread(count);
  }, [userId]);

  useEffect(() => {
    const supabase = createClient();
    if (!supabase || !userId) return;
    const channel = supabase
      .channel(`notifications:${userId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` }, (payload) => {
        setUnread((u) => u + 1);
        setItems((list) => (list ? [payload.new, ...list].slice(0, 6) : list));
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  useEffect(() => {
    if (!open) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
    const onDown = (e) => !rootRef.current?.contains(e.target) && setOpen(false);
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, load]);

  const markAll = async () => {
    const supabase = createClient();
    if (!supabase) return;
    await supabase.rpc("mark_all_notifications_read");
    setUnread(0);
    setItems((list) => list?.map((n) => ({ ...n, read_at: n.read_at || new Date().toISOString() })));
  };

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label={`${t("bell")}. ${t("unread", { count: unread })}`}
        className="relative grid h-9 w-9 place-items-center rounded-md text-ink-muted hover:bg-surface-2 hover:text-ink"
      >
        <Bell className="h-[18px] w-[18px]" aria-hidden="true" />
        {unread > 0 && (
          <span className="tabular absolute end-1 top-1 grid min-w-4 place-items-center rounded-full bg-loss px-1 text-[10px] font-semibold leading-4 text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            role="dialog"
            aria-label={t("title")}
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.14 }}
            className="absolute end-0 top-full z-50 mt-2 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-lg border border-line bg-surface shadow-lg"
          >
            <div className="flex items-center justify-between border-b border-line px-4 py-3">
              <p className="text-sm font-semibold">{t("title")}</p>
              {unread > 0 && (
                <button type="button" onClick={markAll} className="text-xs font-medium text-brass hover:underline">{t("markAll")}</button>
              )}
            </div>
            <ul className="max-h-96 divide-y divide-line overflow-y-auto">
              {items === null && <li className="px-4 py-6 text-sm text-ink-subtle">…</li>}
              {items?.length === 0 && <li className="px-4 py-8 text-center text-sm text-ink-subtle">{t("empty")}</li>}
              {items?.map((n) => {
                const { title, body } = text(n);
                return (
                  <li key={n.id} className={cn("px-4 py-3", !n.read_at && "bg-brass-soft/40")}>
                    <Link href={n.link || "/dashboard/notifications"} onClick={() => setOpen(false)} className="block">
                      <p className="flex items-start gap-2 text-sm font-medium">
                        {!n.read_at && <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brass" aria-hidden="true" />}
                        {title}
                      </p>
                      <p className="mt-0.5 line-clamp-2 text-sm text-ink-muted">{body}</p>
                      <p className="mt-1 text-xs text-ink-subtle">{formatDate(n.created_at, { locale, withTime: true })}</p>
                    </Link>
                  </li>
                );
              })}
            </ul>
            <Link href="/dashboard/notifications" onClick={() => setOpen(false)} className="block border-t border-line px-4 py-3 text-center text-sm font-medium text-brass hover:bg-surface-2">
              {t("viewAll")}
            </Link>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
