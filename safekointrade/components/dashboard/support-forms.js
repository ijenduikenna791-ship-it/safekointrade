"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Plus, Send } from "lucide-react";
import { useRouter } from "@/lib/i18n/navigation";
import { ticketSchema } from "@/lib/validation/schemas";
import { closeTicketAction, createTicketAction, replyTicketAction } from "@/lib/actions/user";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { FormAlert, useFieldError } from "@/components/forms/form-alert";

const CATEGORIES = ["account", "deposit", "withdrawal", "investment", "security", "other"];

export function NewTicketButton() {
  const t = useTranslations("dashboard.support");
  const tc = useTranslations("common");
  const fe = useFieldError();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [serverError, setServerError] = useState(null);
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(ticketSchema),
    defaultValues: { subject: "", category: "account", message: "" },
  });

  const onSubmit = async (values) => {
    setServerError(null);
    const res = await createTicketAction(values).catch(() => ({ ok: false, error: "network" }));
    if (!res.ok) return setServerError(res.error);
    toast.success(t("created", { reference: res.data.reference }));
    reset();
    setOpen(false);
    router.push(`/dashboard/support/${res.data.id}`);
  };

  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" aria-hidden="true" />
        {t("new")}
      </Button>
      <Dialog open={open} onClose={() => !isSubmitting && setOpen(false)} title={t("newTitle")} closeLabel={tc("close")}>
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
          <FormAlert code={serverError && serverError !== "validation" ? serverError : null} />
          <Field label={t("subject")} error={fe(errors.subject?.message)}>
            {(a) => <Input {...a} {...register("subject")} />}
          </Field>
          <Field label={t("category")} error={fe(errors.category?.message)}>
            {(a) => (
              <Select {...a} {...register("category")}>
                {CATEGORIES.map((c) => <option key={c} value={c}>{t(`categories.${c}`)}</option>)}
              </Select>
            )}
          </Field>
          <Field label={t("message")} error={fe(errors.message?.message)} hint={t("messageHint")}>
            {(a) => <Textarea {...a} rows={6} {...register("message")} />}
          </Field>
          <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
            <Button variant="secondary" onClick={() => setOpen(false)} disabled={isSubmitting}>{tc("cancel")}</Button>
            <Button type="submit" loading={isSubmitting}>{t("submit")}</Button>
          </div>
        </form>
      </Dialog>
    </>
  );
}

export function TicketReply({ ticketId, closed, canClose = true }) {
  const t = useTranslations("dashboard.support");
  const te = useTranslations("errors");
  const tv = useTranslations("validation");
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState(null);

  if (closed) return <p className="px-5 py-4 text-sm text-ink-subtle">{t("closedNote")}</p>;

  const send = async (e) => {
    e.preventDefault();
    if (!message.trim()) return setError(tv("required"));
    setBusy("send");
    setError(null);
    const res = await replyTicketAction({ ticketId, message }).catch(() => ({ ok: false, error: "network" }));
    setBusy(null);
    if (!res.ok) return toast.error(te.has(res.error) ? te(res.error) : te("generic"));
    setMessage("");
    toast.success(t("sent"));
    router.refresh();
  };

  const close = async () => {
    setBusy("close");
    const res = await closeTicketAction(ticketId).catch(() => ({ ok: false, error: "network" }));
    setBusy(null);
    if (!res.ok) return toast.error(te.has(res.error) ? te(res.error) : te("generic"));
    toast.success(t("closed"));
    router.refresh();
  };

  return (
    <form onSubmit={send} className="border-t border-line px-5 py-4">
      <label htmlFor="reply" className="sr-only">{t("reply")}</label>
      <Textarea
        id="reply"
        rows={4}
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder={t("replyPlaceholder")}
        aria-invalid={error ? true : undefined}
        maxLength={4000}
      />
      {error && <p role="alert" className="mt-1.5 text-sm text-loss">{error}</p>}
      <div className="mt-3 flex flex-wrap justify-between gap-2">
        {canClose ? <Button variant="ghost" size="sm" onClick={close} loading={busy === "close"} disabled={Boolean(busy)}>{t("close")}</Button> : <span />}
        <Button type="submit" size="sm" loading={busy === "send"} disabled={Boolean(busy)}>
          <Send className="h-4 w-4 rtl-flip" aria-hidden="true" />
          {t("send")}
        </Button>
      </div>
    </form>
  );
}
