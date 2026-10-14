"use client";

import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { CircleCheck } from "lucide-react";
import { Link, useRouter } from "@/lib/i18n/navigation";
import { forgotSchema, resetSchema } from "@/lib/validation/schemas";
import { forgotPasswordAction, resendVerificationAction, resetPasswordAction, signOutAction } from "@/lib/auth/actions";
import { createClient } from "@/lib/supabase/client";
import { Button, buttonClasses } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { Alert } from "@/components/ui/feedback";
import { PasswordInput } from "@/components/forms/password-input";
import { PasswordStrength } from "@/components/forms/password-strength";
import { FormAlert, useFieldError } from "@/components/forms/form-alert";

export function ForgotPasswordForm() {
  const t = useTranslations("auth");
  const fe = useFieldError();
  const [sent, setSent] = useState(false);
  const [serverError, setServerError] = useState(null);
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(forgotSchema),
    defaultValues: { email: "" },
  });

  const onSubmit = async (values) => {
    setServerError(null);
    const res = await forgotPasswordAction(values).catch(() => ({ ok: false, error: "network" }));
    if (res.ok) setSent(true);
    else setServerError(res.error);
  };

  if (sent) {
    return (
      <div className="space-y-6">
        <Alert tone="success">{t("forgot.sent")}</Alert>
        <Link href="/login" className={buttonClasses({ variant: "secondary", className: "w-full" })}>{t("forgot.back")}</Link>
      </div>
    );
  }
  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
      <FormAlert code={serverError !== "validation" ? serverError : null} />
      <Field label={t("email")} error={fe(errors.email?.message)}>
        {(a) => <Input {...a} type="email" autoComplete="email" {...register("email")} />}
      </Field>
      <Button type="submit" size="lg" className="w-full" loading={isSubmitting}>{t("forgot.submit")}</Button>
      <p className="text-center text-sm">
        <Link href="/login" className="text-brass hover:underline">{t("forgot.back")}</Link>
      </p>
    </form>
  );
}

export function ResetPasswordForm() {
  const t = useTranslations("auth");
  const fe = useFieldError();
  const router = useRouter();
  const [serverError, setServerError] = useState(null);
  const { register, control, handleSubmit, setError, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(resetSchema),
    mode: "onTouched",
    defaultValues: { password: "", confirmPassword: "" },
  });
  const newPassword = useWatch({ control, name: "password" });

  const onSubmit = async (values) => {
    setServerError(null);
    const res = await resetPasswordAction(values).catch(() => ({ ok: false, error: "network" }));
    if (res.ok) {
      toast.success(t("reset.success"));
      router.replace(res.data.redirect);
      return;
    }
    if (res.fieldErrors) Object.entries(res.fieldErrors).forEach(([k, v]) => setError(k, { message: v }));
    setServerError(res.error);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
      <FormAlert code={serverError && serverError !== "validation" ? serverError : null} />
      {serverError === "reset_link_expired" && (
        <Link href="/forgot-password" className={buttonClasses({ variant: "secondary", className: "w-full" })}>
          {t("forgot.submit")}
        </Link>
      )}
      <Field label={t("password")} error={fe(errors.password?.message)}>
        {(a) => (
          <>
            <PasswordInput {...a} autoComplete="new-password" {...register("password")} />
            <PasswordStrength value={newPassword} />
          </>
        )}
      </Field>
      <Field label={t("confirmPassword")} error={fe(errors.confirmPassword?.message)}>
        {(a) => <PasswordInput {...a} autoComplete="new-password" {...register("confirmPassword")} />}
      </Field>
      <Button type="submit" size="lg" className="w-full" loading={isSubmitting}>{t("reset.submit")}</Button>
    </form>
  );
}

export function ResendVerification({ email: initialEmail }) {
  const t = useTranslations("auth");
  const te = useTranslations("errors");
  const fe = useFieldError();
  const [email, setEmail] = useState(initialEmail || "");
  const [busy, setBusy] = useState(false);
  const [fieldError, setFieldError] = useState(null);

  const resend = async (e) => {
    e.preventDefault();
    setBusy(true);
    setFieldError(null);
    const res = await resendVerificationAction(email).catch(() => ({ ok: false, error: "network" }));
    setBusy(false);
    if (res.ok) return toast.success(t("verify.resent"));
    if (res.fieldErrors?.email) return setFieldError(res.fieldErrors.email);
    toast.error(te.has(res.error) ? te(res.error) : te("generic"));
  };

  return (
    <form onSubmit={resend} noValidate className="space-y-4">
      {!initialEmail && (
        <Field label={t("email")} error={fe(fieldError)}>
          {(a) => <Input {...a} type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />}
        </Field>
      )}
      <Button type="submit" variant="secondary" size="lg" className="w-full" loading={busy}>{t("verify.resend")}</Button>
    </form>
  );
}

export function LogoutConfirm() {
  const t = useTranslations("auth.logout");
  const router = useRouter();
  const [busy, setBusy] = useState(null);

  const go = async (scope) => {
    setBusy(scope);
    const res = await signOutAction(scope).catch(() => ({ ok: true, data: { redirect: "/login" } }));
    // Also clear the browser client's in-memory session.
    await createClient()?.auth.signOut({ scope: "local" }).catch(() => {});
    router.replace(res.data?.redirect || "/login");
    router.refresh();
  };

  return (
    <div className="space-y-3">
      <Button size="lg" className="w-full" onClick={() => go("local")} loading={busy === "local"} disabled={Boolean(busy)}>
        {t("confirm")}
      </Button>
      <Button variant="secondary" size="lg" className="w-full" onClick={() => go("global")} loading={busy === "global"} disabled={Boolean(busy)}>
        {t("everywhere")}
      </Button>
      <Button variant="ghost" size="lg" className="w-full" onClick={() => router.back()} disabled={Boolean(busy)}>
        {t("cancel")}
      </Button>
    </div>
  );
}

export function MfaChallengeForm({ next = "/dashboard" }) {
  const t = useTranslations("auth.mfa");
  const tv = useTranslations("validation");
  const te = useTranslations("errors");
  const router = useRouter();
  const [code, setCode] = useState("");
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!/^\d{6}$/.test(code)) return setError(tv("codeInvalid"));
    setBusy(true);
    setError(null);
    try {
      const supabase = createClient();
      if (!supabase) throw new Error("not_configured");
      const { data: factors, error: listError } = await supabase.auth.mfa.listFactors();
      if (listError) throw listError;
      const factor = factors?.totp?.find((f) => f.status === "verified");
      if (!factor) {
        router.replace(next);
        return;
      }
      const { error: verifyError } = await supabase.auth.mfa.challengeAndVerify({ factorId: factor.id, code });
      if (verifyError) {
        setError(t("invalid"));
        setBusy(false);
        return;
      }
      router.replace(next);
      router.refresh();
    } catch {
      setError(te("generic"));
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} noValidate className="space-y-5">
      <Field label={t("code")} error={error}>
        {(a) => (
          <Input
            {...a}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="\d{6}"
            className="tabular text-center text-2xl tracking-[0.5em]"
            autoFocus
          />
        )}
      </Field>
      <Button type="submit" size="lg" className="w-full" loading={busy}>
        <CircleCheck className="h-4 w-4" aria-hidden="true" />
        {t("submit")}
      </Button>
    </form>
  );
}
