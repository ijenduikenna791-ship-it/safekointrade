"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { ArrowDownToLine, ArrowUpFromLine, Inbox, Search } from "lucide-react";
import { formatDate, formatMoney } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";

const STATUS_TONE = {
  pending: "text-[var(--cmd-orange)] border-[rgb(251_146_60/0.35)] bg-[rgb(251_146_60/0.08)]",
  processing: "text-[var(--cmd-cyan)] border-[rgb(34_211_238/0.35)] bg-[rgb(34_211_238/0.08)]",
  approved: "text-[var(--cmd-blue)] border-[rgb(79_140_255/0.35)] bg-[rgb(79_140_255/0.08)]",
  completed: "text-[var(--cmd-green)] border-[rgb(52_211_153/0.35)] bg-[rgb(52_211_153/0.08)]",
  rejected: "text-loss border-[rgb(248_113_113/0.35)] bg-[rgb(248_113_113/0.08)]",
  cancelled: "text-ink-subtle border-line bg-transparent",
};

/**
 * Deposit + withdrawal requests with their live status.
 * rows: { id, kind: "deposit"|"withdrawal", reference, amount, asset, method, status, created_at }
 */
export function RequestHistory({ rows }) {
  const t = useTranslations("dashboard.cmd.history");
  const tt = useTranslations("dashboard.table");
  const ts = useTranslations("common.status");
  const tm = useTranslations("dashboard.deposits.methods");
  const locale = useLocale();
  const [q, setQ] = useState("");

  const methodLabel = (r) => (r.kind === "deposit" ? tm(r.method) : r.method);
  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return rows;
    return rows.filter((r) =>
      [r.reference, r.asset, r.status, ts(r.status), t(r.kind), methodLabel(r)].some((v) => String(v || "").toLowerCase().includes(s))
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, rows]);

  return (
    <section aria-labelledby="history-title" className="glass overflow-hidden">
      <div className="flex flex-wrap items-end justify-between gap-4 p-5 sm:p-6">
        <div>
          <h2 id="history-title" className="font-display text-lg font-semibold">{t("title")}</h2>
          <p className="mt-1 text-sm text-ink-muted">{t("body")}</p>
        </div>
        <label className="relative w-full sm:w-72">
          <span className="sr-only">{t("search")}</span>
          <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-subtle" aria-hidden="true" />
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t("search")}
            className="h-10 w-full rounded-lg border border-line bg-[rgb(5_9_20/0.6)] pe-3 ps-9 text-sm text-ink placeholder:text-ink-subtle focus:border-[var(--cmd-blue)] focus:outline-none"
          />
        </label>
      </div>

      {rows.length === 0 ? (
        <div className="flex flex-col items-center gap-3 border-t border-line px-6 py-14 text-center">
          <span className="grid h-12 w-12 place-items-center rounded-xl border border-line text-ink-subtle" aria-hidden="true">
            <Inbox className="h-5 w-5" />
          </span>
          <p className="text-sm text-ink-muted">{t("empty")}</p>
        </div>
      ) : (
        <div className="overflow-x-auto border-t border-line">
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="text-start">
                {[tt("reference"), tt("type"), tt("amount"), tt("asset"), t("method"), tt("status"), tt("date")].map((h) => (
                  <th key={h} scope="col" className="mono-label px-5 py-3 text-start font-normal">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {filtered.map((r) => {
                const Icon = r.kind === "deposit" ? ArrowDownToLine : ArrowUpFromLine;
                return (
                  <tr key={`${r.kind}-${r.id}`} className="hover:bg-[rgb(79_140_255/0.04)]">
                    <td className="whitespace-nowrap px-5 py-3.5 font-mono text-xs text-ink">{r.reference}</td>
                    <td className="whitespace-nowrap px-5 py-3.5">
                      <span className={cn("inline-flex items-center gap-1.5", r.kind === "deposit" ? "text-[var(--cmd-cyan)]" : "text-ink")}>
                        <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                        {t(r.kind)}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-5 py-3.5 font-semibold tabular-nums">{formatMoney(r.amount, { locale })}</td>
                    <td className="whitespace-nowrap px-5 py-3.5 font-mono text-xs">{r.asset}</td>
                    <td className="whitespace-nowrap px-5 py-3.5 text-ink-muted">{methodLabel(r)}</td>
                    <td className="whitespace-nowrap px-5 py-3.5">
                      <span className={cn("rounded-full border px-2.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider", STATUS_TONE[r.status] || STATUS_TONE.cancelled)}>
                        {ts(r.status)}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-5 py-3.5 text-ink-muted">{formatDate(r.created_at, { locale, withTime: true })}</td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-5 py-10 text-center text-sm text-ink-subtle">{t("noMatch")}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
