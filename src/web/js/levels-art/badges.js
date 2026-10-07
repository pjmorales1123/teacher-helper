// Badge medals and strand icons as inline SVG markup.
import { rankSvg } from "./ranks.js";

const MEDAL = `<defs><linearGradient id="md" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fde68a"/><stop offset="1" stop-color="#d97706"/></linearGradient></defs>
<path d="M22 2 H42 L38 22 H26 Z" fill="#dc2626"/><path d="M22 2 H42 L38 22 H26 Z" fill="#991b1b" opacity=".5" transform="translate(0 2)"/>
<circle cx="32" cy="38" r="22" fill="url(#md)" stroke="#92400e" stroke-width="2.5"/><circle cx="32" cy="38" r="16.5" fill="none" stroke="#fff" stroke-width="1.5" opacity=".5"/>`;
const GLYPH = {
  "first-quest": `<path d="M25 26 V52" stroke="#7c2d12" stroke-width="3" stroke-linecap="round"/><path d="M25 27 H41 L37 33 L41 39 H25 Z" fill="#7c2d12"/>`,
  "perfect-quest": `<path d="M32 24 L34.7 31.7 L43 32 L36.4 37 L38.6 45 L32 40.5 L25.4 45 L27.6 37 L21 32 L29.3 31.7 Z" fill="#7c2d12"/>`,
  "streak-3": flame("3"),
  "streak-7": flame("7"),
  "reviewer-10": `<path d="M20 28 H30 a3 3 0 0 1 3 3 V50 a2 2 0 0 0-2-2 H20 Z M44 28 H34 a3 3 0 0 0-3 3 V50 a2 2 0 0 1 2-2 H44 Z" fill="#7c2d12"/><path d="M23 33 H29 M23 38 H29 M35 33 H41 M35 38 H41" stroke="#fde68a" stroke-width="1.6" stroke-linecap="round"/>`,
  "word-keeper": `<circle cx="27" cy="34" r="6" fill="none" stroke="#7c2d12" stroke-width="3.5"/><path d="M31.5 37.5 L44 50 M40 46 L43 43 M37 43 L40 40" stroke="#7c2d12" stroke-width="3.5" stroke-linecap="round"/>`,
  "flawless-challenge": `<path d="M24 29 H40 L46 36 L32 52 L18 36 Z" fill="#7c2d12"/><path d="M24 29 L32 36 L40 29 M18 36 H46 M32 36 V52" stroke="#fde68a" stroke-width="1.4" fill="none"/>`,
};
function flame(n) {
  return `<path d="M32 22 C33 29 41 31 41 40 C41 46 37 50 32 50 C27 50 23 46 23 40 C23 34 28 32 28 26 C29.5 29 31 30 32 22 Z" fill="#dc2626"/>
<text x="32" y="46" text-anchor="middle" font-family="system-ui, sans-serif" font-size="11" font-weight="800" fill="#fff">${n}</text>`;
}

/** Medal for a badge id; level-N badges reuse the rank shield. */
export function badgeSvg(id, size = 44, locked = false) {
  const m = /^level-(\d)$/.exec(id);
  if (m) return rankSvg(Number(m[1]), size, locked);
  return `<svg class="emblem${locked ? " locked" : ""}" width="${size}" height="${size}" viewBox="0 0 64 64" aria-hidden="true">${MEDAL}${GLYPH[id] ?? GLYPH["first-quest"]}</svg>`;
}

const STRAND = {
  vocabulary: `<path d="M4 5 H20 a1 1 0 0 1 1 1 V15 a1 1 0 0 1-1 1 H11 L7 20 V16 H4 a1 1 0 0 1-1-1 V6 a1 1 0 0 1 1-1 Z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><text x="12" y="13.5" text-anchor="middle" font-family="system-ui, sans-serif" font-size="8.5" font-weight="700" fill="currentColor">Aa</text>`,
  comprehension: `<path d="M3 5 H9.5 a2.5 2.5 0 0 1 2.5 2.5 V20 a2 2 0 0 0-2-2 H3 Z M21 5 H14.5 a2.5 2.5 0 0 0-2.5 2.5 V20 a2 2 0 0 1 2-2 H21 Z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M6 9 H9 M6 12 H9 M15 9 H18 M15 12 H18" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>`,
  analysis: `<circle cx="10" cy="10" r="6.5" fill="none" stroke="currentColor" stroke-width="2"/><path d="M15 15 L21 21" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/><path d="M7 10 H13 M10 7 V13" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>`,
};
export function strandSvg(strand, size = 16) {
  return `<svg class="strand-ico ${strand}" width="${size}" height="${size}" viewBox="0 0 24 24" aria-hidden="true">${STRAND[strand] ?? STRAND.comprehension}</svg>`;
}
