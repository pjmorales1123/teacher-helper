// Rank emblems: six shields, each with its own palette and glyph. Returns inline SVG markup.
const SHIELD = "M32 4 L54 12 V30 C54 44 44 54 32 60 C20 54 10 44 10 30 V12 Z";
const SHINE = "M32 8 L50 14.5 V30 C50 41 42 50 32 55 Z";

const STAR = "M32 19 L35.5 28.2 L45.3 28.7 L37.7 34.9 L40.2 44.3 L32 39 L23.8 44.3 L26.3 34.9 L18.7 28.7 L28.5 28.2 Z";
const GLYPHS = {
  sword: `<path d="M32 12 L35.5 16.5 V36 H28.5 V16.5 Z" fill="#fff"/><rect x="21" y="36" width="22" height="4.5" rx="2" fill="#fff"/><rect x="29.5" y="40.5" width="5" height="9" rx="1.5" fill="#fff" opacity=".85"/><circle cx="32" cy="51.5" r="2.6" fill="#fff"/>`,
  chevrons: `<path d="M19 31 L32 18 L45 31" fill="none" stroke="#fff" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M19 44 L32 31 L45 44" fill="none" stroke="#fff" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round" opacity=".75"/>`,
  star: `<path d="${STAR}" fill="#fff"/>`,
  crown: `<path d="M18 43 V25 L26 32 L32 19 L38 32 L46 25 V43 Z" fill="#fff"/><rect x="18" y="44" width="28" height="5" rx="1.5" fill="#fff" opacity=".8"/><circle cx="32" cy="38" r="2.2" fill="#15803d"/>`,
  flame: `<path d="M32 13 C33 22 44 25 44 37 C44 44.5 38.8 50 32 50 C25.2 50 20 44.5 20 37 C20 30 27 27 27 19 C28.5 23 30.5 24 32 13 Z" fill="#fff"/><path d="M32 30 C33 35 38 36.5 38 41 C38 45 35.3 47.5 32 47.5 C28.7 47.5 26 45 26 41 C26 36.5 31 35 32 30 Z" fill="#7c3aed"/>`,
  legend: `<path d="${STAR}" fill="#fde68a" stroke="#fff" stroke-width="1.5" stroke-linejoin="round"/><circle cx="17" cy="20" r="1.8" fill="#fde68a"/><circle cx="47" cy="20" r="1.8" fill="#fde68a"/><circle cx="32" cy="52" r="1.8" fill="#fde68a"/>`,
};

export const RANK_ART = {
  1: { top: "#d98b5a", bottom: "#7c3f1a", stroke: "#5a2c10", glyph: "sword" },
  2: { top: "#dde3ea", bottom: "#7b8794", stroke: "#4b5563", glyph: "chevrons" },
  3: { top: "#fde68a", bottom: "#d97706", stroke: "#92400e", glyph: "star" },
  4: { top: "#86efac", bottom: "#15803d", stroke: "#14532d", glyph: "crown" },
  5: { top: "#c4b5fd", bottom: "#6d28d9", stroke: "#4c1d95", glyph: "flame" },
  6: { top: "#fb7185", bottom: "#9f1239", stroke: "#fbbf24", glyph: "legend" },
};

/** SVG markup for a rank shield. `locked` greys it out. */
export function rankSvg(level, size = 48, locked = false) {
  const a = RANK_ART[level] ?? RANK_ART[1];
  const id = `rk${level}`;
  return `<svg class="emblem${locked ? " locked" : ""}" width="${size}" height="${size}" viewBox="0 0 64 64" aria-hidden="true">
<defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${a.top}"/><stop offset="1" stop-color="${a.bottom}"/></linearGradient></defs>
<path d="${SHIELD}" fill="url(#${id})" stroke="${a.stroke}" stroke-width="2.5" stroke-linejoin="round"/>
<path d="${SHINE}" fill="#fff" opacity=".14"/>${GLYPHS[a.glyph]}</svg>`;
}

/** The LEVELS mark: three rising bars and an arrow. */
export function logoSvg(size = 28) {
  return `<svg width="${size}" height="${size}" viewBox="0 0 32 32" aria-hidden="true">
<rect x="3" y="20" width="6" height="9" rx="1.5" fill="#1f6feb"/><rect x="12" y="13" width="6" height="16" rx="1.5" fill="#1f6feb"/><rect x="21" y="6" width="6" height="23" rx="1.5" fill="#1f6feb"/>
<path d="M4 11 L13 6 L22 1" fill="none" stroke="#f59e0b" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M17 1 H22 V6" fill="none" stroke="#f59e0b" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
}
