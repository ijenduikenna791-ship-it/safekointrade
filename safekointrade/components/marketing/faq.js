import { useTranslations } from "next-intl";
import { Plus } from "lucide-react";

const keys = ["eligibility", "assets", "fees", "calculation", "guaranteed", "demo", "minimum", "deposit", "withdraw", "kyc", "reinvest", "early", "referral", "security"];

export function Faq() {
  const t = useTranslations("home.faq");
  return (
    <section id="faq" aria-labelledby="faq-title" className="border-t border-line py-16 sm:py-24">
      <div className="container-page grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20">
        <h2 id="faq-title" className="text-3xl font-semibold tracking-[-0.03em] sm:text-4xl">{t("title")}</h2>
        <ul className="border-t border-line">
          {keys.map((key) => (
            <li key={key} className="border-b border-line">
              <details className="group">
                <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-6 py-4 text-start text-base font-medium hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus sm:text-lg">
                  <span>{t(`items.${key}.q`)}</span>
                  <Plus className="h-5 w-5 shrink-0 text-ink-subtle transition-transform duration-200 group-open:rotate-45 motion-reduce:transition-none" aria-hidden="true" />
                </summary>
                <p className="max-w-[68ch] pb-6 text-base leading-7 text-ink-muted">{t(`items.${key}.a`)}</p>
              </details>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
