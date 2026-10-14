"use client";

import { SPLASH_KEY } from "./startup-screen";

// Marks returning visitors before first paint so the startup screen never flashes.
const code = `try{if(sessionStorage.getItem("${SPLASH_KEY}")==="1")document.documentElement.dataset.splash="seen"}catch(e){}`;

/**
 * Inline script that runs from the server-rendered HTML (before paint).
 * If React ever renders it in the browser it couldn't execute anyway, so it is
 * typed as a data block there — that keeps React 19 from warning about it.
 */
export function SplashScript() {
  return (
    <script
      suppressHydrationWarning
      type={typeof window === "undefined" ? "text/javascript" : "application/json"}
      dangerouslySetInnerHTML={{ __html: code }}
    />
  );
}
