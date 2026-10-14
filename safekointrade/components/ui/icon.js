import { cn } from "@/lib/utils/cn";

const sizes = { xs: 14, sm: 16, md: 18, lg: 20, xl: 24, "2xl": 32 };

/**
 * Consistent icon wrapper. Decorative by default (aria-hidden); pass `label`
 * when the icon is the only content conveying meaning.
 */
export function Icon({ as: Glyph, size = "md", label, className, strokeWidth, ...rest }) {
  if (!Glyph) return null;
  const px = sizes[size] ?? size;
  return (
    <Glyph
      width={px}
      height={px}
      strokeWidth={strokeWidth ?? (px >= 24 ? 1.6 : 1.8)}
      aria-hidden={label ? undefined : true}
      aria-label={label}
      role={label ? "img" : undefined}
      focusable="false"
      className={cn("shrink-0", className)}
      {...rest}
    />
  );
}
