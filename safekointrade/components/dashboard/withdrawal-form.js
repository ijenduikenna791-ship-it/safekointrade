"use client";

import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import { TriangleAlert, Wallet } from "lucide-react";
import { shortAddress, useWallet } from "@/components/wallet/wallet-provider";
import { useRouter } from "@/lib/i18n/navigation";
import { withdrawalSchema } from "@/lib/validation/schemas";
import { requestWithdrawalAction } from "@/lib/actions/user";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";
import { Dialog } from "@/components/ui/dialog";
import { FormAlert, useFieldError } from "@/components/forms/form-alert";
import { formatMoney, formatPercent, toNumber } from "@/lib/utils/format";

/** Mirrors public.withdrawal_fee() for the preview; the database is authoritative. */
function feeFor(amount, s) {
  const a = toNumber(amount);
  if (!a) return 0;
  return Math.round((toNumber(s.withdrawal_fee_flat) + (a * toNumber(s.withdrawal_fee_percent)) / 100) * 100) / 100;
}

export function WithdrawalForm({ assets, settings, available }) {
  const t = useTranslations("dashboard.withdrawals");
  const tc = useTranslations("common");
  const fe = useFieldError();
  const locale = useLocale();
  const router = useRouter();
  const [serverError, setServerError] = useState(null);
  const [pending, setPending] = useState(null);
  const [busy, setBusy] = useState(false);

  const wallet = useWallet();
  const tw = useTranslations("wallet");
  const [filled, setFilled] = useState(false);
  const { register, control, handleSubmit, reset, setError, setValue, formState: { errors } } = useForm({
    resolver: zodResolver(withdrawalSchema),
    defaultValues: {
      amount: "",
      assetSymbol: assets[0]?.symbol || "",
      network: assets[0]?.network || "",
      destination: "",
      idempotencyKey: crypto.randomUUID(),
    },
  });

  const amount = useWatch({ control, name: "amount" });
  const fee = feeFor(amount, settings);
  const net = Math.max(0, toNumber(amount) - fee);
  const m = (v) => formatMoney(v, { locale });

  const submit = async () => {
    setBusy(true);
    setServerError(null);
    const res = await requestWithdrawalAction(pending).catch(() => ({ ok: false, error: "network" }));
    setBusy(false);
    setPending(null);
    if (!res.ok) {
      if (res.fieldErrors) Object.entries(res.fieldErrors).forEach(([k, v]) => setError(k, { message: v }));
      return setServerError(res.error);
    }
    toast.success(t("success", { reference: res.data.reference }));
    reset({ ...pending, amount: "", destination: "", idempotencyKey: crypto.randomUUID() });
    router.refresh();
  };

  return (
    <>
      <form onSubmit={handleSubmit((v) => setPending(v))} noValidate className="space-y-4">
        <FormAlert code={serverError && serverError !== "validation" ? serverError : null} />
        <Field
          label={t("amount")}
          error={fe(errors.amount?.message)}
          hint={t("limits", {
            min: m(settings.withdrawal_min),
            max: m(settings.withdrawal_max),
            flat: m(settings.withdrawal_fee_flat),
            percent: formatPercent(settings.withdrawal_fee_percent, { locale }),
          })}
        >
          {(a) => <Input {...a} inputMode="decimal" autoComplete="off" placeholder="0.00" className="tabular" {...register("amount")} />}
        </Field>
        <p className="tabular text-sm text-ink-muted">{t("availableNow", { amount: m(available) })}</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t("asset")} error={fe(errors.assetSymbol?.message)}>
            {(a) => (
              <Select {...a} {...register("assetSymbol")}>
                {assets.map((x) => <option key={x.symbol} value={x.symbol}>{x.name} ({x.symbol})</option>)}
              </Select>
            )}
          </Field>
          <Field label={t("network")} error={fe(errors.network?.message)}>
            {(a) => <Input {...a} placeholder={t("networkPlaceholder")} {...register("network")} />}
          </Field>
        </div>
        <Field label={t("destination")} error={fe(errors.destination?.message)} hint={t("destinationHint")}>
          {(a) => <Input {...a} autoComplete="off" spellCheck={false} dir="ltr" className="font-mono text-sm" {...register("destination", { onChange: () => setFilled(false) })} />}
        </Field>
        {wallet.enabled && (
          <div className="-mt-1 flex flex-wrap items-center gap-2 text-sm">
            {wallet.isConnected ? (
              <button
                type="button"
                className="inline-flex items-center gap-1.5 rounded-md border border-line px-2.5 py-1.5 text-xs font-medium hover:bg-surface-2"
                onClick={() => {
                  setValue("destination", wallet.address, { shouldValidate: true });
                  if (wallet.chainName) setValue("network", wallet.chainName, { shouldValidate: true });
                  setFilled(true);
                }}
              >
                <Wallet className="h-3.5 w-3.5" aria-hidden="true" />
                {tw("useConnected", { address: shortAddress(wallet.address) })}
              </button>
            ) : (
              <button type="button" onClick={() => wallet.open()} className="inline-flex items-center gap-1.5 text-xs font-medium text-brass hover:underline">
                <Wallet className="h-3.5 w-3.5" aria-hidden="true" />
                {tw("connectToFill")}
              </button>
            )}
            {filled && <span className="text-xs text-warn">{tw("checkNetwork")}</span>}
          </div>
        )}

        <dl className="divide-y divide-line rounded-md border border-line text-sm">
          <div className="flex justify-between px-4 py-2.5">
            <dt className="text-ink-subtle">{t("fee")}</dt>
            <dd className="tabular">{m(fee)}</dd>
          </div>
          <div className="flex justify-between px-4 py-2.5">
            <dt className="text-ink-subtle">{t("net")}</dt>
            <dd className="tabular font-semibold">{m(net)}</dd>
          </div>
        </dl>
        <Button type="submit" size="lg" className="w-full">{t("submit")}</Button>
      </form>

      <Dialog
        open={Boolean(pending)}
        onClose={() => !busy && setPending(null)}
        title={t("confirmTitle")}
        description={pending ? t("confirmBody", { amount: m(pending.amount) }) : ""}
        closeLabel={tc("close")}
      >
        {pending && (
          <>
            <dl className="divide-y divide-line rounded-md border border-line text-sm">
              {[
                [t("amount"), m(pending.amount)],
                [t("fee"), m(feeFor(pending.amount, settings))],
                [t("net"), m(Math.max(0, toNumber(pending.amount) - feeFor(pending.amount, settings)))],
                [t("asset"), `${pending.assetSymbol} · ${pending.network}`],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between gap-4 px-4 py-2.5">
                  <dt className="text-ink-subtle">{k}</dt>
                  <dd className="tabular text-end font-medium">{v}</dd>
                </div>
              ))}
              <div className="px-4 py-2.5">
                <dt className="text-ink-subtle">{t("destination")}</dt>
                <dd className="mt-1 break-all font-mono text-xs" dir="ltr">{pending.destination}</dd>
              </div>
            </dl>
            <p className="mt-4 flex items-start gap-2 text-sm text-warn">
              <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              {t("destinationHint")}
            </p>
          </>
        )}
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="secondary" onClick={() => setPending(null)} disabled={busy}>{tc("back")}</Button>
          <Button onClick={submit} loading={busy}>{t("submit")}</Button>
        </div>
      </Dialog>
    </>
  );
}
