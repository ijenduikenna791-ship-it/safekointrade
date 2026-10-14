"use client";

import { motion } from "framer-motion";
import { Link } from "@/lib/i18n/navigation";
import { cn } from "@/lib/utils/cn";

/** Navigation tabs backed by URLs (bookmarkable, server-rendered content). */
export function LinkTabs({ tabs, active, label, id = "tabs" }) {
  return (
    <nav aria-label={label} className="mb-6 border-b border-line">
      <ul className="-mb-px flex gap-1 overflow-x-auto">
        {tabs.map((tab) => {
          const isActive = tab.key === active;
          return (
            <li key={tab.key}>
              <Link
                href={tab.href}
                scroll={false}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "relative inline-flex h-11 items-center gap-2 whitespace-nowrap px-3 text-sm transition-colors",
                  isActive ? "font-medium text-ink" : "text-ink-muted hover:text-ink"
                )}
              >
                {tab.label}
                {tab.count != null && (
                  <span className="tabular rounded-full bg-surface-2 px-1.5 text-xs text-ink-subtle">{tab.count}</span>
                )}
                {isActive && <motion.span layoutId={`${id}-underline`} className="absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-brass" />}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
