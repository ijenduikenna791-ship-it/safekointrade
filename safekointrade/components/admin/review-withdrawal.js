"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import { useRouter } from "@/lib/i18n/navigation";
import { reviewWithdrawalAction } from "@/lib/actions/admin";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field, Input, Textarea } from "@/components/ui/field";
import { Alert } from "@/components/ui/feedback";
import { formatDate, formatMoney } from "@/lib/utils/format";
import { useActionToast } from "./admin-controls";

// Allowed next steps per status — mirrors public.review_withdrawal().
const NEXT = {
  pending: ["processing", "approve", "reject"],
  processing: ["approve", "reject"],
  approved: ["complete", "reject"],
};

export function ReviewWithdrawal({ withdrawal: w, canReview, selfReview }) {
  const t = useTranslations("admin.withdrawals");
  const ta = useTranslations("admin.common");
  const tad = useTranslations("admin.deposits");
  const tc = useTranslations("common");
  const tw = useTranslations("dashboard.withdrawals");
  const tdd = useTranslations("dashboard.deposits");
  const locale = useLocale();
  const router = useRouter();
  const check = useActionToast();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState(null);
  const [note, setNote] = useState("");
  const [payoutRef, setPayoutRef] = useState("");
  const [busy, setBusy] = useState(false);
  const steps = NEXT[w.status] || [];
  const actionable = canReview && steps.length > 0;

  const run = async (decision) => {
    setBusy(true);
    const res = await reviewWithdrawalAction({ id: w.id, decision, note, payoutReference: payoutRef }).catch(() => ({ ok: false, error: "network" }));
    setBusy(false);
    if (!check(res)) return;
    toast.success(t("updated"));
    setOpen(false);
    setMode(null);
    router.refresh();
  };

  const titles = {
    approve: [t("approveTitle", { reference: w.reference }), t("approveBody")],
    complete: [t("completeTitle", { reference: w.reference }), t("completeBody")],
    reject: [t("rejectTitle", { reference: w.reference }), t("rejectBody")],
  };

  return (
    <>
      <Button size="sm" variant={actionable ? "primary" : "ghost"} onClick={() => { setMode(null); setOpen(true); }}>
        {actionable ? ta("review") : ta("view")}
      </Button>
      <Dialog
        open={open}
        onClose={() => !busy && setOpen(false)}
        title={mode ? titles[mode][0] : w.reference}
        description={mode ? titles[mode][1] : w.user?.email}
        closeLabel={tc("close")}
      >
        {!mode && (
          <>
            <dl className="divide-y divide-line rounded-md border border-line text-sm">
              {[
                [tw("amount"), formatMoney(w.amount, { locale })],
                [tw("fee"), formatMoney(w.fee, { locale })],
                [tw("net"), formatMoney(w.net_amount, { locale })],
                [tw("asset"), `${w.asset_symbol} · ${w.network}`],
                [ta("status"), tc(`status.${w.status}`)],
                [tdd("requested"), formatDate(w.created_at, { locale, withTime: true })],
              ].map(([k, v], i) => (
                <div key={i} className="grid grid-cols-[9rem_1fr] gap-3 px-4 py-2.5">
                  <dt className="text-ink-subtle">{k}</dt>
                  <dd className="tabular break-words">{v}</dd>
                </div>
              ))}
              <div className="px-4 py-2.5">
                <dt className="text-ink-subtle">{tw("destination")}</dt>
                <dd className="mt-1 break-all font-mono text-xs" dir="ltr">{w.destination}</dd>
              </div>
              {w.review_note && (
                <div className="px-4 py-2.5">
                  <dt className="text-ink-subtle">{tad("note")}</dt>
                  <dd className="mt-1">{w.review_note}</dd>
                </div>
              )}
            </dl>
            {actionable && selfReview && <Alert tone="warn" className="mt-4">{tad("selfReview")}</Alert>}
            {actionable && !selfReview && (
              <div className="mt-6 flex flex-wrap justify-end gap-2">
                {steps.includes("reject") && <Button variant="danger-outline" onClick={() => setMode("reject")}>{t("reject")}</Button>}
                {steps.includes("processing") && <Button variant="secondary" onClick={() => run("processing")} loading={busy}>{t("processing")}</Button>}
                {steps.includes("approve") && <Button onClick={() => setMode("approve")}>{t("approve")}</Button>}
                {steps.includes("complete") && <Button variant="success" onClick={() => setMode("complete")}>{t("complete")}</Button>}
              </div>
            )}
          </>
        )}
        {mode && (
          <div className="space-y-4">
            {mode === "complete" && (
              <Field label={t("payoutReference")}>
                {(a) => <Input {...a} value={payoutRef} onChange={(e) => setPayoutRef(e.target.value)} maxLength={140} spellCheck={false} className="font-mono text-sm" />}
              </Field>
            )}
            <Field label={mode === "reject" ? tad("reason") : tad("note")} optional={mode !== "reject"} optionalText={tc("optional")}>
              {(a) => <Textarea {...a} rows={2} value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} />}
            </Field>
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button variant="secondary" onClick={() => setMode(null)} disabled={busy}>{tc("back")}</Button>
              <Button
                variant={mode === "reject" ? "danger" : mode === "complete" ? "success" : "primary"}
                onClick={() => run(mode)}
                loading={busy}
                disabled={(mode === "reject" && note.trim().length < 4) || (mode === "complete" && !payoutRef.trim())}
              >
                {t(mode)}
              </Button>
            </div>
          </div>
        )}
      </Dialog>
    </>
  );
}
