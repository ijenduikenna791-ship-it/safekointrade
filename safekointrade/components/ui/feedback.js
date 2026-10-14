import { cn } from "@/lib/utils/cn";
import { Icon } from "./icon";
import { icons } from "@/lib/config/icons";

export function Skeleton({ className }) {
  return <div className={cn("animate-pulse rounded-sm bg-surface-3", className)} aria-hidden="true" />;
}

export function Spinner({ className, label = "Loading" }) {
  return (
    <span role="status" className={cn("inline-flex items-center", className)}>
      <Icon as={icons.status.loading} className="animate-spin text-ink-subtle" />
      <span className="sr-only">{label}</span>
    </span>
  );
}

export function EmptyState({ icon = icons.notify.inbox, title, description, action, className }) {
  return (
    <div className={cn("flex flex-col items-center px-6 py-12 text-center", className)}>
      <span className="mb-4 grid h-12 w-12 place-items-center rounded-full border border-line bg-surface-2 text-ink-muted">
        <Icon as={icon} size="lg" />
      </span>
      <h3 className="text-base font-semibold">{title}</h3>
      {description && <p className="mt-1 max-w-sm text-sm text-ink-muted">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

const alertTones = {
  info: { cls: "border-info/30 bg-info-soft text-info", icon: icons.status.info },
  warn: { cls: "border-warn/30 bg-warn-soft text-warn", icon: icons.status.warning },
  error: { cls: "border-loss/30 bg-loss-soft text-loss", icon: icons.status.error },
  success: { cls: "border-gain/30 bg-gain-soft text-gain", icon: icons.status.success },
  simulation: { cls: "border-brass-line bg-brass-soft text-brass", icon: icons.status.simulation },
};

export function Alert({ tone = "info", title, children, className }) {
  const t = alertTones[tone];
  return (
    <div role={tone === "error" ? "alert" : "status"} className={cn("flex gap-3 rounded-md border px-4 py-3 text-sm", t.cls, className)}>
      <Icon as={t.icon} className="mt-0.5" />
      <div className="min-w-0">
        {title && <p className="font-semibold">{title}</p>}
        {children && <div className={cn(title && "mt-0.5", "text-ink-muted")}>{children}</div>}
      </div>
    </div>
  );
}
