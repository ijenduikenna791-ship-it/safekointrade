import { getTranslations } from "next-intl/server";
import { Search } from "lucide-react";
import { Link } from "@/lib/i18n/navigation";

/**
 * GET-form filter bar (search, status, sort). Works without JavaScript and
 * keeps filters in the URL so views can be shared between staff.
 */
export async function FilterBar({ pathname, q = "", status = "", statuses = [], statusLabel, sort, sorts = [] }) {
  const t = await getTranslations("admin.common");
  const field = "h-10 rounded-sm border border-line bg-surface px-3 text-sm";
  return (
    <form method="get" className="flex flex-wrap items-end gap-3 border-b border-line px-5 py-4">
      <label className="min-w-0 flex-1 basis-56 text-sm">
        <span className="mb-1.5 block font-medium">{t("search")}</span>
        <span className="relative block">
          <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-subtle" aria-hidden="true" />
          <input type="search" name="q" defaultValue={q} placeholder={t("searchPlaceholder")} maxLength={120} className={`${field} w-full ps-9`} />
        </span>
      </label>
      {statuses.length > 0 && (
        <label className="text-sm">
          <span className="mb-1.5 block font-medium">{t("status")}</span>
          <select name="status" defaultValue={status} className={field}>
            <option value="">{t("allStatuses")}</option>
            {statuses.map((s) => <option key={s} value={s}>{statusLabel ? statusLabel(s) : s}</option>)}
          </select>
        </label>
      )}
      {sorts.length > 0 && (
        <label className="text-sm">
          <span className="mb-1.5 block font-medium">{t("sort")}</span>
          <select name="sort" defaultValue={sort} className={field}>
            {sorts.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </label>
      )}
      <div className="flex gap-2">
        <button type="submit" className="h-10 rounded-md bg-primary px-4 text-sm font-medium text-primary-ink hover:bg-primary-hover">{t("apply")}</button>
        <Link href={pathname} className="inline-flex h-10 items-center rounded-md border border-line px-4 text-sm hover:bg-surface-2">{t("reset")}</Link>
      </div>
    </form>
  );
}

/** Applies the free-text search: emails match the customer, anything else the reference. */

export { applySearch } from "@/lib/database/search";
