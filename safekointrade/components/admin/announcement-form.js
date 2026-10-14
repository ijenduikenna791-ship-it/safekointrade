"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Megaphone } from "lucide-react";
import { useRouter } from "@/lib/i18n/navigation";
import { sendAnnouncementAction } from "@/lib/actions/admin";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { FormAlert, useFieldError } from "@/components/forms/form-alert";

export function AnnouncementForm() {
  const t = useTranslations("admin.notifications");
  const fe = useFieldError();
  const router = useRouter();
  const [values, setValues] = useState({ audience: "all", email: "", title: "", body: "" });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState(null);
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setValues((v) => ({ ...v, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setErrors({});
    setServerError(null);
    const res = await sendAnnouncementAction(values).catch(() => ({ ok: false, error: "network" }));
    setBusy(false);
    if (!res.ok) {
      if (res.fieldErrors) setErrors(res.fieldErrors);
      if (res.fieldErrors?.email) setErrors((x) => ({ ...x, email: "userNotFound" }));
      return setServerError(res.error);
    }
    toast.success(t("sent", { count: res.data.count }));
    setValues({ audience: "all", email: "", title: "", body: "" });
    router.refresh();
  };

  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      <FormAlert code={serverError && serverError !== "validation" ? serverError : null} />
      <Field label={t("audience")}>
        {(a) => (
          <Select {...a} value={values.audience} onChange={set("audience")}>
            <option value="all">{t("all")}</option>
            <option value="user">{t("one")}</option>
          </Select>
        )}
      </Field>
      {values.audience === "user" && (
        <Field label={t("userEmail")} error={errors.email === "userNotFound" ? t("userNotFound") : fe(errors.email)}>
          {(a) => <Input {...a} type="email" value={values.email} onChange={set("email")} />}
        </Field>
      )}
      <Field label={t("titleField")} error={fe(errors.title)}>
        {(a) => <Input {...a} value={values.title} onChange={set("title")} maxLength={120} />}
      </Field>
      <Field label={t("body")} error={fe(errors.body)}>
        {(a) => <Textarea {...a} rows={5} value={values.body} onChange={set("body")} maxLength={2000} />}
      </Field>
      <Button type="submit" loading={busy}>
        <Megaphone className="h-4 w-4" aria-hidden="true" />
        {t("send")}
      </Button>
    </form>
  );
}
