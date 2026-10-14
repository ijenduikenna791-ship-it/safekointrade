import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Scale } from "lucide-react";
import { legalPages, LEGAL_UPDATED } from "@/lib/content/legal";
import { formatDate } from "@/lib/utils/format";
import { Link } from "@/lib/i18n/navigation";
import { routing } from "@/lib/i18n/routing";

const slugs = Object.keys(legalPages);

export function generateStaticParams() {
  return routing.locales.flatMap((locale) => slugs.map((slug) => ({ locale, slug })));
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const page = legalPages[slug];
  return page ? { title: page.title } : {};
}

export default async function LegalPage({ params }) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const page = legalPages[slug];
  if (!page) notFound();
  const t = await getTranslations("legal");
  const tf = await getTranslations("footer");
  const nav = { terms: tf("terms"), privacy: tf("privacy"), risk: tf("risk"), cookies: tf("cookies") };

  return (
    <div className="container-page grid gap-10 py-14 sm:py-20 lg:grid-cols-[14rem_1fr] lg:gap-16">
      <nav aria-label={tf("legal")} className="lg:sticky lg:top-24 lg:self-start">
        <ul className="flex flex-wrap gap-2 lg:flex-col lg:gap-1">
          {slugs.map((s) => (
            <li key={s}>
              <Link
                href={`/legal/${s}`}
                aria-current={s === slug ? "page" : undefined}
                className={
                  "block rounded-md px-3 py-2 text-sm " +
                  (s === slug ? "bg-surface-2 font-medium text-ink" : "text-ink-muted hover:bg-surface-2 hover:text-ink")
                }
              >
                {nav[s]}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      <article lang="en" className="max-w-[70ch]">
        <h1 className="text-4xl font-semibold tracking-[-0.03em]">{page.title}</h1>
        <p className="mt-3 text-sm text-ink-subtle">{t("updated", { date: formatDate(LEGAL_UPDATED, { locale }) })}</p>
        <p className="mt-6 flex items-start gap-2 rounded-md border border-warn/30 bg-warn-soft px-4 py-3 text-sm text-warn">
          <Scale className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          {t("draftNotice")}
        </p>
        <div className="mt-10 space-y-8">
          {page.sections.map(([heading, body]) => (
            <section key={heading}>
              <h2 className="text-xl font-semibold">{heading}</h2>
              <p className="mt-2 leading-relaxed text-ink-muted">{body}</p>
            </section>
          ))}
        </div>
      </article>
    </div>
  );
}
