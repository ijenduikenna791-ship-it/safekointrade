"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { CircleAlert } from "lucide-react";
import { Button, buttonClasses } from "@/components/ui/button";
import { Link } from "@/lib/i18n/navigation";

export default function Error({ error, reset }) {
  const t = useTranslations("common");
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main id="main" className="grid min-h-[70dvh] place-items-center px-6 py-16">
      <div className="max-w-md text-center">
        <span className="mx-auto grid h-12 w-12 place-items-center rounded-full border border-loss/30 bg-loss-soft text-loss">
          <CircleAlert className="h-5 w-5" aria-hidden="true" />
        </span>
        <h1 className="mt-6 text-2xl font-semibold">{t("errorTitle")}</h1>
        <p className="mt-2 text-ink-muted">{t("errorBody")}</p>
        {error?.digest && <p className="mt-3 text-xs text-ink-subtle">Ref: {error.digest}</p>}
        <div className="mt-8 flex justify-center gap-3">
          <Button onClick={() => reset()}>{t("retry")}</Button>
          <Link href="/" className={buttonClasses({ variant: "secondary" })}>{t("goHome")}</Link>
        </div>
      </div>
    </main>
  );
}
