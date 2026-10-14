"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Pencil, Plus } from "lucide-react";
import { useRouter } from "@/lib/i18n/navigation";
import { planSchema } from "@/lib/validation/schemas";
import { upsertPlanAction } from "@/lib/actions/admin";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { FormAlert, useFieldError } from "@/components/forms/form-alert";

const EMPTY = {
  id: "", name: "", slug: "", description: "", min_amount: "", max_amount: "", currency: "USD", term_days: 30,
  risk_level: "moderate", risk_description: "", target_return_min: "", target_return_max: "", target_return_basis: "",
  is_active: true, sort_order: 0,
};

export function PlanEditor({ plan }) {
  const t = useTranslations("admin.plans");
  const tc = useTranslations("common");
  const fe = useFieldError();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [serverError, setServerError] = useState(null);
  const defaults = plan
    ? {
        ...EMPTY,
        ...plan,
        min_amount: String(plan.min_amount),
        max_amount: String(plan.max_amount),
        target_return_min: plan.target_return_min == null ? "" : String(plan.target_return_min),
        target_return_max: plan.target_return_max == null ? "" : String(plan.target_return_max),
        target_return_basis: plan.target_return_basis || "",
      }
    : EMPTY;
  const { register, handleSubmit, reset, setError, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(planSchema),
    defaultValues: defaults,
  });

  const onSubmit = async (values) => {
    setServerError(null);
    const res = await upsertPlanAction(values).catch(() => ({ ok: false, error: "network" }));
    if (!res.ok) {
      if (res.fieldErrors) Object.entries(res.fieldErrors).forEach(([k, v]) => setError(k, { message: v }));
      return setServerError(res.error);
    }
    toast.success(t("saved"));
    setOpen(false);
    router.refresh();
  };

  const text = (name, label, props = {}) => (
    <Field label={label} error={fe(errors[name]?.message)}>
      {(a) => <Input {...a} {...props} {...register(name)} />}
    </Field>
  );

  return (
    <>
      <Button size="sm" variant={plan ? "ghost" : "primary"} onClick={() => { reset(defaults); setOpen(true); }}>
        {plan ? <Pencil className="h-4 w-4" aria-hidden="true" /> : <Plus className="h-4 w-4" aria-hidden="true" />}
        {plan ? t("edit") : t("new")}
      </Button>
      <Dialog open={open} onClose={() => !isSubmitting && setOpen(false)} title={plan ? t("editTitle") : t("newTitle")} closeLabel={tc("close")} className="max-w-2xl">
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
          <FormAlert code={serverError && serverError !== "validation" ? serverError : null} />
          <div className="grid gap-4 sm:grid-cols-2">
            {text("name", t("name"))}
            {text("slug", t("slug"), { spellCheck: false })}
          </div>
          <Field label={t("description_")} error={fe(errors.description?.message)}>
            {(a) => <Textarea {...a} rows={2} {...register("description")} />}
          </Field>
          <div className="grid gap-4 sm:grid-cols-3">
            {text("min_amount", t("min"), { inputMode: "decimal" })}
            {text("max_amount", t("max"), { inputMode: "decimal" })}
            {text("term_days", t("term"), { inputMode: "numeric" })}
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            {text("currency", t("currency"), { maxLength: 3 })}
            <Field label={t("risk")} error={fe(errors.risk_level?.message)}>
              {(a) => (
                <Select {...a} {...register("risk_level")}>
                  {["low", "moderate", "high"].map((r) => <option key={r} value={r}>{tc(`risk.${r}`)}</option>)}
                </Select>
              )}
            </Field>
            {text("sort_order", t("order"), { inputMode: "numeric" })}
          </div>
          <Field label={t("riskDescription")} error={fe(errors.risk_description?.message)}>
            {(a) => <Textarea {...a} rows={2} {...register("risk_description")} />}
          </Field>
          <fieldset className="rounded-md border border-line p-4">
            <legend className="px-1 text-sm font-medium">{t("targetBasis")}</legend>
            <p className="mb-3 text-sm text-ink-muted">{t("targetHelp")}</p>
            <div className="grid gap-4 sm:grid-cols-2">
              {text("target_return_min", t("targetMin"), { inputMode: "decimal" })}
              {text("target_return_max", t("targetMax"), { inputMode: "decimal" })}
            </div>
            <Field label={t("targetBasis")} error={fe(errors.target_return_basis?.message)} className="mt-4">
              {(a) => <Textarea {...a} rows={2} {...register("target_return_basis")} />}
            </Field>
          </fieldset>
          <label className="flex items-center gap-3 text-sm">
            <input type="checkbox" className="h-4 w-4 accent-[var(--brass)]" {...register("is_active")} />
            {t("active")}
          </label>
          <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
            <Button variant="secondary" onClick={() => setOpen(false)} disabled={isSubmitting}>{tc("cancel")}</Button>
            <Button type="submit" loading={isSubmitting}>{tc("save")}</Button>
          </div>
        </form>
      </Dialog>
    </>
  );
}
