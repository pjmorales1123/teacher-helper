// Grammar Rush: home card (tiers + play) and the end-of-run screen.
import { get } from "../../api.js";
import { h } from "../../ui.js";
import { badgeEl, rankEl } from "../../levels-art/index.js";
import { playRush } from "./grammar-play.js";
import { celebrate } from "./result.js";

export async function rushCard(swap, home) {
  const g = await get("/api/student/levels/grammar");
  const play = (tier) => swap(playRush(tier, (r) => swap(rushEnd(r, swap, home, play)), home));
  const current = [...g.tiers].reverse().find((t) => t.unlocked) ?? g.tiers[0];
  return h("div", { class: "card rush-card" },
    h("div", { class: "row" }, h("h3", {}, "⚡ Grammar Rush"),
      h("span", { class: "muted small right" }, `${g.todayXp} / ${g.dailyCap} rush XP today`)),
    h("p", { class: "small" }, `10 sentences, ${g.hearts} hearts, ${g.seconds} seconds each. Fill the blank. Score 8 to unlock the next tier.`),
    h("div", { class: "rush-tiers" }, ...g.tiers.map((t) => h("button", {
      class: `rush-tier ${t.unlocked ? "open" : "locked"} ${t.cleared ? "cleared" : ""}`, disabled: !t.unlocked, title: t.unlocked ? `Play ${t.name}` : "Clear the tier below",
      onclick: () => play(t.tier) }, rankEl(t.tier, 30, !t.unlocked), h("span", { class: "small" }, t.name), h("span", { class: "small muted" }, t.best === null ? "–" : `best ${t.best}/${t.size}`)))),
    h("div", { class: "row", style: "margin-top:8px" },
      h("button", { class: "primary", onclick: () => play(current.tier) }, `Play ${current.name}`),
      g.weakest.length ? h("span", { class: "muted small" }, "Weak spots: ", g.weakest.map((w) => `${w.label} ${w.accuracy}%`).join(", ")) : null));
}

export function rushEnd(r, swap, home, play) {
  if (r.cleared) celebrate(r.firstClear ? 70 : 30);
  const headline = r.hearts <= 0 ? "Out of hearts." : r.score === r.total ? "PERFECT RUSH" : r.cleared ? "Tier cleared!" : "Close. Run it back.";
  return h("div", {},
    h("div", { class: "toolbar" }, h("button", { onclick: home }, "← Back to map"), h("h2", {}, "⚡ Grammar Rush")),
    h("div", { class: `card result ${r.cleared ? "passed" : "failed"}` },
      h("h2", {}, headline),
      h("div", { class: "row" }, h("span", { class: "stat" }, `${r.score} / ${r.total}`),
        h("span", { class: "hearts" }, "♥".repeat(r.hearts) + "♡".repeat(Math.max(0, 3 - r.hearts))),
        h("span", { class: "xp-chip" }, `+${r.xp} XP`), r.newBest ? h("span", { class: "badge checked" }, "new best") : null),
      h("p", { class: "small muted" }, [r.firstClear && "First clear bonus +30. ", r.capped && `Daily rush XP cap reached (${r.rawXp} earned, ${r.xp} counted). `, r.unlockedNext && "Next tier unlocked!"].filter(Boolean).join("")),
      r.newBadges.length ? h("div", { class: "row new-badges" }, ...r.newBadges.map((b) => h("span", { class: "row" }, badgeEl(b, 40), h("strong", {}, b === "rush-clear" ? "Rush Rookie" : "Perfect Rush")))) : null,
      h("div", { class: "topic-bars" }, ...r.byTopic.map((t) => h("div", { class: "small row" }, h("span", { class: "topic-name" }, t.label), h("span", { class: `heat ${t.accuracy < 60 ? "h0" : t.accuracy < 80 ? "h1" : "h2"}` }, `${t.correct}/${t.total}`)))),
      h("div", { class: "row", style: "margin-top:12px" },
        h("button", { class: "primary", onclick: () => play(r.unlockedNext ? r.tier + 1 : r.tier) }, r.unlockedNext ? "Play next tier" : "Play again"),
        h("button", { onclick: home }, "Back to map"))),
    h("div", { class: "card" }, h("h3", {}, "Review"), ...r.review.map((x, i) => h("div", { class: `review-row ${x.correct ? "good" : "bad"}` },
      h("div", {}, h("strong", {}, `${i + 1}. `), x.sentence.replace("___", `[${x.answer}]`)), h("div", { class: "small" }, x.correct ? "✓ " : "✗ ", x.why)))));
}
