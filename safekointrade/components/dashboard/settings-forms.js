"use client";

import { useEffect, useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useLocale, useTranslations } from "next-intl";
import { useTheme } from "next-themes";
import { toast } from "sonner";
import { Copy, Fingerprint, LogOut, ShieldCheck } from "lucide-react";
import { usePathname, useRouter } from "@/lib/i18n/navigation";
import { changePasswordSchema, profileSchema } from "@/lib/validation/schemas";
import {
  changePasswordAction, updateNotificationPrefsAction, updatePreferencesAction, updateProfileAction,
} from "@/lib/actions/user";
import { signOutAction } from "@/lib/auth/actions";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";
import { Badge } from "@/components/ui/badge";
import { Dialog } from "@/components/ui/dialog";
import { PasswordInput } from "@/components/forms/password-input";
import { PasswordStrength } from "@/components/forms/password-strength";
import { PhoneInput } from "@/components/forms/phone-input";
import { FormAlert, useFieldError } from "@/components/forms/form-alert";
import { ThemeSegmented } from "@/components/navigation/theme-toggle";
import { locales, localeMeta } from "@/lib/i18n/routing";
import { formatDate } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";

function Section({ title, description, children }) {
  return (
    <section className="grid gap-6 border-b border-line py-8 first:pt-0 last:border-0 lg:grid-cols-[16rem_1fr] lg:gap-12">
      <div>
        <h2 className="text-base font-semibold">{title}</h2>
        {description && <p className="mt-1 text-sm text-ink-muted">{description}</p>}
      </div>
      <div className="min-w-0 max-w-xl">{children}</div>
    </section>
  );
}

const errorToast = (te, res) => toast.error(te.has(res.error) ? te(res.error) : te("generic"));

// --- Profile --------------------------------------------------------------------------
export function ProfileSettings({ profile }) {
  const t = useTranslations("dashboard.settings.profile");
  const ta = useTranslations("auth");
  const tc = useTranslations("common");
  const te = useTranslations("errors");
  const fe = useFieldError();
  const locale = useLocale();
  const router = useRouter();
  const { register, control, handleSubmit, setError, formState: { errors, isSubmitting, isDirty } } = useForm({
    resolver: zodResolver(profileSchema),
    defaultValues: { fullName: profile.full_name || "", phone: profile.phone || "", country: profile.country || "" },
  });

  const onSubmit = async (values) => {
    const res = await updateProfileAction(values).catch(() => ({ ok: false, error: "network" }));
    if (!res.ok) {
      if (res.fieldErrors) Object.entries(res.fieldErrors).forEach(([k, v]) => setError(k, { message: v }));
      return errorToast(te, res);
    }
    toast.success(t("saved"));
    router.refresh();
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(profile.referral_code);
      toast.success(tc("copied"));
    } catch {}
  };

  return (
    <Section title={t("title")} description={t("description")}>
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        <Field label={ta("fullName")} error={fe(errors.fullName?.message)}>
          {(a) => <Input {...a} autoComplete="name" {...register("fullName")} />}
        </Field>
        <Field label={t("email")} hint={t("emailHint")}>
          {(a) => <Input {...a} value={profile.email} readOnly disabled />}
        </Field>
        <Field label={t("username")}>
          {(a) => <Input {...a} value={profile.username || ""} readOnly disabled />}
        </Field>
        <Field label={ta("phone")} error={fe(errors.phone?.message)}>
          {(a) => (
            <Controller
              control={control}
              name="phone"
              render={({ field }) => (
                <PhoneInput id={a.id} value={field.value} onChange={field.onChange} onBlur={field.onBlur} invalid={Boolean(errors.phone)} describedBy={a["aria-describedby"]} />
              )}
            />
          )}
        </Field>
        {profile.phone && <Badge>{t("phoneUnverified")}</Badge>}
        <dl className="grid gap-4 rounded-md border border-line p-4 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-ink-subtle">{t("referral")}</dt>
            <dd className="mt-1 flex items-center gap-2">
              <span className="tabular font-medium">{profile.referral_code}</span>
              <button type="button" onClick={copy} aria-label={tc("copy")} className="grid h-7 w-7 place-items-center rounded-sm text-ink-subtle hover:bg-surface-2 hover:text-ink">
                <Copy className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </dd>
          </div>
          <div>
            <dt className="text-ink-subtle">{t("memberSince")}</dt>
            <dd className="mt-1 font-medium">{formatDate(profile.created_at, { locale })}</dd>
          </div>
        </dl>
        <Button type="submit" loading={isSubmitting} disabled={!isDirty}>{tc("save")}</Button>
      </form>
    </Section>
  );
}

// --- Security ---------------------------------------------------------------------------
export function SecuritySettings() {
  const t = useTranslations("dashboard.settings.security");
  const ta = useTranslations("auth");
  const tc = useTranslations("common");
  const te = useTranslations("errors");
  const tv = useTranslations("validation");
  const fe = useFieldError();
  const router = useRouter();
  const { register, control, handleSubmit, reset, setError, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(changePasswordSchema),
    mode: "onTouched",
    defaultValues: { password: "", confirmPassword: "" },
  });
  const newPassword = useWatch({ control, name: "password" });

  const [factor, setFactor] = useState(undefined); // undefined = loading, null = none
  const [enroll, setEnroll] = useState(null);
  const [code, setCode] = useState("");
  const [mfaBusy, setMfaBusy] = useState(false);
  const [codeError, setCodeError] = useState(null);
  const [confirmOff, setConfirmOff] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  const loadFactors = async () => {
    const supabase = createClient();
    if (!supabase) return setFactor(null);
    const { data } = await supabase.auth.mfa.listFactors();
    setFactor(data?.totp?.find((f) => f.status === "verified") || null);
  };
  useEffect(() => {
    // Loading the user's MFA factors from the browser client on mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadFactors();
  }, []);

  const changePassword = async (values) => {
    const res = await changePasswordAction(values).catch(() => ({ ok: false, error: "network" }));
    if (!res.ok) {
      if (res.fieldErrors) Object.entries(res.fieldErrors).forEach(([k, v]) => setError(k, { message: v }));
      return res.error !== "validation" && errorToast(te, res);
    }
    toast.success(t("passwordUpdated"));
    reset();
  };

  const startEnroll = async () => {
    setMfaBusy(true);
    const supabase = createClient();
    // Clear any abandoned, unverified factor first.
    const { data: list } = await supabase.auth.mfa.listFactors();
    for (const f of list?.all || []) if (f.status === "unverified") await supabase.auth.mfa.unenroll({ factorId: f.id });
    const { data, error } = await supabase.auth.mfa.enroll({ factorType: "totp", friendlyName: `Authenticator ${Date.now()}` });
    setMfaBusy(false);
    if (error) return toast.error(te("generic"));
    setEnroll({ id: data.id, qr: data.totp.qr_code, secret: data.totp.secret });
  };

  const verifyEnroll = async (e) => {
    e.preventDefault();
    if (!/^\d{6}$/.test(code)) return setCodeError(tv("codeInvalid"));
    setMfaBusy(true);
    const supabase = createClient();
    const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId: enroll.id, code });
    setMfaBusy(false);
    if (error) return setCodeError(ta("mfa.invalid"));
    setEnroll(null);
    setCode("");
    toast.success(t("mfaEnabled"));
    await loadFactors();
    router.refresh();
  };

  const disable = async () => {
    setMfaBusy(true);
    const supabase = createClient();
    const { error } = await supabase.auth.mfa.unenroll({ factorId: factor.id });
    setMfaBusy(false);
    setConfirmOff(false);
    if (error) return toast.error(/aal2/i.test(error.message) ? te("mfa_required") : te("generic"));
    toast.success(t("mfaDisabled"));
    await loadFactors();
  };

  const signOutEverywhere = async () => {
    setSigningOut(true);
    await signOutAction("global").catch(() => {});
    await createClient()?.auth.signOut({ scope: "local" }).catch(() => {});
    router.replace("/login?signedOut=1");
  };

  return (
    <>
      <Section title={t("passwordTitle")} description={t("passwordDescription")}>
        <form onSubmit={handleSubmit(changePassword)} noValidate className="space-y-4">
          <Field label={t("newPassword")} error={fe(errors.password?.message)}>
            {(a) => (
              <>
                <PasswordInput {...a} autoComplete="new-password" {...register("password")} />
                <PasswordStrength value={newPassword} />
              </>
            )}
          </Field>
          <Field label={ta("confirmPassword")} error={fe(errors.confirmPassword?.message)}>
            {(a) => <PasswordInput {...a} autoComplete="new-password" {...register("confirmPassword")} />}
          </Field>
          <Button type="submit" loading={isSubmitting}>{t("updatePassword")}</Button>
        </form>
      </Section>

      <Section title={t("mfaTitle")} description={t("mfaDescription")}>
        <div className="rounded-md border border-line p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="flex items-center gap-2 text-sm font-medium">
              <Fingerprint className="h-4 w-4 text-ink-subtle" aria-hidden="true" />
              {t("mfaTitle")}
              {factor !== undefined && <Badge tone={factor ? "gain" : "neutral"}>{factor ? t("mfaOn") : t("mfaOff")}</Badge>}
            </p>
            {factor === null && !enroll && <Button size="sm" onClick={startEnroll} loading={mfaBusy}>{t("mfaEnable")}</Button>}
            {factor && <Button size="sm" variant="danger-outline" onClick={() => setConfirmOff(true)}>{t("mfaDisable")}</Button>}
          </div>
          {enroll && (
            <form onSubmit={verifyEnroll} className="mt-5 space-y-4 border-t border-line pt-5">
              <p className="text-sm text-ink-muted">{t("mfaScan")}</p>
              {/* QR code is an SVG data URL generated by Supabase */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={enroll.qr} alt="" width={176} height={176} className="rounded-md border border-line bg-white p-2" />
              <p className="text-xs text-ink-subtle">
                {t("mfaSecret")} <code className="break-all rounded bg-surface-2 px-1.5 py-0.5 font-mono text-ink">{enroll.secret}</code>
              </p>
              <Field label={ta("mfa.code")} error={codeError}>
                {(a) => (
                  <Input {...a} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))} inputMode="numeric" autoComplete="one-time-code" className="tabular max-w-48 tracking-[0.3em]" />
                )}
              </Field>
              <div className="flex gap-2">
                <Button type="submit" loading={mfaBusy}><ShieldCheck className="h-4 w-4" aria-hidden="true" />{t("mfaVerify")}</Button>
                <Button variant="ghost" onClick={() => setEnroll(null)}>{tc("cancel")}</Button>
              </div>
            </form>
          )}
        </div>
      </Section>

      <Section title={t("sessionsTitle")} description={t("sessionsDescription")}>
        <Button variant="secondary" onClick={signOutEverywhere} loading={signingOut}>
          <LogOut className="h-4 w-4 rtl-flip" aria-hidden="true" />
          {t("signOutAll")}
        </Button>
      </Section>

      <Dialog open={confirmOff} onClose={() => setConfirmOff(false)} title={t("mfaDisableTitle")} description={t("mfaDisableBody")} closeLabel={tc("close")}>
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="secondary" onClick={() => setConfirmOff(false)}>{tc("cancel")}</Button>
          <Button variant="danger" onClick={disable} loading={mfaBusy}>{t("mfaDisable")}</Button>
        </div>
      </Dialog>
    </>
  );
}

// --- Notifications ------------------------------------------------------------------------
const PREF_KEYS = ["email_deposits", "email_withdrawals", "email_investments", "email_security", "email_product"];

function Switch({ checked, onChange, id, describedBy }) {
  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      aria-describedby={describedBy}
      onClick={() => onChange(!checked)}
      className={cn("relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors", checked ? "bg-gain" : "bg-surface-3")}
    >
      <span className={cn("inline-block h-5 w-5 rounded-full bg-white shadow-sm transition-transform", checked ? "translate-x-5 rtl:-translate-x-5" : "translate-x-0.5 rtl:-translate-x-0.5")} />
    </button>
  );
}

export function NotificationSettings({ prefs }) {
  const t = useTranslations("dashboard.settings.notifications");
  const tc = useTranslations("common");
  const te = useTranslations("errors");
  const [values, setValues] = useState(() => Object.fromEntries(PREF_KEYS.map((k) => [k, Boolean(prefs?.[k] ?? k !== "email_product")])));
  const [busy, setBusy] = useState(false);

  const save = async () => {
    setBusy(true);
    const res = await updateNotificationPrefsAction(values).catch(() => ({ ok: false, error: "network" }));
    setBusy(false);
    if (!res.ok) return errorToast(te, res);
    toast.success(t("saved"));
  };

  return (
    <Section title={t("title")} description={t("description")}>
      <ul className="divide-y divide-line rounded-md border border-line">
        {PREF_KEYS.map((k) => (
          <li key={k} className="flex items-center justify-between gap-4 px-4 py-3.5">
            <label htmlFor={`pref-${k}`} className="text-sm">
              <span className="block font-medium">{t(k)}</span>
              {k === "email_security" && <span id={`pref-${k}-hint`} className="block text-xs text-ink-subtle">{t("email_security_hint")}</span>}
            </label>
            <Switch id={`pref-${k}`} checked={values[k]} onChange={(v) => setValues((s) => ({ ...s, [k]: v }))} describedBy={k === "email_security" ? `pref-${k}-hint` : undefined} />
          </li>
        ))}
      </ul>
      <Button className="mt-4" onClick={save} loading={busy}>{tc("save")}</Button>
    </Section>
  );
}

// --- Preferences --------------------------------------------------------------------------
export function PreferenceSettings({ profile }) {
  const t = useTranslations("dashboard.settings.preferences");
  const tc = useTranslations("common");
  const te = useTranslations("errors");
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const { theme } = useTheme();
  const [lang, setLang] = useState(profile.locale || locale);
  const [busy, setBusy] = useState(false);

  const save = async () => {
    setBusy(true);
    const res = await updatePreferencesAction({ locale: lang, theme: theme || "system" }).catch(() => ({ ok: false, error: "network" }));
    setBusy(false);
    if (!res.ok) return errorToast(te, res);
    toast.success(t("saved"));
    if (lang !== locale) router.replace({ pathname, query: { tab: "preferences" } }, { locale: lang });
  };

  return (
    <Section title={t("title")} description={t("description")}>
      <div className="space-y-5">
        <Field label={t("language")}>
          {(a) => (
            <Select {...a} value={lang} onChange={(e) => setLang(e.target.value)}>
              {locales.map((l) => <option key={l} value={l} lang={l}>{localeMeta[l].native} — {localeMeta[l].label}</option>)}
            </Select>
          )}
        </Field>
        <div>
          <p className="mb-1.5 text-sm font-medium">{t("theme")}</p>
          <ThemeSegmented />
        </div>
        <Button onClick={save} loading={busy}>{tc("save")}</Button>
      </div>
    </Section>
  );
}
