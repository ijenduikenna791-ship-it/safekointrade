"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Check, Pencil, Trash2, Wallet, X } from "lucide-react";
import { useRouter } from "@/lib/i18n/navigation";
import { deleteWalletAction, renameWalletAction } from "@/lib/actions/user";
import { Input } from "@/components/ui/field";
import { EmptyState } from "@/components/ui/feedback";

const smallBtn =
  "inline-flex items-center gap-1.5 rounded-md border border-line px-3 py-1.5 text-sm font-medium hover:bg-surface-2 disabled:opacity-50";

export function SavedWallets({ wallets }) {
  const t = useTranslations("dashboard.settings.wallets");
  const router = useRouter();
  const [editingId, setEditingId] = useState(null);
  const [label, setLabel] = useState("");
  const [busy, setBusy] = useState(null);

  const startEdit = (w) => {
    setEditingId(w.id);
    setLabel(w.label);
  };

  const saveLabel = async (w) => {
    if (!label.trim()) return toast.error(t("labelRequired"));
    setBusy(w.id);
    const res = await renameWalletAction({ id: w.id, label }).catch(() => ({ ok: false }));
    setBusy(null);
    if (!res.ok) return toast.error(t("failed"));
    toast.success(t("renamed"));
    setEditingId(null);
    router.refresh();
  };

  const remove = async (w) => {
    if (!window.confirm(t("confirmDelete"))) return;
    setBusy(w.id);
    const res = await deleteWalletAction(w.id).catch(() => ({ ok: false }));
    setBusy(null);
    if (!res.ok) return toast.error(t("failed"));
    toast.success(t("deleted"));
    router.refresh();
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-base font-semibold">{t("title")}</h2>
        <p className="text-sm text-ink-muted">{t("hint")}</p>
      </div>

      {wallets.length === 0 ? (
        <EmptyState icon={Wallet} title={t("empty")} />
      ) : (
        <ul className="space-y-3">
          {wallets.map((w) => (
            <li key={w.id} className="rounded-md border border-line p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 flex-1 space-y-1">
                  {editingId === w.id ? (
                    <Input
                      value={label}
                      onChange={(e) => setLabel(e.target.value)}
                      maxLength={40}
                      autoFocus
                      aria-label={t("labelPlaceholder")}
                      placeholder={t("labelPlaceholder")}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") saveLabel(w);
                        if (e.key === "Escape") setEditingId(null);
                      }}
                    />
                  ) : (
                    <p className="font-medium">{w.label}</p>
                  )}
                  <p className="text-xs text-ink-subtle">{w.asset_symbol} · {w.network}</p>
                  <p className="break-all font-mono text-xs text-ink-muted">{w.address}</p>
                </div>

                <div className="flex shrink-0 gap-2">
                  {editingId === w.id ? (
                    <>
                      <button type="button" className={smallBtn} disabled={busy === w.id} onClick={() => saveLabel(w)}>
                        <Check className="h-4 w-4" aria-hidden="true" />
                        {t("save")}
                      </button>
                      <button type="button" className={smallBtn} onClick={() => setEditingId(null)}>
                        <X className="h-4 w-4" aria-hidden="true" />
                        {t("cancel")}
                      </button>
                    </>
                  ) : (
                    <>
                      <button type="button" className={smallBtn} disabled={busy === w.id} onClick={() => startEdit(w)}>
                        <Pencil className="h-4 w-4" aria-hidden="true" />
                        {t("rename")}
                      </button>
                      <button
                        type="button"
                        className={`${smallBtn} text-red-400`}
                        disabled={busy === w.id}
                        onClick={() => remove(w)}
                      >
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                        {t("delete")}
                      </button>
                    </>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}