"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import { CircleCheck } from "lucide-react";
import { newsletterSchema } from "@/lib/validation/schemas";
import { Button } from "@/components/ui/button";
import { Input, FieldError } from "@/components/ui/field";

export function Newsletter() {
  const t = useTranslations("home.newsletter");
  const tc = useTranslations("common");
  const locale = useLocale();
  const [done, setDone] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(newsletterSchema), defaultValues: { email: "", consent: false, website: "" } });

  const onSubmit = async (values) => {
    try {
      const res = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...values, locale }),
      });
      const body = await res.json().catch(() => ({}));
      if (res.status === 429) return toast.error(tc("rateLimited"));
      if (!res.ok) return toast.error(body.error === "not_configured" ? tc("notConfigured") : tc("genericError"));
      if (body.status === "already") toast.info(t("already"));
      setDone(true);
    } catch {
      toast.error(tc("networkError"));
    }
  };

  return (
    <section aria-labelledby="newsletter-title" className="container-page pb-16 sm:pb-24">
      <div className="grid gap-8 rounded-xl border border-line bg-surface p-6 sm:p-10 lg:grid-cols-2 lg:items-center">
        <div>
          <h2 id="newsletter-title" className="text-2xl font-semibold sm:text-3xl">{t("title")}</h2>
          <p className="mt-3 text-ink-muted">{t("body")}</p>
        </div>
        {done ? (
          <p role="status" className="flex items-start gap-2 text-gain">
            <CircleCheck className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
            {t("success")}
          </p>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} noValidate>
            {/* honeypot — hidden from people, filled by bots */}
            <input type="text" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" {...register("website")} />
            <label htmlFor="nl-email" className="sr-only">{t("email")}</label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input
                id="nl-email"
                type="email"
                autoComplete="email"
                placeholder={t("placeholder")}
                aria-invalid={errors.email ? true : undefined}
                aria-describedby={errors.email ? "nl-email-error" : undefined}
                {...register("email")}
              />
              <Button type="submit" size="lg" loading={isSubmitting} className="h-11 shrink-0">
                {t("submit")}
              </Button>
            </div>
            <FieldError id="nl-email-error">{errors.email && t("invalidEmail")}</FieldError>
            <label className="mt-4 flex items-start gap-3 text-sm text-ink-muted">
              <input
                type="checkbox"
                className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--brass)]"
                aria-invalid={errors.consent ? true : undefined}
                {...register("consent")}
              />
              {t("consent")}
            </label>
            <FieldError>{errors.consent && t("consentRequired")}</FieldError>
          </form>
        )}
      </div>
    </section>
  );
}
