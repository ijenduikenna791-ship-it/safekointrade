import { cn } from "@/lib/utils/cn";

const tones = {
  neutral: "bg-surface-2 text-ink-muted border-line",
  gain: "bg-gain-soft text-gain border-gain/25",
  loss: "bg-loss-soft text-loss border-loss/25",
  warn: "bg-warn-soft text-warn border-warn/25",
  info: "bg-info-soft text-info border-info/25",
  brass: "bg-brass-soft text-brass border-brass-line",
};

export function Badge({ tone = "neutral", className, children }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium leading-5 whitespace-nowrap",
        tones[tone],
        className
      )}
    >
      {children}
    </span>
  );
}

/** Maps workflow statuses to a consistent tone across the whole app. */
export const statusTone = {
  pending: "warn",
  processing: "info",
  approved: "info",
  completed: "gain",
  active: "gain",
  matured: "brass",
  rejected: "loss",
  cancelled: "neutral",
  failed: "loss",
  open: "warn",
  answered: "info",
  closed: "neutral",
  suspended: "loss",
  verified: "gain",
  unverified: "neutral",
  draft: "neutral",
  published: "gain",
};

export function StatusBadge({ status, label }) {
  return (
    <Badge tone={statusTone[status] || "neutral"}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />
      {label || status}
    </Badge>
  );
}
