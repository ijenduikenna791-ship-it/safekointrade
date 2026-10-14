"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import { FileText } from "lucide-react";
import { useRouter } from "@/lib/i18n/navigation";
import { reviewDepositAction, staffReceiptUrlAction } from "@/lib/actions/admin";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field, Input, Textarea } from "@/components/ui/field";
import { Alert } from "@/components/ui/feedback";
import { formatDate, formatMoney } from "@/lib/utils/format";
import { useActionToast } from "./admin-controls";

export function ReviewDeposit({ deposit: d, canReview, selfReview }) {
  const t = useTranslations("admin.deposits");
  const ta = useTranslations("admin.common");
  const tc = useTranslations("common");
  const td = useTranslations("dashboard.deposits");
  const locale = useLocale();
  const router = useRouter();
  const check = useActionToast();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState(null); // "approve" | "reject"
  const [amount, setAmount] = useState(d.amount);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    const res = await reviewDepositAction({ id: d.id, decision: mode, note, creditedAmount: mode === "approve" ? amount : "" }).catch(() => ({ ok: false, error: "network" }));
    setBusy(false);
    if (!check(res)) return;
    toast.success(mode === "approve" ? t("approved") : t("rejected"));
    setOpen(false);
    router.refresh();
  };

  const viewReceipt = async () => {
    const res = await staffReceiptUrlAction(d.id).catch(() => ({ ok: false, error: "network" }));
    if (check(res)) window.open(res.data.url, "_blank", "noopener,noreferrer");
  };

  return (
    <>
      <Button size="sm" variant={d.status === "pending" && canReview ? "primary" : "ghost"} onClick={() => { setMode(null); setOpen(true); }}>
        {d.status === "pending" && canReview ? ta("review") : ta("view")}
      </Button>
      <Dialog
        open={open}
        onClose={() => !busy && setOpen(false)}
        title={mode === "approve" ? t("approveTitle", { reference: d.reference }) : mode === "reject" ? t("rejectTitle", { reference: d.reference }) : d.reference}
        description={mode === "approve" ? t("approveBody") : mode === "reject" ? t("rejectBody") : d.user?.email}
        closeLabel={tc("close")}
      >
        {!mode && (
          <>
            <dl className="divide-y divide-line rounded-md border border-line text-sm">
              {[
                [td("amount"), formatMoney(d.amount, { locale })],
                [td("asset"), `${d.asset_symbol} · ${td(`methods.${d.method}`)}`],
                [t("txReference"), d.tx_reference || "—"],
                [t("customerNote"), d.note || "—"],
                [td("requested"), formatDate(d.created_at, { locale, withTime: true })],
                [ta("status"), tc(`status.${d.status}`)],
              ].map(([k, v]) => (
                <div key={k} className="grid grid-cols-[9rem_1fr] gap-3 px-4 py-2.5">
                  <dt className="text-ink-subtle">{k}</dt>
                  <dd className="break-words">{v}</dd>
                </div>
              ))}
            </dl>
            {d.receipt_path && (
              <Button variant="secondary" size="sm" className="mt-4" onClick={viewReceipt}>
                <FileText className="h-4 w-4" aria-hidden="true" />
                {t("receipt")}
              </Button>
            )}
            {d.status === "pending" && canReview && (
              selfReview ? (
                <Alert tone="warn" className="mt-4">{t("selfReview")}</Alert>
              ) : (
                <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                  <Button variant="danger-outline" onClick={() => setMode("reject")}>{t("reject")}</Button>
                  <Button variant="success" onClick={() => setMode("approve")}>{t("approve")}</Button>
                </div>
              )
            )}
          </>
        )}
        {mode === "approve" && (
          <div className="space-y-4">
            <Field label={t("creditedAmount")}>
              {(a) => <Input {...a} value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="decimal" className="tabular" />}
            </Field>
            <Field label={t("note")} optional optionalText={tc("optional")}>
              {(a) => <Textarea {...a} rows={2} value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} />}
            </Field>
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button variant="secondary" onClick={() => setMode(null)} disabled={busy}>{tc("back")}</Button>
              <Button variant="success" onClick={submit} loading={busy}>{t("approve")}</Button>
            </div>
          </div>
        )}
        {mode === "reject" && (
          <div className="space-y-4">
            <Field label={t("reason")}>
              {(a) => <Textarea {...a} rows={3} value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} />}
            </Field>
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button variant="secondary" onClick={() => setMode(null)} disabled={busy}>{tc("back")}</Button>
              <Button variant="danger" onClick={submit} loading={busy} disabled={note.trim().length < 4}>{t("reject")}</Button>
            </div>
          </div>
        )}
      </Dialog>
    </>
  );
}
