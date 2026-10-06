// The teacher's chosen section, remembered per browser. "" means all.
const KEY = "th_section";

export function currentSection() {
  try { return localStorage.getItem(KEY) || ""; } catch { return ""; }
}

export function setSection(value) {
  try { localStorage.setItem(KEY, value); } catch { /* private mode */ }
}

/** Append ?section= to an API path when a section is selected. */
export function withSection(path) {
  const s = currentSection();
  return s ? `${path}${path.includes("?") ? "&" : "?"}section=${encodeURIComponent(s)}` : path;
}
