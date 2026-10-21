import { getTranslations } from "next-intl/server";
import { Search } from "lucide-react";
import { Link } from "@/lib/i18n/navigation";

/**
 * GET-form filter bar (search, status, sort). Works without JavaScript and
 * keeps filters in the URL so views can be shared between staff.
 */
export async function FilterBar({ pathname, q = "", status = "", statuses = [], statusLabel, sort, sorts = [] }) {
  const t = await getTranslations("admin.common");
  const field = "h-11 w-full rounded-sm border border-line bg-surface px-3 text-base sm:h-10 sm:text-sm lg:w-auto";
  return (
    <form method="get" className="grid grid-cols-1 gap-3 border-b border-line px-4 py-4 sm:grid-cols-2 sm:px-5 lg:flex lg:items-end">
      <label className="min-w-0 text-sm sm:col-span-2 lg:flex-1 lg:basis-56">
        <span className="mb-1.5 block font-medium">{t("search")}</span>
        <span className="relative block">
          <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-subtle" aria-hidden="true" />
          <input type="search" name="q" defaultValue={q} placeholder={t("searchPlaceholder")} maxLength={120} className={`${field} w-full ps-9`} />
        </span>
      </label>
      {statuses.length > 0 && (
        <label className="min-w-0 text-sm">
          <span className="mb-1.5 block font-medium">{t("status")}</span>
          <select name="status" defaultValue={status} className={field}>
            <option value="">{t("allStatuses")}</option>
            {statuses.map((s) => <option key={s} value={s}>{statusLabel ? statusLabel(s) : s}</option>)}
          </select>
        </label>
      )}
      {sorts.length > 0 && (
        <label className="min-w-0 text-sm">
          <span className="mb-1.5 block font-medium">{t("sort")}</span>
          <select name="sort" defaultValue={sort} className={field}>
            {sorts.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </label>
      )}
      <div className="flex gap-2 sm:col-span-2 lg:col-span-1">
        <button type="submit" className="h-11 flex-1 rounded-md bg-primary px-4 text-sm font-medium text-primary-ink hover:bg-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus sm:h-10 lg:flex-none">{t("apply")}</button>
        <Link href={pathname} className="inline-flex h-11 flex-1 items-center justify-center rounded-md border border-line px-4 text-sm hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus sm:h-10 lg:flex-none">{t("reset")}</Link>
      </div>
    </form>
  );
}

/** Applies the free-text search: emails match the customer, anything else the reference. */

export { applySearch } from "@/lib/database/search";
