import type { ElementKey } from "@/lib/game/balance";

type Palette = { c1: string; c2: string; ink: string };

const PALETTES: Record<string, Palette> = {
  azure: { c1: "#3b82c4", c2: "#1a365d", ink: "#dbeafe" },
  earth: { c1: "#a1743b", c2: "#4a3820", ink: "#fde9c8" },
  violet: { c1: "#8b5cf6", c2: "#322659", ink: "#ede9fe" },
  rainbow: { c1: "#22d3ee", c2: "#7c3aed", ink: "#f0fdfa" },
  gold: { c1: "#e2b04a", c2: "#7b5804", ink: "#fff7dc" },
  crimson: { c1: "#e0524d", c2: "#6a0f0f", ink: "#ffe4e1" },
};

const ELEMENT_CHAR: Record<ElementKey, string> = {
  KIM: "金",
  MOC: "木",
  THUY: "水",
  HOA: "火",
  THO: "土",
};

// Viền theo độ hiếm.
const RARITY_STROKE: Record<number, string> = {
  1: "#8a94a6",
  2: "#4aa3ff",
  3: "#e2b04a",
};

export function TechniqueCover({
  coverKey,
  rarity,
  element,
  locked = false,
  className,
}: {
  coverKey: string;
  rarity: number;
  element: ElementKey | null;
  locked?: boolean;
  className?: string;
}) {
  const p = PALETTES[coverKey] ?? PALETTES.azure;
  const border = RARITY_STROKE[rarity] ?? RARITY_STROKE[1];
  const rune = element ? ELEMENT_CHAR[element] : "道";
  const gid = `g-${coverKey}-${rarity}`;

  return (
    <svg
      viewBox="0 0 100 140"
      className={className}
      style={{ display: "block", width: "100%", height: "auto", filter: locked ? "grayscale(1) brightness(0.6)" : undefined }}
    >
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0.4" y2="1">
          <stop offset="0%" stopColor={p.c1} />
          <stop offset="100%" stopColor={p.c2} />
        </linearGradient>
        {coverKey === "rainbow" && (
          <linearGradient id={`${gid}-r`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#f87171" />
            <stop offset="35%" stopColor="#fbbf24" />
            <stop offset="65%" stopColor="#34d399" />
            <stop offset="100%" stopColor="#818cf8" />
          </linearGradient>
        )}
      </defs>

      {/* bìa sách */}
      <rect
        x="6"
        y="4"
        width="88"
        height="132"
        rx="7"
        fill={coverKey === "rainbow" ? `url(#${gid}-r)` : `url(#${gid})`}
      />
      {/* gáy sách */}
      <rect x="6" y="4" width="9" height="132" rx="4" fill="rgba(0,0,0,0.28)" />
      {/* viền độ hiếm */}
      <rect
        x="6"
        y="4"
        width="88"
        height="132"
        rx="7"
        fill="none"
        stroke={border}
        strokeWidth="2.5"
      />
      <rect
        x="12"
        y="10"
        width="76"
        height="120"
        rx="4"
        fill="none"
        stroke={p.ink}
        strokeOpacity="0.35"
        strokeWidth="1"
      />

      {/* băng trang trí trên */}
      <line x1="24" y1="26" x2="82" y2="26" stroke={p.ink} strokeOpacity="0.5" strokeWidth="2" />
      <line x1="30" y1="32" x2="76" y2="32" stroke={p.ink} strokeOpacity="0.3" strokeWidth="1.5" />

      {/* huy hiệu ngũ hành */}
      <circle cx="50" cy="74" r="24" fill="rgba(0,0,0,0.22)" stroke={p.ink} strokeOpacity="0.55" strokeWidth="1.5" />
      <text
        x="50"
        y="74"
        textAnchor="middle"
        dominantBaseline="central"
        fontSize="30"
        fontWeight="700"
        fill={p.ink}
        style={{ fontFamily: "serif" }}
      >
        {rune}
      </text>

      {/* băng trang trí dưới */}
      <line x1="30" y1="112" x2="76" y2="112" stroke={p.ink} strokeOpacity="0.3" strokeWidth="1.5" />
      <line x1="24" y1="118" x2="82" y2="118" stroke={p.ink} strokeOpacity="0.5" strokeWidth="2" />

      {locked && (
        <text x="50" y="74" textAnchor="middle" dominantBaseline="central" fontSize="26">
          🔒
        </text>
      )}
    </svg>
  );
}
