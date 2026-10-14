"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { useRouter } from "@/lib/i18n/navigation";
import { setAssetFlagsAction, updateSettingAction } from "@/lib/actions/admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import { useActionToast } from "./admin-controls";

export function NumberSetting({ settingKey, value, disabled }) {
  const t = useTranslations("admin.settings");
  const tc = useTranslations("common");
  const router = useRouter();
  const check = useActionToast();
  const [v, setV] = useState(String(value));
  const [busy, setBusy] = useState(false);

  const save = async (e) => {
    e.preventDefault();
    setBusy(true);
    const res = await updateSettingAction({ key: settingKey, value: v }).catch(() => ({ ok: false, error: "network" }));
    setBusy(false);
    if (!check(res)) return;
    toast.success(t("saved"));
    router.refresh();
  };

  return (
    <form onSubmit={save} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5">
      <label htmlFor={`s-${settingKey}`} className="text-sm">{t(`keys.${settingKey}`)}</label>
      <span className="flex gap-2">
        <Input id={`s-${settingKey}`} value={v} onChange={(e) => setV(e.target.value)} inputMode="decimal" className="tabular h-9 w-32 text-end" disabled={disabled} />
        <Button type="submit" size="sm" variant="secondary" loading={busy} disabled={disabled || v === String(value)}>{tc("save")}</Button>
      </span>
    </form>
  );
}

export function BooleanSetting({ settingKey, value, disabled }) {
  const t = useTranslations("admin.settings");
  const router = useRouter();
  const check = useActionToast();
  const [busy, setBusy] = useState(false);

  const toggle = async () => {
    setBusy(true);
    const res = await updateSettingAction({ key: settingKey, value: String(!value) }).catch(() => ({ ok: false, error: "network" }));
    setBusy(false);
    if (!check(res)) return;
    toast.success(t("saved"));
    router.refresh();
  };

  return (
    <div className="flex items-center justify-between gap-3 px-5 py-3.5">
      <span id={`b-${settingKey}`} className="text-sm">{t(`keys.${settingKey}`)}</span>
      <button
        type="button"
        role="switch"
        aria-checked={value}
        aria-labelledby={`b-${settingKey}`}
        disabled={disabled || busy}
        onClick={toggle}
        className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors disabled:opacity-50 ${value ? "bg-gain" : "bg-surface-3"}`}
      >
        <span className={`inline-block h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${value ? "translate-x-5 rtl:-translate-x-5" : "translate-x-0.5 rtl:-translate-x-0.5"}`} />
      </button>
    </div>
  );
}

export function AssetFlags({ asset, disabled }) {
  const t = useTranslations("admin.settings");
  const router = useRouter();
  const check = useActionToast();
  const [busy, setBusy] = useState(false);

  const update = async (patch) => {
    setBusy(true);
    const next = { symbol: asset.symbol, active: asset.is_active, deposits: asset.accepts_deposits, withdrawals: asset.accepts_withdrawals, ...patch };
    const res = await setAssetFlagsAction(next).catch(() => ({ ok: false, error: "network" }));
    setBusy(false);
    if (!check(res)) return;
    toast.success(t("saved"));
    router.refresh();
  };

  const box = (key, label, checked) => (
    <label className="inline-flex items-center gap-2 text-sm">
      <input type="checkbox" checked={checked} disabled={disabled || busy} onChange={(e) => update({ [key]: e.target.checked })} className="h-4 w-4 accent-[var(--brass)]" />
      {label}
    </label>
  );

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5">
      <span className="text-sm"><span className="font-medium">{asset.symbol}</span> <span className="text-ink-muted">· {asset.name} · {asset.network}</span></span>
      <span className="flex flex-wrap gap-4">
        {box("active", t("assetActive"), asset.is_active)}
        {box("deposits", t("assetDeposits"), asset.accepts_deposits)}
        {box("withdrawals", t("assetWithdrawals"), asset.accepts_withdrawals)}
      </span>
    </div>
  );
}
