import { getLocale, getTranslations } from "next-intl/server";
import { ArrowDownLeft, ArrowUpRight, Repeat } from "lucide-react";
import { Link } from "@/lib/i18n/navigation";
import { formatDate, formatMoney, toNumber } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";

/**
 * Direction of a ledger entry from the user's point of view:
 *  in   — money arrived (deposit)
 *  out  — money left the platform (withdrawal paid out)
 *  move — moved between the user's own buckets (holds, positions)
 */
export function entryDirection(type) {
  if (type === "deposit") return "in";
  if (type === "withdrawal_payout") return "out";
  return "move";
}

export function signedAmount(row) {
  const dir = entryDirection(row.type);
  if (dir === "in") return toNumber(row.amount);
  if (dir === "out") return -toNumber(row.amount);
  return toNumber(row.delta_available);
}

export async function TransactionList({ rows, empty }) {
  const t = await getTranslations("dashboard.transactions");
  const locale = await getLocale();
  if (!rows.length) return <p className="px-5 py-10 text-center text-sm text-ink-subtle">{empty}</p>;

  return (
    <ul className="divide-y divide-line">
      {rows.map((r) => {
        const dir = entryDirection(r.type);
        const Icon = dir === "in" ? ArrowDownLeft : dir === "out" ? ArrowUpRight : Repeat;
        const amount = signedAmount(r);
        return (
          <li key={r.id}>
            <Link href={`/dashboard/transactions/${r.id}`} className="flex items-center gap-3 px-5 py-3.5 hover:bg-surface-2/50">
              <span
                className={cn(
                  "grid h-9 w-9 shrink-0 place-items-center rounded-full border",
                  dir === "in" ? "border-gain/25 bg-gain-soft text-gain" : dir === "out" ? "border-loss/25 bg-loss-soft text-loss" : "border-line bg-surface-2 text-ink-muted"
                )}
              >
                <Icon className="h-4 w-4 rtl-flip" aria-hidden="true" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">{t(`types.${r.type}`)}</span>
                <span className="block text-xs text-ink-subtle">{formatDate(r.created_at, { locale, withTime: true })}</span>
              </span>
              <span className={cn("tabular text-sm font-medium", amount > 0 ? "text-gain" : amount < 0 ? "text-ink" : "text-ink-muted")}>
                {amount > 0 ? "+" : amount < 0 ? "−" : ""}
                {formatMoney(Math.abs(amount), { locale })}
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
