"use client";

import { ThemeProvider, useTheme } from "next-themes";
import { MotionConfig } from "framer-motion";
import { Toaster } from "sonner";

function ThemedToaster({ dir }) {
  const { resolvedTheme } = useTheme();
  return (
    <Toaster
      theme={resolvedTheme === "dark" ? "dark" : "light"}
      position={dir === "rtl" ? "bottom-left" : "bottom-right"}
      dir={dir}
      closeButton
      toastOptions={{
        classNames: {
          toast: "!rounded-md !border !border-line !bg-surface !text-ink !shadow-md !font-sans",
          description: "!text-ink-muted",
        },
      }}
    />
  );
}

// next-themes renders an inline <script>. The server-rendered copy runs before
// paint; when React re-renders it in the browser (e.g. a not-found page) it can
// never execute, and React 19 warns. Marking the browser copy as a data block
// keeps the server behaviour and silences the warning.
const THEME_SCRIPT_PROPS = { type: typeof window === "undefined" ? "text/javascript" : "application/json" };

export function AppProviders({ children, dir = "ltr" }) {
  return (
    // next-themes injects a blocking script so the stored theme is applied
    // before first paint — no flash of the wrong theme.
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
      storageKey="theme"
      scriptProps={THEME_SCRIPT_PROPS}
    >
      <MotionConfig reducedMotion="user">
        {children}
        <ThemedToaster dir={dir} />
      </MotionConfig>
    </ThemeProvider>
  );
}
