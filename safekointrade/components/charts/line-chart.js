"use client";

import { useId } from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

function ChartTooltip({ active, payload, label, formatX, formatY }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-md border border-line bg-surface px-3 py-2 text-sm shadow-md">
      <p className="text-ink-subtle">{formatX(label)}</p>
      <p className="tabular mt-0.5 font-semibold text-ink">{formatY(payload[0].value)}</p>
    </div>
  );
}

/**
 * Single-series line chart (2px line, faint area, recessive grid, crosshair tooltip).
 * Includes a visually hidden table so the data is available to screen readers.
 */
export function LineChart({
  data,
  label,
  color = "var(--chart-1)",
  height = 260,
  formatX = (v) => v,
  formatY = (v) => v,
  formatTick,
  formatYTick,
  tableHeaders = ["Date", "Value"],
}) {
  const gid = useId().replace(/:/g, "");
  return (
    <figure aria-label={label}>
      <div style={{ height }} aria-hidden="true" dir="ltr">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id={`fill-${gid}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity={0.18} />
                <stop offset="100%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} stroke="var(--chart-grid)" strokeDasharray="0" />
            <XAxis
              dataKey="x"
              tickFormatter={formatTick || formatX}
              tick={{ fill: "var(--ink-subtle)", fontSize: 12 }}
              axisLine={false}
              tickLine={false}
              minTickGap={32}
            />
            <YAxis
              tickFormatter={formatYTick || formatY}
              tick={{ fill: "var(--ink-subtle)", fontSize: 12 }}
              axisLine={false}
              tickLine={false}
              width={56}
              domain={["auto", "auto"]}
            />
            <Tooltip
              cursor={{ stroke: "var(--line-strong)", strokeWidth: 1 }}
              content={<ChartTooltip formatX={formatX} formatY={formatY} />}
            />
            <Area
              type="monotone"
              dataKey="y"
              stroke={color}
              strokeWidth={2}
              fill={`url(#fill-${gid})`}
              activeDot={{ r: 4, strokeWidth: 2, stroke: "var(--surface)", fill: color }}
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <table className="sr-only">
        <caption>{label}</caption>
        <thead>
          <tr>
            <th scope="col">{tableHeaders[0]}</th>
            <th scope="col">{tableHeaders[1]}</th>
          </tr>
        </thead>
        <tbody>
          {data.map((d) => (
            <tr key={d.x}>
              <td>{formatX(d.x)}</td>
              <td>{formatY(d.y)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
