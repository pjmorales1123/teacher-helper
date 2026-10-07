// Turns the SVG strings into DOM nodes for the UI helpers.
import { h } from "../ui.js";
import { badgeSvg, strandSvg } from "./badges.js";
import { logoSvg, rankSvg } from "./ranks.js";

export const rankEl = (level, size, locked) => h("span", { class: "art", html: rankSvg(level, size, locked) });
export const badgeEl = (id, size, locked) => h("span", { class: "art", html: badgeSvg(id, size, locked) });
export const strandEl = (strand, size) => h("span", { class: "art", html: strandSvg(strand, size) });
export const logoEl = (size) => h("span", { class: "art", html: logoSvg(size) });
export { badgeSvg, logoSvg, rankSvg, strandSvg };
