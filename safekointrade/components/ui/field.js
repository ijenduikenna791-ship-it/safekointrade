"use client";

import { forwardRef, useId } from "react";
import { cn } from "@/lib/utils/cn";

export const inputClasses =
  "w-full h-11 rounded-sm border border-line bg-surface px-3 text-[0.95rem] text-ink placeholder:text-ink-subtle " +
  "transition-[border-color,box-shadow] duration-150 hover:border-line-strong " +
  "focus:border-brass focus:outline-none focus:ring-3 focus:ring-focus/25 " +
  "disabled:opacity-60 disabled:cursor-not-allowed " +
  "aria-invalid:border-loss aria-invalid:focus:ring-loss/20";

export function Label({ className, children, optional, optionalText = "Optional", ...props }) {
  return (
    <label className={cn("mb-1.5 flex items-baseline justify-between text-sm font-medium text-ink", className)} {...props}>
      <span>{children}</span>
      {optional && <span className="text-xs font-normal text-ink-subtle">{optionalText}</span>}
    </label>
  );
}

export function FieldError({ id, children }) {
  if (!children) return null;
  return (
    <p id={id} role="alert" className="mt-1.5 text-sm text-loss">
      {children}
    </p>
  );
}

export function FieldHint({ id, children }) {
  if (!children) return null;
  return (
    <p id={id} className="mt-1.5 text-sm text-ink-subtle">
      {children}
    </p>
  );
}

export const Input = forwardRef(function Input({ className, ...props }, ref) {
  return <input ref={ref} className={cn(inputClasses, className)} {...props} />;
});

export const Textarea = forwardRef(function Textarea({ className, ...props }, ref) {
  return <textarea ref={ref} className={cn(inputClasses, "h-auto min-h-28 py-2.5 leading-relaxed", className)} {...props} />;
});

export const Select = forwardRef(function Select({ className, children, ...props }, ref) {
  return (
    <select ref={ref} className={cn(inputClasses, "appearance-none bg-no-repeat pe-9 cursor-pointer", className)} style={{
      backgroundImage:
        "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' fill='none' stroke='%237d9195' stroke-width='1.8' viewBox='0 0 24 24'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")",
      backgroundPosition: "right 0.75rem center",
    }} {...props}>
      {children}
    </select>
  );
});

/** Label + control + hint/error wiring with correct aria attributes. */
export function Field({ label, error, hint, optional, optionalText, children, className }) {
  const id = useId();
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;
  const describedBy = [error ? errorId : null, hint ? hintId : null].filter(Boolean).join(" ") || undefined;
  return (
    <div className={className}>
      {label && (
        <Label htmlFor={id} optional={optional} optionalText={optionalText}>
          {label}
        </Label>
      )}
      {children({ id, "aria-invalid": error ? true : undefined, "aria-describedby": describedBy })}
      {error ? <FieldError id={errorId}>{error}</FieldError> : <FieldHint id={hintId}>{hint}</FieldHint>}
    </div>
  );
}
