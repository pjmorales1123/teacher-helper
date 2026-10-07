// Result screen after a quest or challenge.
import { h } from "../../ui.js";
import { badgeEl } from "../../levels-art/index.js";
import { pips } from "./cards.js";
import { starsEl } from "./items.js";

const BADGE_NAMES = {};

/** Drops a burst of confetti pieces; pure CSS animation, removed when done. */
export function celebrate(count) {
  const layer = h("div", { class: "confetti" });
  for (let i = 0; i < count; i++) {
    layer.append(h("i", { style: `left:${Math.random() * 100}%;animation-delay:${Math.random() * 0.6}s;background:hsl(${Math.random() * 360},85%,60%)` }));
  }
  document.body.append(layer);
  setTimeout(() => layer.remove(), 2600);
}
export function rememberBadges(list) { for (const b of list) BADGE_NAMES[b.id] = b.name; }

export function renderResult(q, r, goHome, replay, playOther) {
  const pct = Math.round((100 * r.score) / r.total);
  const headline = r.leveledUp ? `RANK UP → ${r.levelName}`
    : r.passed ? (q.kind === "challenge" ? "Challenge cleared" : "Quest cleared") : "Not yet. Run it back.";
  if (r.passed) celebrate(r.leveledUp ? 80 : 30);
  const reviewRows = q.items.map((item, i) => {
    const rv = r.review[i];
    return h("div", { class: `review-row ${rv.correct ? "good" : "bad"}` },
      h("div", {}, h("strong", {}, `${i + 1}. `), item.prompt.split("\n")[0]),
      h("div", { class: "small" }, rv.correct ? "✓ " : "✗ ", rv.why));
  });
  return h("div", {},
    h("div", { class: "toolbar" }, h("button", { onclick: goHome }, "← Back to map"), h("h2", {}, q.title)),
    h("div", { class: `card result ${r.passed ? "passed" : "failed"}` },
      h("h2", {}, headline),
      h("div", { class: "row" },
        h("span", { class: "stat" }, `${r.score} / ${r.total}`), h("span", { class: "muted" }, `${pct}%`),
        q.kind === "quest" && starsEl(r.stars), h("span", { class: "xp-chip" }, `+${r.xp} XP`)),
      h("p", { class: "small muted" }, [r.firstPass && "First clear bonus +25. ", r.combo > 0 && `Combo bonus +${r.combo}. `, pct === 100 && "Perfect run."].filter(Boolean).join("")),
      r.skillsUp.length ? h("div", { class: "skills-up" }, ...r.skillsUp.map((s) => h("div", { class: `skill-row ${s.mastered ? "done" : ""}` },
        h("span", { class: "skill-name" }, s.label), pips(s.after, s.need, s.mastered),
        h("span", { class: "small skill-state" }, s.justMastered ? "MASTERED!" : s.mastered ? "✓ mastered" : `${s.before} → ${s.after} of ${s.need}`)))) : null,
      r.allMastered && q.kind === "quest" && !r.leveledUp ? h("p", { class: "small" }, h("strong", {}, "Every skill mastered. "), "The Challenge is open.") : null,
      r.newBadges.length ? h("div", { class: "row new-badges" }, ...r.newBadges.map((b) => h("span", { class: "row" }, badgeEl(b, 40), h("strong", {}, BADGE_NAMES[b] ?? b)))) : null,
      q.kind === "challenge" && !r.passed && h("p", { class: "small" }, "80% ranks you up. Sharpen the skills below, then run the Challenge again."),
      r.practice.length ? h("div", { class: "practice" }, ...r.practice.map((p) => h("div", { class: "row small", style: "margin-top:6px" },
        h("span", {}, `${p.skill.replace("-", " ")} (${p.accuracy}%): try a different story → `),
        ...p.quests.slice(0, 2).map((x) => h("button", { class: "mini", onclick: () => playOther(x.id) }, x.title))))) : null,
      h("div", { class: "row", style: "margin-top:12px" },
        h("button", { class: "primary", onclick: goHome }, r.leveledUp ? "See my new level" : "Back to map"),
        h("button", { onclick: replay }, "Play again"))),
    h("div", { class: "card" }, h("h3", {}, "Review"), ...reviewRows));
}
