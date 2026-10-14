import { getTranslations } from "next-intl/server";
import { Alert } from "@/components/ui/feedback";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export async function AuthHeading({ title, subtitle }) {
  const tc = await getTranslations("common");
  return (
    <div className="mb-8">
      <h1 className="text-3xl font-semibold tracking-[-0.03em]">{title}</h1>
      {subtitle && <p className="mt-2 text-ink-muted">{subtitle}</p>}
      {!isSupabaseConfigured() && (
        <Alert tone="warn" title={tc("notConfiguredTitle")} className="mt-6">
          {tc("notConfigured")}
        </Alert>
      )}
    </div>
  );
}
