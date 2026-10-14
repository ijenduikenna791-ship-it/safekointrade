import { getLocale, getTranslations } from "next-intl/server";
import { FlaskConical } from "lucide-react";
import { formatMoney } from "@/lib/utils/format";

// Clearly labelled sample figures — this panel illustrates the layout only.
const sample = { available: 1250, invested: 4200, pending: 500 };
const positions = [
  { plan: "Growth", amount: 4200, progress: 0.52 },
  { plan: "Starter", amount: 600, progress: 1 },
];

export async function DashboardPreview() {
  const t = await getTranslations("home.analytics");
  const tc = await getTranslations("common");
  const td = await getTranslations("dashboard.overview");
  const locale = await getLocale();

  return (
    <aside className="flex flex-col rounded-lg border border-line bg-surface p-5 shadow-sm sm:p-6" aria-labelledby="preview-title">
      <div className="flex items-start justify-between gap-3">
        <h3 id="preview-title" className="text-lg font-semibold">{t("dashboardTitle")}</h3>
        <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-brass-line bg-brass-soft px-2 py-0.5 text-xs font-medium text-brass">
          <FlaskConical className="h-3 w-3" aria-hidden="true" />
          {tc("sampleData")}
        </span>
      </div>
      <p className="mt-1.5 text-sm text-ink-muted">{t("dashboardBody")}</p>
      <dl className="mt-5 grid grid-cols-3 gap-px overflow-hidden rounded-md border border-line bg-line">
        {[
          ["available", td("available")],
          ["invested", td("invested")],
          ["pending", td("pending")],
        ].map(([k, label]) => (
          <div key={k} className="bg-surface px-3 py-3">
            <dt className="truncate text-xs text-ink-subtle">{label}</dt>
            <dd className="tabular mt-1 text-sm font-semibold sm:text-base">{formatMoney(sample[k], { locale })}</dd>
          </div>
        ))}
      </dl>
      <ul className="mt-5 space-y-3">
        {positions.map((p) => (
          <li key={p.plan} className="rounded-md border border-line px-3 py-3">
            <div className="flex items-baseline justify-between text-sm">
              <span className="font-medium">{p.plan}</span>
              <span className="tabular text-ink-muted">{formatMoney(p.amount, { locale })}</span>
            </div>
            <div className="mt-2 h-1 overflow-hidden rounded-full bg-surface-3" aria-hidden="true">
              <div className={"h-full rounded-full " + (p.progress >= 1 ? "bg-gain" : "bg-brass")} style={{ width: `${p.progress * 100}%` }} />
            </div>
          </li>
        ))}
      </ul>
    </aside>
  );
}
