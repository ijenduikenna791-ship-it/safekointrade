"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { useRouter } from "@/lib/i18n/navigation";
import { cancelWithdrawalAction } from "@/lib/actions/user";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";

export function CancelWithdrawal({ id }) {
  const t = useTranslations("dashboard.withdrawals");
  const tc = useTranslations("common");
  const te = useTranslations("errors");
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const go = async () => {
    setBusy(true);
    const res = await cancelWithdrawalAction(id).catch(() => ({ ok: false, error: "network" }));
    setBusy(false);
    setOpen(false);
    if (!res.ok) return toast.error(te.has(res.error) ? te(res.error) : te("generic"));
    toast.success(t("cancelled"));
    router.refresh();
  };

  return (
    <>
      <Button variant="ghost" size="sm" onClick={() => setOpen(true)}>{t("cancel")}</Button>
      <Dialog open={open} onClose={() => !busy && setOpen(false)} title={t("cancelTitle")} description={t("cancelBody")} closeLabel={tc("close")}>
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="secondary" onClick={() => setOpen(false)} disabled={busy}>{tc("back")}</Button>
          <Button variant="danger" onClick={go} loading={busy}>{t("cancel")}</Button>
        </div>
      </Dialog>
    </>
  );
}
