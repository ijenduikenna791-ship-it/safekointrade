"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { RefreshCw } from "lucide-react";
import { useRouter } from "@/lib/i18n/navigation";
import { processMaturitiesAction } from "@/lib/actions/admin";
import { Button } from "@/components/ui/button";

export function useActionToast() {
  const te = useTranslations("errors");
  return (res) => {
    if (res?.ok) return true;
    toast.error(te.has(res?.error) ? te(res.error) : te("generic"));
    return false;
  };
}

export function ProcessMaturitiesButton() {
  const t = useTranslations("admin.overview");
  const router = useRouter();
  const check = useActionToast();
  const [busy, setBusy] = useState(false);
  return (
    <Button
      variant="secondary"
      size="sm"
      loading={busy}
      onClick={async () => {
        setBusy(true);
        const res = await processMaturitiesAction().catch(() => ({ ok: false, error: "network" }));
        setBusy(false);
        if (!check(res)) return;
        toast.success(t("processed", { count: res.data.count }));
        router.refresh();
      }}
    >
      {!busy && <RefreshCw className="h-4 w-4" aria-hidden="true" />}
      {t("processMaturities")}
    </Button>
  );
}
