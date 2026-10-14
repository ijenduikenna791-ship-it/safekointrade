import { cn } from "@/lib/utils/cn";

export function PageHeader({ title, description, actions, className }) {
  return (
    <div className={cn("mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between", className)}>
      <div className="min-w-0">
        <h1 className="text-2xl font-semibold tracking-[-0.025em] sm:text-3xl">{title}</h1>
        {description && <p className="mt-1.5 max-w-[65ch] text-ink-muted">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

/** A single figure with its label — no chart, so it's a tile, not a plot. */
export function StatTile({ label, value, hint, icon: Icon, emphasis = false, className }) {
  return (
    <div className={cn("min-w-0 rounded-lg border border-line bg-surface p-4 sm:p-5", emphasis && "border-brass-line", className)}>
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-ink-muted">{label}</p>
        {Icon && <Icon className={cn("h-4 w-4", emphasis ? "text-brass" : "text-ink-subtle")} strokeWidth={1.8} aria-hidden="true" />}
      </div>
      <p className={cn("mt-2 truncate font-display font-semibold tracking-tight sm:mt-3", emphasis ? "text-2xl sm:text-3xl" : "text-lg sm:text-2xl")}>{value}</p>
      {hint && <p className="mt-1.5 text-xs text-ink-subtle">{hint}</p>}
    </div>
  );
}
