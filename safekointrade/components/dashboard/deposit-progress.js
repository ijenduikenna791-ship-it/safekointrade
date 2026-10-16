import { getLocale, getTranslations } from "next-intl/server";
import { Check, Clock } from "lucide-react";
import { formatDate, formatMoney } from "@/lib/utils/format";

function StepIcon({ state, index }) {
  if (state === "done") {
    return (
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-400">
        <Check className="h-4 w-4" aria-hidden="true" />
      </span>
    );
  }
  if (state === "current") {
    return (
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-amber-500/15 text-amber-400">
        <Clock className="h-4 w-4" aria-hidden="true" />
      </span>
    );
  }
  return (
    <span
      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-medium text-ink-subtle ${
        state === "optional" ? "border-dashed border-line" : "border-line"
      }`}
    >
      {index + 1}
    </span>
  );
}

export async function DepositProgress({ deposit }) {
  const t = await getTranslations("dashboard.deposits.progress");
  const locale = await getLocale();

  const steps = deposit
    ? [
        { key: "submitted", state: "done", title: t("submitted"), detail: formatDate(deposit.created_at, { locale, withTime: true }) },
        {
          key: "txHash",
          state: deposit.tx_reference ? "done" : "optional",
          title: t("txHash"),
          detail: deposit.tx_reference || t("txHashMissing"),
          mono: Boolean(deposit.tx_reference),
        },
        {
          key: "receipt",
          state: deposit.receipt_path ? "done" : "optional",
          title: t("receipt"),
          detail: deposit.receipt_path ? t("receiptDone") : t("receiptMissing"),
        },
        { key: "review", state: "current", title: t("review"), detail: t("reviewDetail") },
        { key: "credited", state: "todo", title: t("credited"), detail: t("creditedDetail") },
      ]
    : [
        { key: "send", state: "todo", title: t("howSend"), detail: t("howSendDetail") },
        { key: "submit", state: "todo", title: t("howSubmit"), detail: t("howSubmitDetail") },
        { key: "verify", state: "todo", title: t("howVerify"), detail: t("howVerifyDetail") },
        { key: "credit", state: "todo", title: t("howCredit"), detail: t("howCreditDetail") },
      ];

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-base font-semibold">
          {deposit ? t("trackingTitle", { reference: deposit.reference }) : t("howTitle")}
        </h2>
        {deposit && (
          <p className="text-sm text-ink-muted">
            {formatMoney(deposit.amount, { locale })} · {deposit.asset_symbol}
            {deposit.network ? ` (${deposit.network})` : ""}
          </p>
        )}
      </div>

      <ol className="relative space-y-5">
        {steps.map((s, i) => (
          <li key={s.key} className="relative flex gap-3">
            {i < steps.length - 1 && (
              <span className="absolute left-3.5 top-8 h-[calc(100%-0.5rem)] w-px bg-line" aria-hidden="true" />
            )}
            <StepIcon state={s.state} index={i} />
            <div className="min-w-0 pt-0.5">
              <p className={`text-sm font-medium ${s.state === "todo" && deposit ? "text-ink-subtle" : ""}`}>{s.title}</p>
              <p className={`text-xs text-ink-muted ${s.mono ? "break-all font-mono" : ""}`}>{s.detail}</p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}