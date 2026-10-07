// Result screen after a quest or challenge.
import { h } from "../../ui.js";
import { badgeEl } from "../../levels-art/index.js";
import { slots, stateText } from "./cards.js";
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

/** The evidence row as a mastery-like object for the slot renderer (passes after this attempt). */
function evidenceView(e) {
  const passed = Array.from({ length: e.passesAfter }, (_, i) => ({ passed: true, noHint: i === e.passesAfter - 1 ? e.noHint && e.passed : false, title: "", correct: 0, total: 0 }));
  return { evidence: passed, need: e.need, state: e.state, passes: e.passesAfter, noHintPass: passed.some((x) => x.noHint), sharp: false };
}
const failedFocus = (q, r) => q.tip && r.evidence.some((e) => e.focus && !e.passed);

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
      r.practiceRun ? h("p", { class: "small muted" }, "Practice run: you already passed this story today, so it adds no XP or evidence. A fresh text does.") : null,
      r.evidence.length ? h("div", { class: "skills-up" }, ...r.evidence.map((e) => h("div", { class: `skill-row ${e.state}` },
        h("span", { class: "skill-name" }, e.label, h("span", { class: "muted small" }, ` ${e.correct}/${e.total}${e.noHint ? " · no hint" : ""}`)),
        h("span", { class: `small ${e.passed ? "good-text" : "bad-text"}` }, e.passed ? "✓ counts" : "✗ not yet"),
        slots(evidenceView(e)), h("span", { class: "small skill-state" }, e.justMastered ? "MASTERED!" : stateText(evidenceView(e)))))) : null,
      failedFocus(q, r) ? h("div", { class: "card tip reteach" }, h("div", { class: "muted small" }, "Read the strategy again"),
        h("strong", {}, q.tip.title), h("p", { class: "tip-text" }, q.tip.text)) : null,
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
