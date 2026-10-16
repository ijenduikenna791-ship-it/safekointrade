"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Pencil, Plus } from "lucide-react";
import { useRouter } from "@/lib/i18n/navigation";
import {
  setAssetFlagsAction,
  setDepositWalletActiveAction,
  upsertDepositWalletAction,
} from "@/lib/actions/admin";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";
import { Alert } from "@/components/ui/feedback";
import { FormAlert, useFieldError } from "@/components/forms/form-alert";

const smallBtn =
  "inline-flex items-center gap-1.5 rounded-md border border-line px-3 py-1.5 text-sm font-medium hover:bg-surface-2 disabled:opacity-50";

export function DepositAddressManager({ wallets, assets }) {
  const t = useTranslations("admin.depositAddresses");
  const tc = useTranslations("common");
  const fe = useFieldError();
  const router = useRouter();

  const [form, setForm] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});
  const [serverError, setServerError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState(null);

  const assetName = (symbol) => assets.find((a) => a.symbol === symbol)?.name || symbol;
  const hasActiveAddress = (symbol) => wallets.some((w) => w.asset_symbol === symbol && w.is_active);

  const resetMessages = () => {
    setFieldErrors({});
    setServerError(null);
  };

  const openNew = () => {
    resetMessages();
    setForm({
      id: "",
      assetSymbol: assets[0]?.symbol || "",
      network: "",
      address: "",
      memo: "",
      isActive: true,
      sortOrder: String(wallets.length + 1),
      originalAddress: "",
    });
  };

  const openEdit = (w) => {
    resetMessages();
    setForm({
      id: w.id,
      assetSymbol: w.asset_symbol,
      network: w.network,
      address: w.address,
      memo: w.memo || "",
      isActive: w.is_active,
      sortOrder: String(w.sort_order ?? 0),
      originalAddress: w.address,
    });
  };

  const update = (key) => (e) => {
    const value = e.target.type === "checkbox" ? e.target.checked : e.target.value;
    setForm((f) => ({ ...f, [key]: value }));
  };

  const save = async (e) => {
    e.preventDefault();
    if (form.id && form.address.trim() !== form.originalAddress && !window.confirm(t("confirmChange"))) return;
    setSaving(true);
    resetMessages();
    const res = await upsertDepositWalletAction(form).catch(() => ({ ok: false, error: "network" }));
    setSaving(false);
    if (!res.ok) {
      if (res.fieldErrors) setFieldErrors(res.fieldErrors);
      return setServerError(res.error);
    }
    toast.success(t("saved"));
    setForm(null);
    router.refresh();
  };

  const toggleAddress = async (w) => {
    setBusy(w.id);
    const res = await setDepositWalletActiveAction({ id: w.id, active: !w.is_active }).catch(() => ({ ok: false }));
    setBusy(null);
    if (!res.ok) return toast.error(res.error === "network_taken" ? t("networkTakenToast") : t("failed"));
    toast.success(w.is_active ? t("disabled") : t("enabled"));
    router.refresh();
  };

  const toggleCoin = async (a) => {
    setBusy(a.symbol);
    const res = await setAssetFlagsAction({
      symbol: a.symbol,
      active: a.is_active,
      deposits: !a.accepts_deposits,
      withdrawals: a.accepts_withdrawals,
    }).catch(() => ({ ok: false }));
    setBusy(null);
    if (!res.ok) return toast.error(t("failed"));
    toast.success(t("coinUpdated"));
    router.refresh();
  };

  return (
    <div className="space-y-8">
      <Alert tone="info">{t("warning")}</Alert>

      {/* Coins */}
      <section className="space-y-3">
        <div>
          <h2 className="text-base font-semibold">{t("coinsTitle")}</h2>
          <p className="text-sm text-ink-muted">{t("coinsHint")}</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {assets.map((a) => (
            <div key={a.symbol} className="flex items-center justify-between gap-3 rounded-md border border-line p-3">
              <div className="min-w-0">
                <p className="truncate font-medium">{a.name} ({a.symbol})</p>
                <p className={`text-xs ${a.accepts_deposits ? "text-emerald-400" : "text-ink-subtle"}`}>
                  {a.accepts_deposits ? t("depositsOn") : t("depositsOff")}
                  {a.accepts_deposits && !hasActiveAddress(a.symbol) && (
                    <span className="text-amber-400"> · {t("noAddress")}</span>
                  )}
                </p>
              </div>
              <button type="button" className={smallBtn} disabled={busy === a.symbol} onClick={() => toggleCoin(a)}>
                {a.accepts_deposits ? t("disable") : t("enable")}
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* Addresses */}
      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-base font-semibold">{t("addressesTitle")}</h2>
          {!form && (
            <Button type="button" onClick={openNew}>
              <Plus className="h-4 w-4" aria-hidden="true" />
              {t("add")}
            </Button>
          )}
        </div>

        {form && (
          <form onSubmit={save} noValidate className="space-y-4 rounded-md border border-line bg-surface-2/60 p-4">
            <p className="font-medium">{form.id ? t("editTitle") : t("newTitle")}</p>
            <FormAlert code={serverError && serverError !== "validation" ? serverError : null} />

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={t("asset")} error={fe(fieldErrors.assetSymbol)}>
                {(a) => (
                  <Select {...a} value={form.assetSymbol} onChange={update("assetSymbol")}>
                    {assets.map((x) => (
                      <option key={x.symbol} value={x.symbol}>{x.name} ({x.symbol})</option>
                    ))}
                  </Select>
                )}
              </Field>
              <Field label={t("network")} hint={t("networkHint")} error={fe(fieldErrors.network)}>
                {(a) => <Input {...a} value={form.network} onChange={update("network")} autoComplete="off" />}
              </Field>
            </div>

            <Field label={t("address")} error={fe(fieldErrors.address)}>
              {(a) => (
                <Input
                  {...a}
                  value={form.address}
                  onChange={update("address")}
                  autoComplete="off"
                  spellCheck={false}
                  className="font-mono"
                />
              )}
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={t("memo")} optional optionalText={tc("optional")} hint={t("memoHint")} error={fe(fieldErrors.memo)}>
                {(a) => <Input {...a} value={form.memo} onChange={update("memo")} autoComplete="off" spellCheck={false} />}
              </Field>
              <Field label={t("sortOrder")} error={fe(fieldErrors.sortOrder)}>
                {(a) => <Input {...a} inputMode="numeric" value={form.sortOrder} onChange={update("sortOrder")} />}
              </Field>
            </div>

            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" className="h-4 w-4" checked={form.isActive} onChange={update("isActive")} />
              {t("isActiveLabel")}
            </label>

            <div className="flex flex-wrap gap-3">
              <Button type="submit" loading={saving}>{t("save")}</Button>
              <button type="button" className={smallBtn} onClick={() => setForm(null)}>{t("cancel")}</button>
            </div>
          </form>
        )}

        <div className="overflow-x-auto rounded-md border border-line">
          <table className="w-full text-sm">
            <thead className="bg-surface-2/60 text-left text-ink-subtle">
              <tr>
                <th className="px-4 py-3 font-medium">{t("asset")}</th>
                <th className="px-4 py-3 font-medium">{t("network")}</th>
                <th className="px-4 py-3 font-medium">{t("address")}</th>
                <th className="px-4 py-3 font-medium">{t("status")}</th>
                <th className="px-4 py-3 text-right font-medium">{t("actions")}</th>
              </tr>
            </thead>
            <tbody>
              {wallets.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-ink-muted">{t("empty")}</td>
                </tr>
              ) : (
                wallets.map((w) => (
                  <tr key={w.id} className="border-t border-line align-top">
                    <td className="px-4 py-3">
                      <p className="font-medium">{w.asset_symbol}</p>
                      <p className="text-xs text-ink-subtle">{assetName(w.asset_symbol)}</p>
                    </td>
                    <td className="px-4 py-3">{w.network}</td>
                    <td className="max-w-72 px-4 py-3">
                      <p className="break-all font-mono text-xs">{w.address}</p>
                      {w.memo && <p className="mt-1 text-xs text-ink-subtle">{t("memo")}: {w.memo}</p>}
                    </td>
                    <td className="px-4 py-3">
                      <span className={w.is_active ? "text-emerald-400" : "text-ink-subtle"}>
                        {w.is_active ? t("active") : t("inactive")}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <button type="button" className={smallBtn} onClick={() => openEdit(w)}>
                          <Pencil className="h-4 w-4" aria-hidden="true" />
                          {t("edit")}
                        </button>
                        <button type="button" className={smallBtn} disabled={busy === w.id} onClick={() => toggleAddress(w)}>
                          {w.is_active ? t("disable") : t("enable")}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}