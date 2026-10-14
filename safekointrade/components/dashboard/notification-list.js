"use client";

import { useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import { ArrowDownToLine, ArrowUpFromLine, Bell, Check, LifeBuoy, Megaphone, PiggyBank, ShieldCheck, Trash2, UserCog } from "lucide-react";
import { Link, useRouter } from "@/lib/i18n/navigation";
import { markNotificationAction } from "@/lib/actions/user";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/feedback";
import { useNotificationText } from "./notification-text";
import { formatDate } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";

const typeIcon = {
  deposit: ArrowDownToLine,
  withdrawal: ArrowUpFromLine,
  investment: PiggyBank,
  security: ShieldCheck,
  support: LifeBuoy,
  announcement: Megaphone,
  account: UserCog,
};

export function NotificationList({ items }) {
  const t = useTranslations("dashboard.notifications");
  const te = useTranslations("errors");
  const locale = useLocale();
  const text = useNotificationText();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [hidden, setHidden] = useState([]);

  const act = (id, action) =>
    startTransition(async () => {
      if (action === "delete") setHidden((h) => [...h, id]);
      const res = await markNotificationAction(id, action).catch(() => ({ ok: false, error: "network" }));
      if (!res.ok) {
        setHidden((h) => h.filter((x) => x !== id));
        toast.error(te.has(res.error) ? te(res.error) : te("generic"));
      }
      router.refresh();
    });

  const visible = items.filter((n) => !hidden.includes(n.id));
  const unread = visible.some((n) => !n.read_at);
  if (!visible.length) return <EmptyState icon={Bell} title={t("empty")} />;

  return (
    <>
      {unread && (
        <div className="flex justify-end border-b border-line px-5 py-3">
          <Button variant="ghost" size="sm" onClick={() => act("all", "read")} disabled={pending}>
            <Check className="h-4 w-4" aria-hidden="true" />
            {t("markAll")}
          </Button>
        </div>
      )}
      <ul className="divide-y divide-line">
        {visible.map((n) => {
          const { title, body } = text(n);
          const Icon = typeIcon[n.type] || Bell;
          return (
            <li key={n.id} className={cn("flex gap-4 px-5 py-4", !n.read_at && "bg-brass-soft/30")}>
              <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-full border border-line bg-surface-2 text-ink-muted">
                <Icon className="h-4 w-4" aria-hidden="true" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-2 font-medium">
                  {!n.read_at && <span className="h-1.5 w-1.5 rounded-full bg-brass" aria-hidden="true" />}
                  {n.link ? <Link href={n.link} className="hover:text-brass">{title}</Link> : title}
                </p>
                <p className="mt-0.5 text-sm text-ink-muted">{body}</p>
                <p className="mt-1 text-xs text-ink-subtle">{formatDate(n.created_at, { locale, withTime: true })}</p>
              </div>
              <div className="flex shrink-0 items-start gap-1">
                {!n.read_at && (
                  <button type="button" onClick={() => act(n.id, "read")} aria-label={t("markRead")} title={t("markRead")} className="grid h-8 w-8 place-items-center rounded-sm text-ink-subtle hover:bg-surface-2 hover:text-ink">
                    <Check className="h-4 w-4" aria-hidden="true" />
                  </button>
                )}
                <button type="button" onClick={() => act(n.id, "delete")} aria-label={t("delete")} title={t("delete")} className="grid h-8 w-8 place-items-center rounded-sm text-ink-subtle hover:bg-loss-soft hover:text-loss">
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </>
  );
}
