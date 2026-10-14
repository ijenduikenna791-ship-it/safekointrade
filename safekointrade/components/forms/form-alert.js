"use client";

import { useTranslations } from "next-intl";
import { Alert } from "@/components/ui/feedback";

/** Shows a translated top-level form error from a Server Action result code. */
export function FormAlert({ code, className, children }) {
  const t = useTranslations("errors");
  if (!code && !children) return null;
  return (
    <Alert tone="error" className={className}>
      {children || (t.has(code) ? t(code) : t("generic"))}
    </Alert>
  );
}

/** Translate a schema/server field error key from the "validation" namespace. */
export function useFieldError() {
  const t = useTranslations("validation");
  return (key) => {
    if (!key) return undefined;
    return t.has(key) ? t(key) : t("invalidRequest");
  };
}
