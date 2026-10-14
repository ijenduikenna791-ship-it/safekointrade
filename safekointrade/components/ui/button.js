import { cn } from "@/lib/utils/cn";
import { Loader2 } from "lucide-react";

const base =
  "inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium select-none " +
  "transition-[background-color,border-color,color,box-shadow,transform] duration-150 ease-out " +
  "active:translate-y-px disabled:pointer-events-none disabled:opacity-55 " +
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus";

const variants = {
  primary: "bg-primary text-primary-ink hover:bg-primary-hover shadow-sm",
  secondary: "bg-surface text-ink border border-line hover:border-line-strong hover:bg-surface-2",
  ghost: "text-ink-muted hover:text-ink hover:bg-surface-2",
  brass: "bg-brass-soft text-brass border border-brass-line hover:border-brass",
  danger: "bg-loss text-white hover:opacity-90",
  "danger-outline": "border border-loss/40 text-loss hover:bg-loss-soft",
  success: "bg-gain text-white hover:opacity-90",
  // Public-site CTAs
  orange: "bg-brand-orange text-white font-semibold hover:bg-brand-orange-hover shadow-sm",
  mint: "bg-brand-mint text-brand-teal font-semibold hover:bg-brand-mint-hover shadow-sm",
  teal: "bg-brand-teal text-white font-semibold hover:bg-brand-teal-hover shadow-sm dark:ring-1 dark:ring-brand-mint/35",
  link: "text-brass underline-offset-4 hover:underline px-0 h-auto",
};

const sizes = {
  sm: "h-8 px-3 text-sm rounded-sm",
  md: "h-10 px-4 text-sm rounded-md",
  lg: "h-12 px-6 text-base rounded-md",
  icon: "h-10 w-10 rounded-md",
  "icon-sm": "h-8 w-8 rounded-sm",
};

export function buttonClasses({ variant = "primary", size = "md", className } = {}) {
  return cn(base, variants[variant], variant === "link" ? "" : sizes[size], className);
}

export function Button({ variant, size, className, loading = false, disabled, children, type = "button", ...props }) {
  return (
    <button
      type={type}
      className={buttonClasses({ variant, size, className })}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
      {children}
    </button>
  );
}
