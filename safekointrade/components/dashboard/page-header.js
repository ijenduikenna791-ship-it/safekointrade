import { cn } from "@/lib/utils/cn";

export function PageHeader({ title, description, actions, className }) {
  return (
    <div className={cn("mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-end sm:justify-between", className)}>
      <div className="min-w-0">
        <h1 className="text-2xl font-semibold tracking-[-0.025em] sm:text-3xl">{title}</h1>
        {description && <p className="mt-1.5 max-w-[65ch] text-ink-muted">{description}</p>}
      </div>
      {actions && <div className="flex w-full flex-wrap gap-2 sm:w-auto sm:justify-end">{actions}</div>}
    </div>
  );
}

/** A single figure with its label — no chart, so it's a tile, not a plot. */
const TINTS = { blue: "#4f8cff", green: "#34d399", cyan: "#22d3ee", purple: "#a78bfa", orange: "#fb923c" };

/**
 * tint (optional): blue | green | cyan | purple | orange — colours the value and
 * icon by meaning inside the dashboards' command theme.
 */
export function StatTile({ label, value, hint, icon: Icon, emphasis = false, tint, className }) {
  const c = tint ? TINTS[tint] : null;
  return (
    <div
      className={cn("ui-card min-w-0 rounded-lg border border-line bg-surface p-3 sm:p-5", c && "ui-card-tint", emphasis && !c && "border-brass-line", className)}
      style={c ? { "--tint": c } : undefined}
    >
      <div className="flex items-center justify-between gap-3">
        <p className="ui-stat-label min-w-0 text-xs text-ink-muted sm:text-sm">{label}</p>
        {Icon &&
          (c ? (
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg" style={{ background: `color-mix(in oklab, ${c} 15%, transparent)`, color: c }} aria-hidden="true">
              <Icon className="h-4 w-4" strokeWidth={1.9} />
            </span>
          ) : (
            <Icon className={cn("h-4 w-4", emphasis ? "text-brass" : "text-ink-subtle")} strokeWidth={1.8} aria-hidden="true" />
          ))}
      </div>
      <p
        className={cn("tabular mt-2 min-w-0 break-words font-display font-semibold tracking-tight sm:mt-3", emphasis ? "text-xl sm:text-3xl" : "text-base sm:text-2xl")}
        style={c && tint !== "blue" ? { color: c } : undefined}
      >
        {value}
      </p>
      {hint && <p className="mt-1.5 text-xs text-ink-subtle">{hint}</p>}
    </div>
  );
}
