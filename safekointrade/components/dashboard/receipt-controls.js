"use client";

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { FileText, Upload } from "lucide-react";
import { useRouter } from "@/lib/i18n/navigation";
import { receiptUrlAction, uploadReceiptAction } from "@/lib/actions/user";
import { Button } from "@/components/ui/button";

const ACCEPT = "image/png,image/jpeg,image/webp,application/pdf";

export function ReceiptControls({ depositId, hasReceipt, canUpload }) {
  const t = useTranslations("dashboard.deposits");
  const te = useTranslations("errors");
  const router = useRouter();
  const inputRef = useRef(null);
  const [busy, setBusy] = useState(false);

  const upload = async (file) => {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024 || !ACCEPT.split(",").includes(file.type)) return toast.error(te("upload_invalid"));
    setBusy(true);
    const fd = new FormData();
    fd.set("depositId", depositId);
    fd.set("file", file);
    const res = await uploadReceiptAction(fd).catch(() => ({ ok: false, error: "network" }));
    setBusy(false);
    if (inputRef.current) inputRef.current.value = "";
    if (!res.ok) return toast.error(te.has(res.error) ? te(res.error) : te("generic"));
    toast.success(t("receiptUploaded"));
    router.refresh();
  };

  const view = async () => {
    const res = await receiptUrlAction(depositId).catch(() => ({ ok: false }));
    if (res.ok) window.open(res.data.url, "_blank", "noopener,noreferrer");
    else toast.error(te("not_found"));
  };

  if (hasReceipt) {
    return (
      <Button variant="ghost" size="sm" onClick={view}>
        <FileText className="h-4 w-4" aria-hidden="true" />
        {t("viewReceipt")}
      </Button>
    );
  }
  if (!canUpload) return <span className="text-xs text-ink-subtle">{t("receiptMissing")}</span>;
  return (
    <>
      <input ref={inputRef} type="file" accept={ACCEPT} className="sr-only" tabIndex={-1} aria-hidden="true" onChange={(e) => upload(e.target.files?.[0])} />
      <Button variant="ghost" size="sm" loading={busy} onClick={() => inputRef.current?.click()}>
        <Upload className="h-4 w-4" aria-hidden="true" />
        {t("uploadReceipt")}
      </Button>
    </>
  );
}
