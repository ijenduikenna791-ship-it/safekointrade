"use client";

import { Bar, BarChart as RBarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

function BarTooltip({ active, payload, label, series, formatY }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-md border border-line bg-surface px-3 py-2 text-sm shadow-md">
      <p className="text-ink-subtle">{label}</p>
      {payload.map((p) => {
        const s = series.find((x) => x.key === p.dataKey);
        return (
          <p key={p.dataKey} className="mt-0.5 flex items-center gap-2">
            <span className="h-2 w-2 rounded-[2px]" style={{ background: s?.color }} aria-hidden="true" />
            <span className="text-ink-muted">{s?.label}</span>
            <span className="tabular ms-auto ps-3 font-semibold text-ink">{formatY(p.value)}</span>
          </p>
        );
      })}
    </div>
  );
}

/**
 * Grouped bar chart. Legend is always shown for >= 2 series; the hidden table
 * makes the values available without relying on colour.
 * series: [{ key, label, color }]
 */
export function BarChart({ data, series, label, height = 260, formatY = (v) => v, categoryHeader = "Period" }) {
  return (
    <figure aria-label={label}>
      {series.length > 1 && (
        <ul className="mb-3 flex flex-wrap gap-4 text-sm text-ink-muted">
          {series.map((s) => (
            <li key={s.key} className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-[3px]" style={{ background: s.color }} aria-hidden="true" />
              {s.label}
            </li>
          ))}
        </ul>
      )}
      <div style={{ height }} aria-hidden="true" dir="ltr">
        <ResponsiveContainer width="100%" height="100%">
          <RBarChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: 0 }} barGap={2} barCategoryGap="28%">
            <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
            <XAxis dataKey="label" tick={{ fill: "var(--ink-subtle)", fontSize: 12 }} axisLine={false} tickLine={false} />
            <YAxis tickFormatter={formatY} tick={{ fill: "var(--ink-subtle)", fontSize: 12 }} axisLine={false} tickLine={false} width={72} />
            <Tooltip cursor={{ fill: "var(--surface-2)" }} content={<BarTooltip series={series} formatY={formatY} />} />
            {series.map((s) => (
              <Bar key={s.key} dataKey={s.key} fill={s.color} radius={[4, 4, 0, 0]} maxBarSize={28} isAnimationActive={false} />
            ))}
          </RBarChart>
        </ResponsiveContainer>
      </div>
      <table className="sr-only">
        <caption>{label}</caption>
        <thead>
          <tr>
            <th scope="col">{categoryHeader}</th>
            {series.map((s) => <th key={s.key} scope="col">{s.label}</th>)}
          </tr>
        </thead>
        <tbody>
          {data.map((d) => (
            <tr key={d.label}>
              <th scope="row">{d.label}</th>
              {series.map((s) => <td key={s.key}>{formatY(d[s.key])}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
