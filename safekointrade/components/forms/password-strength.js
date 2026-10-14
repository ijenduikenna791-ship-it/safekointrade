"use client";

import { useTranslations } from "next-intl";
import { Check, Minus } from "lucide-react";
import { passwordRules, passwordScore } from "@/lib/validation/schemas";
import { cn } from "@/lib/utils/cn";

const tones = ["bg-loss", "bg-loss", "bg-warn", "bg-gain", "bg-gain"];
const text = ["text-loss", "text-loss", "text-warn", "text-gain", "text-gain"];

export function PasswordStrength({ value = "", id }) {
  const t = useTranslations("auth.strength");
  const score = passwordScore(value);
  const levels = t.raw("levels");

  return (
    <div id={id} className="mt-2.5">
      <div className="flex items-center gap-3">
        <div className="grid flex-1 grid-cols-4 gap-1" aria-hidden="true">
          {[1, 2, 3, 4].map((i) => (
            <span
              key={i}
              className={cn("h-1 rounded-full transition-colors duration-200", value && score >= i ? tones[score] : "bg-surface-3")}
            />
          ))}
        </div>
        <span className={cn("min-w-16 text-end text-xs font-medium", value ? text[score] : "text-ink-subtle")} aria-live="polite">
          <span className="sr-only">{t("label")}: </span>
          {value ? levels[score] : ""}
        </span>
      </div>
      <ul className="mt-2.5 grid gap-x-4 gap-y-1 text-xs sm:grid-cols-2">
        {passwordRules.map((rule) => {
          const passed = rule.test(value);
          return (
            <li key={rule.key} className={cn("flex items-center gap-1.5", passed ? "text-gain" : "text-ink-subtle")}>
              {passed ? <Check className="h-3.5 w-3.5" aria-hidden="true" /> : <Minus className="h-3.5 w-3.5" aria-hidden="true" />}
              {t(`rules.${rule.key}`)}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
