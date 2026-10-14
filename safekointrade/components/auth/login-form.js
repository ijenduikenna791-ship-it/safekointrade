"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Link, useRouter } from "@/lib/i18n/navigation";
import { loginSchema } from "@/lib/validation/schemas";
import { loginAction, resendVerificationAction } from "@/lib/auth/actions";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { Alert } from "@/components/ui/feedback";
import { PasswordInput } from "@/components/forms/password-input";
import { FormAlert, useFieldError } from "@/components/forms/form-alert";

export function LoginForm({ next, signedOut, staff = false }) {
  const t = useTranslations("auth");
  const te = useTranslations("errors");
  const fe = useFieldError();
  const router = useRouter();
  const [serverError, setServerError] = useState(null);
  const [unverifiedEmail, setUnverifiedEmail] = useState(null);
  const [resending, setResending] = useState(false);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(loginSchema), defaultValues: { email: "", password: "" } });

  const onSubmit = async (values) => {
    setServerError(null);
    setUnverifiedEmail(null);
    try {
      const res = await loginAction(values, next || (staff ? "/admin" : "/dashboard"));
      if (res.ok) {
        router.replace(res.data.redirect);
        router.refresh();
        return;
      }
      if (res.error === "email_not_confirmed") return setUnverifiedEmail(values.email);
      if (res.fieldErrors) Object.entries(res.fieldErrors).forEach(([k, v]) => setError(k, { message: v }));
      setServerError(res.error);
    } catch {
      setServerError("network");
    }
  };

  const resend = async () => {
    setResending(true);
    const res = await resendVerificationAction(unverifiedEmail).catch(() => ({ ok: false, error: "network" }));
    setResending(false);
    if (res.ok) toast.success(t("verify.resent"));
    else toast.error(te(res.error || "generic"));
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
      {signedOut && <Alert tone="success">{t("login.signedOut")}</Alert>}
      {unverifiedEmail && (
        <Alert tone="warn">
          {t("login.notVerified")}{" "}
          <button type="button" onClick={resend} disabled={resending} className="font-medium text-warn underline underline-offset-2">
            {t("login.resend")}
          </button>
        </Alert>
      )}
      <FormAlert code={serverError !== "validation" ? serverError : null} />

      <Field label={t("email")} error={fe(errors.email?.message)}>
        {(a) => <Input {...a} type="email" autoComplete="email" inputMode="email" {...register("email")} />}
      </Field>

      <div>
        <Field label={t("password")} error={fe(errors.password?.message)}>
          {(a) => <PasswordInput {...a} autoComplete="current-password" {...register("password")} />}
        </Field>
        {!staff && (
          <div className="mt-2 text-end">
            <Link href="/forgot-password" className="text-sm text-brass hover:underline">{t("login.forgot")}</Link>
          </div>
        )}
      </div>

      <Button type="submit" size="lg" className="w-full" loading={isSubmitting}>
        {isSubmitting ? t("login.submitting") : t("login.submit")}
      </Button>
    </form>
  );
}
