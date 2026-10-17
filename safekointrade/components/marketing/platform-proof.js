import { getLocale, getTranslations } from "next-intl/server";
import { ArrowUpRight, ClipboardList, Layers3, ShieldCheck } from "lucide-react";
import { CryptoCoin } from "@/components/ui/crypto-coin";
import { Link } from "@/lib/i18n/navigation";

export async function PlatformProof({ plans, assets }) {
  const t = await getTranslations("home");
  const locale = await getLocale();
  const count = (value) => new Intl.NumberFormat(locale).format(value);
  const termDays = plans.map((plan) => Number(plan.term_days)).filter(Number.isFinite).sort((a, b) => a - b);
  const facts = [
    { value: termDays.length ? termDays.map(count).join(" · ") : "—", label: t("plans.term"), Icon: Layers3, href: "#plans" },
    { value: count(assets.length), label: t("assets.title"), Icon: Layers3, href: "#assets-title" },
    { title: t("features.items.review.title"), detail: t("features.items.review.body"), Icon: ShieldCheck },
    { title: t("features.items.ledger.title"), detail: t("features.items.ledger.body"), Icon: ClipboardList },
  ];

  return (
    <section aria-label={t("assets.title")} className="relative isolate overflow-hidden border-y border-line bg-surface-2/50 py-14 sm:py-20">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_15%_0%,rgba(151,35,58,0.16),transparent_42%),radial-gradient(ellipse_at_90%_100%,rgba(116,24,43,0.12),transparent_38%)]" />
      <div className="container-page">
        <div className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">
          {facts.map(({ value, label, title, detail, Icon, href }) => (
            <article key={title || label} className="group relative flex min-h-40 flex-col justify-between overflow-hidden rounded-2xl border border-line bg-surface/80 p-5 shadow-[0_14px_40px_rgba(0,0,0,0.16)] transition duration-300 hover:-translate-y-1 hover:border-brass/40 sm:min-h-48 sm:p-7">
              <div className="flex items-center justify-between gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-brass/15 bg-brass/10 text-brass">
                  <Icon className="h-4 w-4" aria-hidden="true" />
                </span>
                {href && <ArrowUpRight className="h-4 w-4 text-ink-subtle transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-brass" aria-hidden="true" />}
              </div>
              {href ? (
                <Link href={href} className="mt-6 block rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brass">
                  <span className="block font-display text-2xl font-semibold tracking-tight text-ink sm:text-4xl">{value}</span>
                  <span className="mt-2 block text-sm leading-5 text-ink-muted">{label}</span>
                </Link>
              ) : (
                <div className="mt-6">
                  <h2 className="text-base font-semibold leading-6 text-ink sm:text-lg">{title}</h2>
                  <p className="mt-2 text-sm leading-6 text-ink-muted">{detail}</p>
                </div>
              )}
            </article>
          ))}
        </div>
        <div className="mt-10 border-t border-line pt-7 sm:mt-12 sm:pt-9">
          <h2 className="text-center text-xs font-semibold uppercase tracking-[0.18em] text-ink-subtle">{t("assets.title")}</h2>
          <ul className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {assets.map((asset) => (
              <li key={asset.symbol} className="flex min-h-14 items-center justify-center gap-2 rounded-xl border border-line/80 bg-surface/50 px-3 text-sm text-ink-muted">
                <CryptoCoin symbol={asset.symbol} className="h-7 w-7 shrink-0" />
                <span className="font-medium text-ink">{asset.symbol}</span>
                <span className="hidden text-ink-subtle sm:inline">{asset.name}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

