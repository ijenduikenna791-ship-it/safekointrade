"use client";

import { useEffect, useRef } from "react";

/**
 * Night-sky starfield: small points that twinkle slowly (decorative).
 * Pauses off-screen / in hidden tabs; draws a single still frame for reduced motion.
 */
export function Starfield({ className = "", density = 0.00028 }) {
  const ref = useRef(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let stars = [];
    let w = 0;
    let h = 0;
    let frame = 0;
    let visible = true;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const rect = canvas.getBoundingClientRect();
      w = rect.width;
      h = rect.height;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const count = Math.min(420, Math.round(w * h * density));
      stars = Array.from({ length: count }, () => {
        const big = Math.random() < 0.08;
        return {
          x: Math.random() * w,
          y: Math.random() * h,
          r: big ? Math.random() * 1.2 + 1.3 : Math.random() * 0.8 + 0.3,
          base: big ? 0.85 : Math.random() * 0.5 + 0.25,
          speed: Math.random() * 0.0015 + 0.0004,
          phase: Math.random() * Math.PI * 2,
          tint: Math.random() < 0.15 ? "#9ff5d0" : "#ffffff",
        };
      });
    };

    const draw = (time = 0) => {
      ctx.clearRect(0, 0, w, h);
      for (const s of stars) {
        const twinkle = reduce ? 1 : 0.55 + 0.45 * Math.sin(time * s.speed + s.phase);
        ctx.globalAlpha = s.base * twinkle;
        ctx.fillStyle = s.tint;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    };

    const loop = (time) => {
      draw(time);
      frame = visible && !document.hidden ? requestAnimationFrame(loop) : 0;
    };
    const start = () => {
      if (!reduce && !frame && visible && !document.hidden) frame = requestAnimationFrame(loop);
    };

    resize();
    draw();
    start();

    const ro = new ResizeObserver(() => {
      resize();
      draw();
    });
    ro.observe(canvas);
    const io = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      start();
    });
    io.observe(canvas);
    const onVisibility = () => start();
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      cancelAnimationFrame(frame);
      ro.disconnect();
      io.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [density]);

  return <canvas ref={ref} aria-hidden="true" className={"pointer-events-none " + className} />;
}
