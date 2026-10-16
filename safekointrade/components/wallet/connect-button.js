"use client";

import { useTranslations } from "next-intl";
import { Wallet } from "lucide-react";
import { shortAddress, useWallet } from "./wallet-provider";
import { cn } from "@/lib/utils/cn";

export function ConnectWalletButton({ className }) {
  const t = useTranslations("wallet");
  const w = useWallet();
  if (!w.enabled) return null;
  return (
    <button
      type="button"
      onClick={() => w.open(w.isConnected ? { view: "Account" } : undefined)}
      aria-label={w.isConnected ? t("connectedAs", { address: w.address }) : t("connect")}
      className={cn(
        "inline-flex h-9 items-center gap-2 rounded-lg px-3 text-xs font-semibold transition",
        w.isConnected
          ? "border border-[rgb(52_211_153/0.35)] bg-[rgb(52_211_153/0.08)] font-mono text-[var(--cmd-green)] hover:bg-[rgb(52_211_153/0.14)]"
          : "bg-[linear-gradient(90deg,#3b7bff,#22d3ee)] text-[#03101f] hover:brightness-110",
        className
      )}
    >
      {w.isConnected ? (
        <span className="h-1.5 w-1.5 rounded-full bg-[var(--cmd-green)]" aria-hidden="true" />
      ) : (
        <Wallet className="h-4 w-4" aria-hidden="true" />
      )}
      <span className={cn(!w.isConnected && "hidden sm:inline")}>{w.isConnected ? shortAddress(w.address) : t("connect")}</span>
    </button>
  );
}
