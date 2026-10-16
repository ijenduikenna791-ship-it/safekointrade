"use client";

import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import { QRCodeSVG } from "qrcode.react";
import { Check, Copy, FlaskConical } from "lucide-react";
import { useRouter } from "@/lib/i18n/navigation";
import { depositSchema } from "@/lib/validation/schemas";
import { requestDepositAction } from "@/lib/actions/user";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { Alert } from "@/components/ui/feedback";
import { FormAlert, useFieldError } from "@/components/forms/form-alert";
import { formatMoney } from "@/lib/utils/format";

export function DepositForm({ assets, depositWallets = [], savedWallets = [], limits, demoMode }) {
  const t = useTranslations("dashboard.deposits");
  const tc = useTranslations("common");
  const fe = useFieldError();
  const locale = useLocale();
  const router = useRouter();
  const [serverError, setServerError] = useState(null);
  const [copied, setCopied] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    setError,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(depositSchema),
    defaultValues: {
      amount: "",
      assetSymbol: assets[0]?.symbol || "",
      network: "",
      depositWalletId: "",
      method: "crypto_transfer",
      fromWalletId: "",
      fromAddress: "",
      saveWallet: false,
      walletLabel: "",
      txReference: "",
      note: "",
      idempotencyKey: crypto.randomUUID(),
    },
  });

  const assetSymbol = watch("assetSymbol");
  const network = watch("network");
  const method = watch("method");
  const fromWalletId = watch("fromWalletId");
  const saveWallet = watch("saveWallet");
  const isCrypto = method === "crypto_transfer";

  const networks = useMemo(
    () => depositWallets.filter((w) => w.asset_symbol === assetSymbol),
    [depositWallets, assetSymbol]
  );

  useEffect(() => {
    if (!networks.some((w) => w.network === network)) {
      setValue("network", networks[0]?.network || "");
    }
  }, [networks, network, setValue]);

  const depositWallet = networks.find((w) => w.network === network) || null;

  useEffect(() => {
    setValue("depositWalletId", depositWallet?.id || "");
  }, [depositWallet, setValue]);

  const myWallets = useMemo(
    () =>
      savedWallets.filter(
        (w) => w.asset_symbol === assetSymbol && (!network || w.network === network)
      ),
    [savedWallets, assetSymbol, network]
  );

  useEffect(() => {
    if (fromWalletId && fromWalletId !== "new" && !myWallets.some((w) => w.id === fromWalletId)) {
      setValue("fromWalletId", "");
    }
  }, [myWallets, fromWalletId, setValue]);

  const copyAddress = async () => {
    if (!depositWallet) return;
    try {
      await navigator.clipboard.writeText(depositWallet.address);
      setCopied(true);
      toast.success(t("addressCopied"));
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error(t("copyFailed"));
    }
  };

  const onSubmit = async (values) => {
    setServerError(null);
    const res = await requestDepositAction(values).catch(() => ({ ok: false, error: "network" }));
    if (!res.ok) {
      if (res.fieldErrors) Object.entries(res.fieldErrors).forEach(([k, v]) => setError(k, { message: v }));
      return setServerError(res.error);
    }
    toast.success(t("success", { reference: res.data.reference }));
    reset({
      ...values,
      amount: "",
      fromWalletId: "",
      fromAddress: "",
      saveWallet: false,
      walletLabel: "",
      txReference: "",
      note: "",
      idempotencyKey: crypto.randomUUID(),
    });
    router.refresh();
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
      <FormAlert code={serverError && serverError !== "validation" ? serverError : null} />
      <input type="hidden" {...register("depositWalletId")} />

      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label={t("amount")}
          error={fe(errors.amount?.message)}
          hint={t("limits", { min: formatMoney(limits.min, { locale }), max: formatMoney(limits.max, { locale }) })}
        >
          {(a) => <Input {...a} inputMode="decimal" autoComplete="off" placeholder="0.00" className="tabular" {...register("amount")} />}
        </Field>
        <Field label={t("asset")} error={fe(errors.assetSymbol?.message)}>
          {(a) => (
            <Select {...a} {...register("assetSymbol")}>
              {assets.map((x) => (
                <option key={x.symbol} value={x.symbol}>{x.name} ({x.symbol})</option>
              ))}
            </Select>
          )}
        </Field>
      </div>

      <Field label={t("method")} error={fe(errors.method?.message)}>
        {(a) => (
          <Select {...a} {...register("method")}>
            <option value="crypto_transfer">{t("methods.crypto_transfer")}</option>
            <option value="bank_transfer">{t("methods.bank_transfer")}</option>
          </Select>
        )}
      </Field>

      {isCrypto && (
        <>
          <Field label={t("network")} error={fe(errors.network?.message)}>
            {(a) => (
              <Select {...a} disabled={networks.length === 0} {...register("network")}>
                {networks.length === 0 && <option value="">{t("noNetworks")}</option>}
                {networks.map((w) => (
                  <option key={w.id} value={w.network}>{w.network}</option>
                ))}
              </Select>
            )}
          </Field>

          <div className="rounded-md border border-line bg-surface-2/60 p-4">
            <p className="text-sm font-medium">{t("depositAddress")}</p>
            {depositWallet ? (
              <div className="mt-3 flex flex-col items-center gap-4 sm:flex-row sm:items-start">
                <div className="shrink-0 rounded-md bg-white p-2">
                  <QRCodeSVG value={depositWallet.address} size={120} />
                </div>
                <div className="min-w-0 flex-1 space-y-2">
                  <p className="break-all font-mono text-sm">{depositWallet.address}</p>
                  <button
                    type="button"
                    onClick={copyAddress}
                    className="inline-flex items-center gap-1.5 rounded-md border border-line px-3 py-1.5 text-sm font-medium hover:bg-surface-2"
                  >
                    {copied ? <Check className="h-4 w-4" aria-hidden="true" /> : <Copy className="h-4 w-4" aria-hidden="true" />}
                    {copied ? t("copied") : t("copy")}
                  </button>
                  {depositWallet.memo && (
                    <p className="text-sm text-ink-muted">
                      {t("memo")}: <span className="font-mono">{depositWallet.memo}</span>
                    </p>
                  )}
                  <p className="text-xs text-ink-subtle">
                    {t("addressHint", { asset: assetSymbol, network: depositWallet.network })}
                  </p>
                </div>
              </div>
            ) : (
              <p className="mt-1.5 text-sm text-ink-muted">{t("noAddress")}</p>
            )}
          </div>

          <Field label={t("fromWallet")} error={fe(errors.fromWalletId?.message)}>
            {(a) => (
              <Select {...a} {...register("fromWalletId")}>
                <option value="">{t("fromWalletNone")}</option>
                {myWallets.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.label} ({w.address.slice(0, 6)}...{w.address.slice(-4)})
                  </option>
                ))}
                <option value="new">{t("fromWalletNew")}</option>
              </Select>
            )}
          </Field>

          {fromWalletId === "new" && (
            <div className="space-y-4 rounded-md border border-line p-4">
              <Field label={t("fromAddress")} hint={t("fromAddressHint")} error={fe(errors.fromAddress?.message)}>
                {(a) => <Input {...a} autoComplete="off" spellCheck={false} className="font-mono" {...register("fromAddress")} />}
              </Field>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" className="h-4 w-4" {...register("saveWallet")} />
                {t("saveWallet")}
              </label>
              {saveWallet && (
                <Field label={t("walletLabel")} error={fe(errors.walletLabel?.message)}>
                  {(a) => <Input {...a} autoComplete="off" placeholder={t("walletLabelPlaceholder")} {...register("walletLabel")} />}
                </Field>
              )}
            </div>
          )}
        </>
      )}

      <div className="rounded-md border border-line bg-surface-2/60 p-4">
        <p className="text-sm font-medium">{t("instructionsTitle")}</p>
        {demoMode ? (
          <p className="mt-1.5 flex items-start gap-2 text-sm text-ink-muted">
            <FlaskConical className="mt-0.5 h-4 w-4 shrink-0 text-brass" aria-hidden="true" />
            {t("instructionsDemo")}
          </p>
        ) : (
          <p className="mt-1.5 text-sm text-ink-muted">{t("instructionsLive")}</p>
        )}
      </div>

      <Field label={t("txReference")} optional optionalText={tc("optional")} hint={t("txReferenceHint")} error={fe(errors.txReference?.message)}>
        {(a) => <Input {...a} autoComplete="off" spellCheck={false} {...register("txReference")} />}
      </Field>
      <Field label={t("note")} optional optionalText={tc("optional")} error={fe(errors.note?.message)}>
        {(a) => <Textarea {...a} rows={3} {...register("note")} />}
      </Field>
      <Alert tone="info">{t("pendingNote")}</Alert>
      <Button type="submit" size="lg" className="w-full" loading={isSubmitting}>{t("submit")}</Button>
    </form>
  );
}