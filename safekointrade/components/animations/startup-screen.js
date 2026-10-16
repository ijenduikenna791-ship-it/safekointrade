"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { brand } from "@/lib/config/brand";

export const SPLASH_KEY = "mv-splash-seen";

/**
 * Branded startup screen shown once per browser session on the landing page.
 *
 * - Server-rendered visible so there is no flash of the page underneath.
 * - An inline script in the root layout marks returning visitors
 *   (html[data-splash="seen"]) so CSS hides it before first paint.
 * - Waits for fonts (the only init the page needs) with a minimum display
 *   time and a hard cap, so slow networks never block the page.
 * - Pure-CSS fallback hides it after 4s even if JavaScript fails.
 */
const MIN_MS = 1100;
const MAX_MS = 2600;

export function StartupScreen({ loadingLabel = "Loading" }) {
  const reduce = useReducedMotion();
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    let seen = false;
    try {
      seen = sessionStorage.getItem(SPLASH_KEY) === "1";
    } catch {}
    if (seen) {
      // Reading sessionStorage is only possible after mount.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setVisible(false);
      return;
    }
    let cancelled = false;
    const wait = (ms) => new Promise((r) => setTimeout(r, ms));
    const fontsReady = document.fonts?.ready ?? Promise.resolve();
    Promise.race([Promise.all([fontsReady, wait(reduce ? 250 : MIN_MS)]), wait(MAX_MS)])
      .catch(() => {})
      .finally(() => {
        if (cancelled) return;
        try {
          sessionStorage.setItem(SPLASH_KEY, "1");
        } catch {}
        setVisible(false);
      });
    return () => {
      cancelled = true;
    };
  }, [reduce]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          id="startup-screen"
          key="startup"
          className="fixed inset-0 z-[100] grid place-items-center overflow-hidden bg-[#050914] bg-[radial-gradient(circle_at_1px_1px,rgb(116_165_255/0.14)_1px,transparent_0)] bg-[length:28px_28px] text-[#e8eefb]"
          initial={false}
          exit={{ opacity: 0 }}
          transition={{ duration: reduce ? 0.15 : 0.55, ease: [0.25, 1, 0.5, 1] }}
          aria-live="polite"
          aria-busy="true"
        >
          {/* slow ambient light — subtle background motion */}
          {!reduce && (
            <>
              <motion.div
                aria-hidden="true"
                className="pointer-events-none absolute h-[70vmax] w-[70vmax] rounded-full"
                style={{ background: "radial-gradient(circle, rgba(79,140,255,0.22), transparent 60%)" }}
                initial={{ x: "-12%", y: "8%", opacity: 0 }}
                animate={{ x: "10%", y: "-6%", opacity: 1 }}
                transition={{ duration: 3.2, ease: "easeInOut" }}
              />
              <motion.div
                aria-hidden="true"
                className="pointer-events-none absolute h-[55vmax] w-[55vmax] rounded-full"
                style={{ background: "radial-gradient(circle, rgba(167,139,250,0.16), transparent 60%)" }}
                initial={{ x: "14%", y: "12%", opacity: 0 }}
                animate={{ x: "-8%", y: "4%", opacity: 1 }}
                transition={{ duration: 3.2, ease: "easeInOut" }}
              />
            </>
          )}

          <motion.div
            className="relative flex flex-col items-center"
            exit={reduce ? {} : { scale: 0.96, y: -8 }}
            transition={{ duration: 0.5, ease: [0.25, 1, 0.5, 1] }}
          >
            <svg viewBox="0 0 40 40" className="h-20 w-20 drop-shadow-[0_0_24px_rgba(79,140,255,0.55)]" aria-hidden="true">
              <defs>
                <linearGradient id="splash-fill" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#4f8cff" />
                  <stop offset="100%" stopColor="#a78bfa" />
                </linearGradient>
              </defs>
              <motion.circle
                cx="20" cy="20" r="18.5" fill="none" stroke="#74a5ff" strokeWidth="1.2"
                initial={reduce ? false : { pathLength: 0, rotate: -90 }}
                animate={{ pathLength: 1, rotate: 0 }}
                transition={{ duration: 0.9, ease: [0.65, 0, 0.35, 1] }}
                style={{ originX: "50%", originY: "50%" }}
              />
              <motion.circle
                cx="20" cy="20" r="14.5" fill="url(#splash-fill)"
                initial={reduce ? false : { scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.35, duration: 0.5, ease: [0.34, 1.4, 0.64, 1] }}
                style={{ originX: "50%", originY: "50%" }}
              />
              <motion.path
                d="M11.5 25.5 L17 19 L21 22.5 L28.5 13.5" fill="none" stroke="#ffffff" strokeWidth="2.6"
                strokeLinecap="round" strokeLinejoin="round"
                initial={reduce ? false : { pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ delay: 0.7, duration: 0.5, ease: "easeOut" }}
              />
            </svg>

            <motion.p
              className="mt-6 font-display text-2xl font-semibold tracking-tight"
              initial={reduce ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.55, duration: 0.5 }}
            >
              {brand.name.replace(/Trade$/, "")}
              <span className="bg-[linear-gradient(90deg,#4f8cff,#a78bfa)] bg-clip-text text-transparent">{brand.name.endsWith("Trade") ? "Trade" : ""}</span>
            </motion.p>

            <div className="mt-8 h-0.5 w-44 overflow-hidden rounded-full bg-white/10" role="progressbar" aria-label={loadingLabel}>
              <motion.div
                className="h-full w-1/3 rounded-full bg-[linear-gradient(90deg,#4f8cff,#22d3ee)]"
                initial={{ x: "-100%" }}
                animate={{ x: "300%" }}
                transition={{ duration: 1.1, repeat: Infinity, ease: "easeInOut" }}
              />
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
