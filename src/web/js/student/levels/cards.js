// Home-screen cards for LEVELS: hero with rank + next up, skills to master, rank path, badges.
import { h } from "../../ui.js";
import { badgeEl, rankEl, strandEl } from "../../levels-art/index.js";

/** Five pips showing correct answers in the mastery window. */
export function pips(correct, need, mastered) {
  return h("span", { class: `pips ${mastered ? "done" : ""}`, title: `${correct} of ${need} recent answers right` },
    ...Array.from({ length: need }, (_, i) => h("i", { class: i < correct ? "on" : "" })));
}

export function heroCard(d, play) {
  const n = d.map.nextUp;
  const strand = n?.skill ? d.skills[n.skill]?.strand : "comprehension";
  return h("div", { class: "card hero" },
    h("div", { class: "hero-rank" }, rankEl(d.level, 72),
      h("div", {}, h("div", { class: "hero-name" }, d.levelName), h("div", { class: "hero-sub" }, `${d.xp} XP`))),
    n ? h("div", { class: "next-up" },
      h("div", { class: "muted small" }, "NEXT UP"),
      h("div", { class: "row" }, strandEl(strand, 20), h("strong", {}, n.title)),
      h("div", { class: "small" }, n.reason),
      h("button", { class: "primary", onclick: () => play(n.questId) }, n.skill === null && n.questId === d.map.challenge?.id ? "Take the Challenge" : "Play")) : null);
}

export function skillsCard(map, skillsMeta) {
  const done = map.skills.filter((s) => s.mastered).length;
  return h("div", { class: "card" },
    h("div", { class: "row" }, h("h3", {}, "Skills to master"), h("span", { class: "muted small right" }, `${done} / ${map.skills.length}`)),
    ...map.skills.map((s) => h("div", { class: `skill-row ${s.mastered ? "done" : ""}` },
      strandEl(skillsMeta[s.skill]?.strand ?? "comprehension", 18), h("span", { class: "skill-name" }, s.label),
      pips(s.correct, s.need, s.mastered), h("span", { class: "small skill-state" }, s.mastered ? "✓ mastered" : `${s.correct}/${s.need}`))),
    h("p", { class: "muted small", style: "margin:8px 0 0" },
      done === map.skills.length ? "All skills locked in. The Challenge is open." : `Get ${map.skills[0]?.need ?? 5} of your last ${map.skills[0]?.need + 1 || 6} answers right on a skill to master it. Master all ${map.skills.length} to unlock the Challenge.`));
}

export function rankPath(levels, current) {
  return h("div", { class: "lv-path" }, ...levels.map((l) => h("div", { class: `lv-node ${l.reached ? "reached" : ""} ${l.level === current ? "current" : ""}` },
    rankEl(l.level, 40, !l.reached), h("div", { class: "small" }, l.name))));
}

export function badgeGrid(badges) {
  return h("div", { class: "badge-grid" }, ...badges.map((b) => h("div", { class: `badge-tile ${b.earned ? "earned" : ""}`, title: b.hint },
    badgeEl(b.id, 44, !b.earned), h("div", { class: "small" }, b.name))));
}
