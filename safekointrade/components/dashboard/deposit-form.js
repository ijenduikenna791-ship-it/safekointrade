"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import { FlaskConical } from "lucide-react";
import { useRouter } from "@/lib/i18n/navigation";
import { depositSchema } from "@/lib/validation/schemas";
import { requestDepositAction } from "@/lib/actions/user";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { Alert } from "@/components/ui/feedback";
import { FormAlert, useFieldError } from "@/components/forms/form-alert";
import { formatMoney } from "@/lib/utils/format";

export function DepositForm({ assets, limits, demoMode }) {
  const t = useTranslations("dashboard.deposits");
  const tc = useTranslations("common");
  const fe = useFieldError();
  const locale = useLocale();
  const router = useRouter();
  const [serverError, setServerError] = useState(null);

  const { register, handleSubmit, reset, setError, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(depositSchema),
    defaultValues: {
      amount: "",
      assetSymbol: assets[0]?.symbol || "",
      method: "crypto_transfer",
      txReference: "",
      note: "",
      idempotencyKey: crypto.randomUUID(),
    },
  });

  const onSubmit = async (values) => {
    setServerError(null);
    const res = await requestDepositAction(values).catch(() => ({ ok: false, error: "network" }));
    if (!res.ok) {
      if (res.fieldErrors) Object.entries(res.fieldErrors).forEach(([k, v]) => setError(k, { message: v }));
      return setServerError(res.error);
    }
    toast.success(t("success", { reference: res.data.reference }));
    reset({ ...values, amount: "", txReference: "", note: "", idempotencyKey: crypto.randomUUID() });
    router.refresh();
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
      <FormAlert code={serverError && serverError !== "validation" ? serverError : null} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t("amount")} error={fe(errors.amount?.message)} hint={t("limits", { min: formatMoney(limits.min, { locale }), max: formatMoney(limits.max, { locale }) })}>
          {(a) => <Input {...a} inputMode="decimal" autoComplete="off" placeholder="0.00" className="tabular" {...register("amount")} />}
        </Field>
        <Field label={t("asset")} error={fe(errors.assetSymbol?.message)}>
          {(a) => (
            <Select {...a} {...register("assetSymbol")}>
              {assets.map((x) => <option key={x.symbol} value={x.symbol}>{x.name} ({x.symbol})</option>)}
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
