import { getLocale, getTranslations } from "next-intl/server";
import { formatDate } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";

/** Message thread; `perspective` decides whose bubbles align to the end. */
export async function TicketThread({ messages, perspective = "user" }) {
  const t = await getTranslations("dashboard.support");
  const locale = await getLocale();
  return (
    <ol className="space-y-4 px-5 py-5">
      {messages.map((m) => {
        const mine = perspective === "user" ? !m.is_staff : m.is_staff;
        return (
          <li key={m.id} className={cn("flex", mine ? "justify-end" : "justify-start")}>
            <div className={cn("max-w-[85%] rounded-lg border px-4 py-3", mine ? "border-brass-line bg-brass-soft/50" : "border-line bg-surface-2")}>
              <p className="text-xs font-medium text-ink-subtle">
                {m.is_staff ? t("staff") : perspective === "user" ? t("you") : m.author_name || t("you")}
                <span className="font-normal"> · {formatDate(m.created_at, { locale, withTime: true })}</span>
              </p>
              <p className="mt-1.5 whitespace-pre-wrap break-words text-sm">{m.body}</p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
