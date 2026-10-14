import { getTranslations } from "next-intl/server";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Link } from "@/lib/i18n/navigation";
import { cn } from "@/lib/utils/cn";

/** Link-based pagination: works without JavaScript and keeps other filters. */
export async function Pagination({ pathname, page, pageSize, total, query = {} }) {
  if (!total || total <= pageSize) return null;
  const t = await getTranslations("dashboard.pagination");
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);
  const href = (p) => ({ pathname, query: { ...query, page: String(p) } });
  const btn = "inline-flex h-9 items-center gap-1 rounded-md border border-line bg-surface px-3 text-sm";

  return (
    <nav aria-label={t("label")} className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-5 py-3">
      <p className="tabular text-sm text-ink-subtle">{t("summary", { from, to, total })}</p>
      <div className="flex gap-2">
        {page > 1 ? (
          <Link href={href(page - 1)} className={cn(btn, "hover:bg-surface-2")} aria-label={t("previous")}>
            <ChevronLeft className="h-4 w-4 rtl-flip" aria-hidden="true" />
          </Link>
        ) : (
          <span className={cn(btn, "opacity-50")} aria-hidden="true"><ChevronLeft className="h-4 w-4 rtl-flip" /></span>
        )}
        <span className="tabular inline-flex h-9 items-center px-2 text-sm text-ink-muted">{page} / {pages}</span>
        {page < pages ? (
          <Link href={href(page + 1)} className={cn(btn, "hover:bg-surface-2")} aria-label={t("next")}>
            <ChevronRight className="h-4 w-4 rtl-flip" aria-hidden="true" />
          </Link>
        ) : (
          <span className={cn(btn, "opacity-50")} aria-hidden="true"><ChevronRight className="h-4 w-4 rtl-flip" /></span>
        )}
      </div>
    </nav>
  );
}

export function parsePage(searchParams, pageSize = 15) {
  const raw = Number.parseInt(searchParams?.page, 10);
  const page = Number.isFinite(raw) && raw > 0 && raw < 100000 ? raw : 1;
  return { page, pageSize, from: (page - 1) * pageSize, to: page * pageSize - 1 };
}
