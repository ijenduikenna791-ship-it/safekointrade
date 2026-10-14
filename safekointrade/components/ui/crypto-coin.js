import { useId } from "react";
import { cn } from "@/lib/utils/cn";

/**
 * Original, stylised coin illustrations (no third-party artwork).
 * A metallic face with a milled rim and a simple glyph per asset.
 */
const palettes = {
  BTC: { light: "#ffc35a", mid: "#f7931a", dark: "#b8650a", glyph: "#fff7e6" },
  ETH: { light: "#b9c3ff", mid: "#6f7ee8", dark: "#3c46a8", glyph: "#f3f5ff" },
  USDT: { light: "#7ff0c9", mid: "#26a17b", dark: "#126a50", glyph: "#effff9" },
  USDC: { light: "#8cc4ff", mid: "#2775ca", dark: "#174a85", glyph: "#f0f7ff" },
  SOL: { light: "#d7a4ff", mid: "#9945ff", dark: "#4b1e9e", glyph: "#14f195" },
};

function Glyph({ symbol, color }) {
  switch (symbol) {
    case "BTC":
      return (
        <g fill="none" stroke={color} strokeWidth="5.2" strokeLinecap="round" strokeLinejoin="round" transform="rotate(-12 50 50)">
          <path d="M40 30 V70" />
          <path d="M40 30 H54 C62 30 65 35 65 40 C65 45 61 49 54 49 H40" />
          <path d="M40 49 H56 C64 49 67 54 67 59.5 C67 65 63 70 55 70 H40" />
          <path d="M45 24 V30 M53 24 V30 M45 70 V76 M53 70 V76" />
        </g>
      );
    case "ETH":
      return (
        <g fill={color}>
          <path d="M50 20 L69 51 L50 62 L31 51 Z" opacity="0.95" />
          <path d="M50 66 L69 55 L50 81 L31 55 Z" opacity="0.8" />
          <path d="M50 20 L50 62 L31 51 Z" opacity="0.6" fill="#000" />
        </g>
      );
    case "USDT":
      return (
        <g fill="none" stroke={color} strokeWidth="5.5" strokeLinecap="round">
          <path d="M32 31 H68 M50 31 V73" />
          <ellipse cx="50" cy="47" rx="19" ry="5.5" strokeWidth="3.5" />
        </g>
      );
    case "USDC":
      return (
        <g fill="none" stroke={color} strokeLinecap="round">
          <circle cx="50" cy="50" r="23" strokeWidth="3.5" strokeDasharray="30 6" />
          <path d="M57 41 C55 37 52 36 49 36 C44 36 41 39 41 42.5 C41 51 59 47 59 56.5 C59 60.5 55 64 50 64 C46 64 43 62 41.5 58.5 M50 31 V36 M50 64 V69" strokeWidth="4.5" />
        </g>
      );
    case "SOL":
      return (
        <g fill={color}>
          <path d="M36 32 H72 L64 40 H28 Z" />
          <path d="M28 46 H64 L72 54 H36 Z" />
          <path d="M36 60 H72 L64 68 H28 Z" />
        </g>
      );
    default:
      return (
        <text x="50" y="58" textAnchor="middle" fontSize="26" fontWeight="700" fill={color} fontFamily="ui-sans-serif, system-ui">
          {symbol.slice(0, 3)}
        </text>
      );
  }
}

export function CryptoCoin({ symbol = "BTC", className, title }) {
  const id = useId().replace(/:/g, "");
  const p = palettes[symbol] || { light: "#d7dfdc", mid: "#8fa19b", dark: "#4f625c", glyph: "#ffffff" };
  return (
    <svg viewBox="0 0 100 100" className={cn("h-10 w-10", className)} role={title ? "img" : undefined} aria-hidden={title ? undefined : true}>
      {title && <title>{title}</title>}
      <defs>
        <linearGradient id={`${id}-face`} x1="0.15" y1="0.1" x2="0.85" y2="0.95">
          <stop offset="0" stopColor={p.light} />
          <stop offset="0.55" stopColor={p.mid} />
          <stop offset="1" stopColor={p.dark} />
        </linearGradient>
        <linearGradient id={`${id}-rim`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={p.dark} />
          <stop offset="0.5" stopColor={p.light} />
          <stop offset="1" stopColor={p.dark} />
        </linearGradient>
        <radialGradient id={`${id}-shine`} cx="0.32" cy="0.25" r="0.55">
          <stop offset="0" stopColor="#fff" stopOpacity="0.55" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="50" cy="50" r="48" fill={`url(#${id}-rim)`} />
      <circle cx="50" cy="50" r="44.5" fill="none" stroke={p.dark} strokeWidth="2.4" strokeDasharray="2 2.2" opacity="0.7" />
      <circle cx="50" cy="50" r="40" fill={`url(#${id}-face)`} />
      <circle cx="50" cy="50" r="40" fill="none" stroke="#fff" strokeOpacity="0.25" strokeWidth="1" />
      <Glyph symbol={symbol} color={p.glyph} />
      <circle cx="50" cy="50" r="40" fill={`url(#${id}-shine)`} />
    </svg>
  );
}
