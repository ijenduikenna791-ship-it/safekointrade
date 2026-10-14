"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { useRouter } from "@/lib/i18n/navigation";
import { setTicketStatusAction } from "@/lib/actions/admin";
import { Select } from "@/components/ui/field";
import { useActionToast } from "./admin-controls";

export function TicketStatusControl({ id, status, priority }) {
  const t = useTranslations("admin.support");
  const tc = useTranslations("common");
  const router = useRouter();
  const check = useActionToast();
  const [busy, setBusy] = useState(false);

  const update = async (next) => {
    setBusy(true);
    const res = await setTicketStatusAction({ id, status, priority, ...next }).catch(() => ({ ok: false, error: "network" }));
    setBusy(false);
    if (!check(res)) return;
    toast.success(t("updated"));
    router.refresh();
  };

  return (
    <div className="flex flex-wrap gap-3">
      <label className="text-sm">
        <span className="mb-1 block text-ink-subtle">{t("setStatus")}</span>
        <Select value={status} disabled={busy} onChange={(e) => update({ status: e.target.value })} className="h-9 w-40">
          {["open", "answered", "closed"].map((s) => <option key={s} value={s}>{tc(`status.${s}`)}</option>)}
        </Select>
      </label>
      <label className="text-sm">
        <span className="mb-1 block text-ink-subtle">{t("setPriority")}</span>
        <Select value={priority} disabled={busy} onChange={(e) => update({ priority: e.target.value })} className="h-9 w-36">
          {["low", "normal", "high"].map((p) => <option key={p} value={p}>{t(`priorities.${p}`)}</option>)}
        </Select>
      </label>
    </div>
  );
}
