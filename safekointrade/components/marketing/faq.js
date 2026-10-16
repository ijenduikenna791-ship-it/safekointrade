"use client";

import { useId, useState } from "react";
import { useTranslations } from "next-intl";
import { AnimatePresence, motion } from "framer-motion";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils/cn";

const keys = ["guaranteed", "demo", "minimum", "deposit", "withdraw", "kyc", "reinvest", "early", "referral", "security"];

function Item({ k, t }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  return (
    <li className="border-b border-line">
      <h3>
        <button
          type="button"
          aria-expanded={open}
          aria-controls={`${id}-panel`}
          id={`${id}-btn`}
          onClick={() => setOpen((o) => !o)}
          className="flex w-full items-center justify-between gap-6 py-5 text-start text-base font-medium sm:text-lg"
        >
          {t(`items.${k}.q`)}
          <Plus
            className={cn("h-5 w-5 shrink-0 text-ink-subtle transition-transform duration-200", open && "rotate-45")}
            aria-hidden="true"
          />
        </button>
      </h3>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            id={`${id}-panel`}
            role="region"
            aria-labelledby={`${id}-btn`}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.25, 1, 0.5, 1] }}
            className="overflow-hidden"
          >
            <p className="max-w-[68ch] pb-6 text-ink-muted">{t(`items.${k}.a`)}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </li>
  );
}

export function Faq() {
  const t = useTranslations("home.faq");
  return (
    <section id="faq" aria-labelledby="faq-title" className="border-t border-line py-16 sm:py-24">
      <div className="container-page grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20">
        <h2 id="faq-title" className="text-3xl font-semibold tracking-[-0.03em] sm:text-4xl">{t("title")}</h2>
        <ul className="border-t border-line">
          {keys.map((k) => <Item key={k} k={k} t={t} />)}
        </ul>
      </div>
    </section>
  );
}
