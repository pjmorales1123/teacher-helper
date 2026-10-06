// Result screen after a quest or challenge.
import { h } from "../../ui.js";
import { starsEl } from "./items.js";

const BADGE_NAMES = {};
export function rememberBadges(list) { for (const b of list) BADGE_NAMES[b.id] = b.name; }

export function renderResult(q, r, goHome, replay) {
  const pct = Math.round((100 * r.score) / r.total);
  const headline = r.leveledUp ? `Level up! Welcome to ${r.levelName}.`
    : r.passed ? (q.kind === "challenge" ? "Challenge passed!" : "Quest complete!") : "Not yet. Try again!";
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
      r.firstPass && h("p", { class: "small muted" }, "First clear bonus included."),
      r.newBadges.length ? h("p", {}, "New badge: ", ...r.newBadges.map((b) => h("span", { class: "badge checked", style: "margin-right:6px" }, BADGE_NAMES[b] ?? b))) : null,
      q.kind === "challenge" && !r.passed && h("p", { class: "small" }, "You need 80% to level up. Replay a quest or two, then try the Challenge again."),
      r.practice.length ? h("div", { class: "practice" }, h("strong", {}, "Practise these: "),
        ...r.practice.map((p) => h("div", { class: "small" }, `${p.skill.replace("-", " ")} (${p.accuracy}%) → `,
          p.quests.map((x) => x.title).join(", ") || "any quest"))) : null,
      h("div", { class: "row", style: "margin-top:12px" },
        h("button", { class: "primary", onclick: goHome }, r.leveledUp ? "See my new level" : "Back to map"),
        h("button", { onclick: replay }, "Play again"))),
    h("div", { class: "card" }, h("h3", {}, "Review"), ...reviewRows));
}
