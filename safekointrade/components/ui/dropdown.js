"use client";

import { useEffect, useId, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils/cn";

/**
 * Accessible menu-button dropdown.
 * Arrow keys move focus, Escape closes and returns focus to the trigger.
 */
export function Dropdown({ trigger, label, items, align = "end", className, menuClassName }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const btnRef = useRef(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;
    const onDown = (e) => {
      if (!rootRef.current?.contains(e.target)) setOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    const t = setTimeout(() => rootRef.current?.querySelector('[role="menuitemradio"][aria-checked="true"],[role^="menuitem"]')?.focus(), 10);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      clearTimeout(t);
    };
  }, [open]);

  const onKeyDown = (e) => {
    const nodes = [...(rootRef.current?.querySelectorAll('[role^="menuitem"]') ?? [])];
    const idx = nodes.indexOf(document.activeElement);
    if (e.key === "Escape") {
      setOpen(false);
      btnRef.current?.focus();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      nodes[(idx + 1) % nodes.length]?.focus();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      nodes[(idx - 1 + nodes.length) % nodes.length]?.focus();
    } else if (e.key === "Home") {
      e.preventDefault();
      nodes[0]?.focus();
    } else if (e.key === "End") {
      e.preventDefault();
      nodes.at(-1)?.focus();
    } else if (e.key === "Tab") {
      setOpen(false);
    }
  };

  return (
    <div ref={rootRef} className={cn("relative", className)} onKeyDown={onKeyDown}>
      <button
        ref={btnRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        aria-label={label}
        onClick={() => setOpen((o) => !o)}
        className="inline-flex h-9 items-center gap-1.5 rounded-md px-2.5 text-sm text-ink-muted transition-colors hover:bg-surface-2 hover:text-ink"
      >
        {trigger}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            id={menuId}
            role="menu"
            aria-label={label}
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.14, ease: "easeOut" }}
            className={cn(
              "absolute top-full z-50 mt-1.5 min-w-44 overflow-hidden rounded-md border border-line bg-surface p-1 shadow-lg",
              align === "end" ? "end-0" : "start-0",
              menuClassName
            )}
          >
            {items.map((item) => (
              <button
                key={item.key}
                type="button"
                role={item.checked !== undefined ? "menuitemradio" : "menuitem"}
                aria-checked={item.checked}
                lang={item.lang}
                onClick={() => {
                  setOpen(false);
                  item.onSelect?.();
                  btnRef.current?.focus();
                }}
                className={cn(
                  "flex w-full items-center gap-2.5 rounded-sm px-2.5 py-2 text-start text-sm text-ink-muted outline-none",
                  "hover:bg-surface-2 hover:text-ink focus-visible:bg-surface-2 focus-visible:text-ink",
                  item.checked && "text-ink"
                )}
              >
                {item.icon}
                <span className="flex-1">{item.label}</span>
                {item.hint && <span className="text-xs text-ink-subtle">{item.hint}</span>}
                {item.checked && <span className="h-1.5 w-1.5 rounded-full bg-brass" aria-hidden="true" />}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
