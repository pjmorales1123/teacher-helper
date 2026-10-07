// Home-screen cards for LEVELS: hero with rank + next up, skills to master, rank path, badges.
import { h } from "../../ui.js";
import { badgeEl, rankEl, strandEl } from "../../levels-art/index.js";

/** Three text slots per skill; a filled slot is a passed passage, tagged when it was passed without the hint. */
export function slots(m) {
  const passed = m.evidence.filter((e) => e.passed);
  const cells = Array.from({ length: Math.max(m.need, passed.length) }, (_, i) => {
    const e = passed[i];
    const cls = e ? `on${e.noHint ? " nohint" : ""}${i >= m.need ? " extra" : ""}` : i === m.need - 1 && !m.noHintPass ? "want-nohint" : "";
    return h("i", { class: cls, title: e ? `${e.title}: ${e.correct}/${e.total}${e.noHint ? " · no hint" : ""}` : i === m.need - 1 ? "one text must be passed without the hint" : "" });
  });
  return h("span", { class: `slots ${m.state}` }, ...cells);
}
export const stateText = (m) => m.state === "mastered" ? (m.sharp ? "★ sharp" : "✓ mastered") : m.state === "shaky" ? "shaky · 1 more" : `${m.passes}/${m.need} texts`;

export function heroCard(d, play) {
  const n = d.map.nextUp;
  const strand = n?.skill ? d.skills[n.skill]?.strand : "comprehension";
  const open = d.map.skills.some((s) => !s.mastered);
  const idle = open ? "Nothing new to play today. Come back tomorrow for a fresh text, or train on any story below."
    : d.map.maxLevel ? "Legend rank, every skill mastered. Train more for sharp stars." : "Every skill mastered.";
  return h("div", { class: "card hero" },
    h("div", { class: "hero-rank" }, rankEl(d.level, 72),
      h("div", {}, h("div", { class: "hero-name" }, d.levelName), h("div", { class: "hero-sub" }, `${d.xp} XP`))),
    h("div", { class: "next-up" },
      h("div", { class: "muted small" }, "NEXT UP"),
      n ? h("div", { class: "row" }, strandEl(strand, 20), h("strong", {}, n.title)) : h("div", { class: "small" }, idle),
      n && h("div", { class: "small" }, n.reason),
      n && h("button", { class: "primary", onclick: () => play(n.questId) }, n.skill === null ? "Take the Challenge" : "Play")));
}

export function skillsCard(map, skillsMeta) {
  const done = map.skills.filter((s) => s.mastered).length;
  return h("div", { class: "card" },
    h("div", { class: "row" }, h("h3", {}, "Skills to master"), h("span", { class: "muted small right" }, `${done} / ${map.skills.length}`)),
    ...map.skills.map((s) => h("div", { class: `skill-row ${s.state}` },
      strandEl(skillsMeta[s.skill]?.strand ?? "comprehension", 18), h("span", { class: "skill-name" }, s.label),
      slots(s), h("span", { class: "small skill-state" }, stateText(s)))),
    h("p", { class: "muted small", style: "margin:8px 0 0" },
      done === map.skills.length ? "All skills locked in. The Challenge is open. Keep training for sharp stars."
        : `Pass a skill on ${map.skills[0]?.need ?? 3} different texts, one of them without the hint, to master it. Master all ${map.skills.length} to unlock the Challenge.`));
}

export function rankPath(levels, current) {
  return h("div", { class: "lv-path" }, ...levels.map((l) => h("div", { class: `lv-node ${l.reached ? "reached" : ""} ${l.level === current ? "current" : ""}` },
    rankEl(l.level, 40, !l.reached), h("div", { class: "small" }, l.name))));
}

export function badgeGrid(badges) {
  return h("div", { class: "badge-grid" }, ...badges.map((b) => h("div", { class: `badge-tile ${b.earned ? "earned" : ""}`, title: b.hint },
    badgeEl(b.id, 44, !b.earned), h("div", { class: "small" }, b.name))));
}
