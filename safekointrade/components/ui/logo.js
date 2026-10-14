import { brand } from "@/lib/config/brand";
import { cn } from "@/lib/utils/cn";

/**
 * Brand mark: a shield holding a coin with a rising stroke — "safe" + "koin" + "trade".
 * Colours come from the brand tokens (--brand-teal, --brand-mint). Replace this SVG to rebrand.
 */
export function LogoMark({ className, title }) {
  return (
    <svg viewBox="0 0 40 40" className={cn("h-8 w-8", className)} role={title ? "img" : undefined} aria-hidden={title ? undefined : true}>
      {title && <title>{title}</title>}
      <path d="M20 2.5 L35 8 V19.5 C35 28.5 28.6 34.8 20 37.5 C11.4 34.8 5 28.5 5 19.5 V8 Z" fill="var(--brand-teal)" stroke="var(--brand-mint)" strokeOpacity="0.45" strokeWidth="1" />
      <circle cx="20" cy="20" r="9.5" fill="none" stroke="var(--brand-mint)" strokeWidth="1.6" strokeDasharray="1.4 1.4" />
      <path d="M14 23.5 L18.2 19.3 L21.2 22 L26.5 16" fill="none" stroke="var(--brand-mint)" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** Wordmark splits the name at "Trade" so the last part takes the mint accent. */
export function Logo({ className, showName = true }) {
  const i = brand.name.lastIndexOf("Trade");
  const head = i > 0 ? brand.name.slice(0, i) : brand.name;
  const tail = i > 0 ? brand.name.slice(i) : "";
  return (
    <span className={cn("inline-flex items-center gap-2", className)} dir="ltr">
      <LogoMark />
      {showName && (
        <span className="font-display text-[1.2rem] font-bold tracking-[-0.02em]">
          {head}
          <span className="text-brand-mint-ink">{tail}</span>
        </span>
      )}
    </span>
  );
}
