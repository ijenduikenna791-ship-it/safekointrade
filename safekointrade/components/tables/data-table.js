import { cn } from "@/lib/utils/cn";

/**
 * Responsive table: a real <table> from md up, stacked cards below.
 * columns: [{ key, header, cell(row) => node, align?: "end", primary?: bool, hideOnMobile?: bool }]
 * Works in Server Components (cells are rendered on the server).
 */
export function DataTable({ columns, rows, rowKey = (r) => r.id, empty, caption, className }) {
  if (!rows?.length) return empty ?? null;
  const primary = columns.find((c) => c.primary) ?? columns[0];
  return (
    <div className={className}>
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full text-sm">
          {caption && <caption className="sr-only">{caption}</caption>}
          <thead>
            <tr className="border-b border-line text-ink-subtle">
              {columns.map((c) => (
                <th key={c.key} scope="col" className={cn("whitespace-nowrap px-4 py-3 font-medium first:ps-5 last:pe-5", c.align === "end" ? "text-end" : "text-start")}>
                  {c.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.map((row) => (
              <tr key={rowKey(row)} className="transition-colors hover:bg-surface-2/50">
                {columns.map((c) => (
                  <td key={c.key} className={cn("px-4 py-3.5 align-middle first:ps-5 last:pe-5", c.align === "end" && "text-end", c.className)}>
                    {c.cell(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="grid gap-3 p-3 md:hidden">
        {rows.map((row) => (
          <li key={rowKey(row)} className="min-w-0 rounded-lg border border-line bg-surface-2/40 p-4">
            <div className="mb-3 min-w-0 border-b border-line pb-3">{primary.cell(row)}</div>
            <dl className="grid min-w-0 grid-cols-2 gap-x-3 gap-y-3 text-sm">
              {columns
                .filter((c) => c !== primary && !c.hideOnMobile)
                .map((c) => (
                  <div key={c.key} className={cn("min-w-0", c.align === "end" && "text-end")}>
                    <dt className="truncate text-xs text-ink-subtle">{c.header}</dt>
                    <dd className="mt-0.5 min-w-0 break-words">{c.cell(row)}</dd>
                  </div>
                ))}
            </dl>
          </li>
        ))}
      </ul>
    </div>
  );
}
