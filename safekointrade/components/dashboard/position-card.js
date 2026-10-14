"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import { useRouter } from "@/lib/i18n/navigation";
import { cancelInvestmentAction } from "@/lib/actions/user";
import { StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { formatDate, formatMoney } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";

const DAY = 86_400_000;

export function PositionCard({ position: p, compact = false, now }) {
  const t = useTranslations("dashboard.positions");
  const tc = useTranslations("common");
  const te = useTranslations("errors");
  const locale = useLocale();
  const router = useRouter();
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);

  // `now` comes from the server render so server and client agree.
  const nowMs = now ? new Date(now).getTime() : new Date(p.started_at).getTime();
  const start = new Date(p.started_at).getTime();
  const end = new Date(p.matures_at).getTime();
  const total = p.term_days;
  const day = Math.min(total, Math.max(1, Math.ceil((nowMs - start) / DAY)));
  const progress = p.status === "active" ? Math.min(1, Math.max(0, (nowMs - start) / (end - start))) : p.status === "matured" ? 1 : 0;
  const cancelUntil = start + DAY;
  const cancellable = p.status === "active" && now && nowMs < cancelUntil;

  const cancel = async () => {
    setBusy(true);
    const res = await cancelInvestmentAction(p.id).catch(() => ({ ok: false, error: "network" }));
    setBusy(false);
    if (!res.ok) return toast.error(te.has(res.error) ? te(res.error) : te("generic"));
    setConfirm(false);
    toast.success(t("cancelled"));
    router.refresh();
  };

  return (
    <div className={cn("px-5 py-4", !compact && "rounded-lg border border-line bg-surface")}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-medium">{p.plan_name}</p>
          <p className="tabular text-xs text-ink-subtle">{p.reference}</p>
        </div>
        <div className="text-end">
          <p className="font-display text-lg font-semibold">{formatMoney(p.amount, { locale })}</p>
          {!compact && <StatusBadge status={p.status} label={tc(`status.${p.status}`)} />}
        </div>
      </div>

      {p.status !== "cancelled" && (
        <div className="mt-3">
          <div className="h-1.5 overflow-hidden rounded-full bg-surface-3" aria-hidden="true">
            <div className={cn("h-full rounded-full", p.status === "matured" ? "bg-gain" : "bg-brass")} style={{ width: `${progress * 100}%` }} />
          </div>
          <div className="mt-2 flex flex-wrap justify-between gap-2 text-xs text-ink-subtle">
            <span className="tabular">{p.status === "active" ? t("progress", { day, total }) : `${total} d`}</span>
            <span>
              {p.status === "matured"
                ? `${t("maturedOn")} ${formatDate(p.matured_at || p.matures_at, { locale })}`
                : `${t("matures")} ${formatDate(p.matures_at, { locale })}`}
            </span>
          </div>
        </div>
      )}
      {p.status === "cancelled" && (
        <p className="mt-2 text-xs text-ink-subtle">{t("cancelledOn")} {formatDate(p.cancelled_at, { locale, withTime: true })}</p>
      )}

      {!compact && cancellable && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-3">
          <p className="text-xs text-ink-subtle">{t("cancelUntil", { time: formatDate(cancelUntil, { locale, withTime: true }) })}</p>
          <Button variant="danger-outline" size="sm" onClick={() => setConfirm(true)}>{t("cancel")}</Button>
        </div>
      )}

      <Dialog open={confirm} onClose={() => !busy && setConfirm(false)} title={t("cancelTitle")} description={t("cancelBody")} closeLabel={tc("close")}>
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="secondary" onClick={() => setConfirm(false)} disabled={busy}>{tc("cancel")}</Button>
          <Button variant="danger" onClick={cancel} loading={busy}>{t("cancelConfirm")}</Button>
        </div>
      </Dialog>
    </div>
  );
}
