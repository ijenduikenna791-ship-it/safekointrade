"use client";

import { useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/lib/i18n/navigation";
import { registerSchema } from "@/lib/validation/schemas";
import { registerAction } from "@/lib/auth/actions";
import { Button } from "@/components/ui/button";
import { Field, FieldError, Input } from "@/components/ui/field";
import { PasswordInput } from "@/components/forms/password-input";
import { PasswordStrength } from "@/components/forms/password-strength";
import { PhoneInput } from "@/components/forms/phone-input";
import { FormAlert, useFieldError } from "@/components/forms/form-alert";

export function RegisterForm({ referralCode = "" }) {
  const t = useTranslations("auth");
  const tc = useTranslations("common");
  const fe = useFieldError();
  const router = useRouter();
  const [serverError, setServerError] = useState(null);

  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting, isSubmitSuccessful },
  } = useForm({
    resolver: zodResolver(registerSchema),
    mode: "onTouched",
    defaultValues: {
      fullName: "",
      username: "",
      email: "",
      phone: "",
      password: "",
      confirmPassword: "",
      acceptTerms: false,
      referralCode,
    },
  });
  const password = useWatch({ control, name: "password" });

  const onSubmit = async (values) => {
    setServerError(null);
    try {
      const res = await registerAction(values);
      if (res.ok) {
        router.replace({ pathname: "/verify-email", query: { email: res.data.email, sent: "1" } });
        return;
      }
      if (res.fieldErrors) {
        Object.entries(res.fieldErrors).forEach(([k, v]) => setError(k, { message: v }, { shouldFocus: true }));
      }
      setServerError(res.error);
    } catch {
      setServerError("network");
    }
  };

  const busy = isSubmitting || (isSubmitSuccessful && !serverError);

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
      <FormAlert code={serverError && serverError !== "validation" ? serverError : null} />

      <Field label={t("fullName")} error={fe(errors.fullName?.message)}>
        {(a) => <Input {...a} autoComplete="name" {...register("fullName")} />}
      </Field>

      <Field label={t("username")} error={fe(errors.username?.message)} hint={t("usernameHint")}>
        {(a) => (
          <Input
            {...a}
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            {...register("username", { setValueAs: (v) => String(v).toLowerCase() })}
          />
        )}
      </Field>

      <Field label={t("email")} error={fe(errors.email?.message)}>
        {(a) => <Input {...a} type="email" autoComplete="email" inputMode="email" {...register("email")} />}
      </Field>

      <Field label={t("phone")} error={fe(errors.phone?.message)} hint={t("phoneHint")}>
        {(a) => (
          <Controller
            control={control}
            name="phone"
            render={({ field }) => (
              <PhoneInput
                id={a.id}
                name={field.name}
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
                invalid={Boolean(errors.phone)}
                describedBy={a["aria-describedby"]}
              />
            )}
          />
        )}
      </Field>

      <Field label={t("password")} error={fe(errors.password?.message)}>
        {(a) => (
          <>
            <PasswordInput {...a} autoComplete="new-password" aria-describedby={`${a["aria-describedby"] || ""} pw-strength`.trim()} {...register("password")} />
            <PasswordStrength value={password} id="pw-strength" />
          </>
        )}
      </Field>

      <Field label={t("confirmPassword")} error={fe(errors.confirmPassword?.message)}>
        {(a) => <PasswordInput {...a} autoComplete="new-password" {...register("confirmPassword")} />}
      </Field>

      <Field label={t("referral")} optional optionalText={tc("optional")} error={fe(errors.referralCode?.message)}>
        {(a) => (
          <Input {...a} autoCapitalize="characters" spellCheck={false} {...register("referralCode", { setValueAs: (v) => String(v).toUpperCase() })} />
        )}
      </Field>

      <div>
        <label className="flex items-start gap-3 text-sm text-ink-muted">
          <input
            type="checkbox"
            className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--brass)]"
            aria-invalid={errors.acceptTerms ? true : undefined}
            aria-describedby={errors.acceptTerms ? "terms-error" : undefined}
            {...register("acceptTerms")}
          />
          <span>
            {t.rich("acceptTerms", {
              terms: (c) => <Link href="/legal/terms" target="_blank" className="text-brass underline-offset-2 hover:underline">{c}</Link>,
              privacy: (c) => <Link href="/legal/privacy" target="_blank" className="text-brass underline-offset-2 hover:underline">{c}</Link>,
              risk: (c) => <Link href="/legal/risk" target="_blank" className="text-brass underline-offset-2 hover:underline">{c}</Link>,
            })}
          </span>
        </label>
        <FieldError id="terms-error">{fe(errors.acceptTerms?.message)}</FieldError>
      </div>

      <Button type="submit" size="lg" className="w-full" loading={busy} disabled={busy}>
        {busy ? t("register.submitting") : t("register.submit")}
      </Button>
    </form>
  );
}
