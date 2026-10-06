// LEVELS home: level path, quest map, challenge, word review, badges.
import { get } from "../../api.js";
import { append, h } from "../../ui.js";
import { starsEl } from "./items.js";
import { renderPlacement } from "./placement.js";
import { playQuest } from "./play.js";
import { rememberBadges } from "./result.js";
import { renderReview } from "./review.js";

/** The LEVELS tab: one persistent container whose content is swapped between screens. */
export async function renderLevels() {
  const root = h("div");
  const swap = (p) => Promise.resolve(p).then((n) => root.replaceChildren(n)).catch((e) => root.replaceChildren(h("p", { class: "muted" }, e.message)));
  const home = () => swap(renderHome(swap, home));
  await home();
  return root;
}

async function renderHome(swap, home) {
  const root = h("div");
  const d = await get("/api/student/levels/home");
  rememberBadges(d.badges);
  if (!d.placed) {
    append(root, h("div", { class: "toolbar" }, h("h2", {}, "LEVELS")),
      h("div", { class: "card" }, h("p", {}, "Read. Answer. Earn XP. Rank up. First, a short test so your quests match you, not someone else.")),
      await renderPlacement(home));
    return root;
  }
  const map = d.map;
  const questCard = (q) => h("div", { class: `card quest ${q.passed ? "done" : ""}` },
    h("div", { class: "row" }, h("h3", {}, q.title), h("span", { class: "right" }, starsEl(q.stars))),
    h("div", { class: "muted small" }, q.skill ? d.skills[q.skill]?.label ?? q.skill : "Mixed skills",
      q.tries ? ` · best ${q.best}/${q.total}` : " · new"),
    h("button", { class: q.passed ? "" : "primary", style: "margin-top:8px", onclick: () => swap(playQuest(q.id, home)) }, q.passed ? "Play again" : "Play"));
  const c = map.challenge;
  const challengeCard = c && h("div", { class: `card challenge ${c.passed ? "done" : c.unlocked ? "open" : "locked"}` },
    h("div", { class: "row" }, h("h3", {}, c.passed ? "✓ " : c.unlocked ? "⚔ " : "🔒 ", c.title)),
    h("div", { class: "muted small" }, c.passed ? `Passed · best ${c.best}/${c.total}` : c.unlocked ? "Unlocked. Score 80% to rank up." : "Pass every quest above to unlock."),
    c.unlocked && h("button", { class: "primary", style: "margin-top:8px", onclick: () => swap(playQuest(c.id, home)) }, c.passed ? "Replay challenge" : "Take the challenge"));

  const goalPct = Math.min(100, Math.round((100 * d.todayXp) / d.dailyGoal));
  const board = d.leaderboard.length > 0 && h("div", { class: "card" },
    h("div", { class: "row" }, h("h3", {}, "This week in your section"), h("span", { class: "muted small right" }, "XP earned in the last 7 days")),
    h("table", { class: "board" }, h("tbody", {}, ...d.leaderboard.map((r) => h("tr", { class: r.me ? "me" : "" },
      h("td", { class: "rank" }, r.rank <= 3 ? ["🥇", "🥈", "🥉"][r.rank - 1] : `#${r.rank}`), h("td", {}, r.name, r.me ? " (you)" : ""), h("td", { class: "right-al" }, `${r.xp} XP`))))),
    d.myRank && d.myRank > 10 && h("p", { class: "muted small" }, `You are #${d.myRank} of ${d.boardSize}. Every quest counts toward this week.`));
  append(root,
    h("div", { class: "toolbar" }, h("h2", {}, "LEVELS"),
      h("span", { class: "chip rank" }, `${d.levelName}`),
      h("span", { class: "xp-chip" }, `${d.xp} XP`),
      h("span", { class: `chip ${d.streakAtRisk ? "risk" : ""}` }, `🔥 ${d.streak}-day streak${d.streakAtRisk ? " · play today to keep it" : ""}`),
      h("button", { class: d.dueWords ? "primary right" : "right", onclick: () => swap(renderReview(home)) },
        d.dueWords ? `Word review (${d.dueWords} due)` : "Word review")),
    h("div", { class: "card goal" },
      h("div", { class: "row" }, h("strong", {}, goalPct >= 100 ? "Daily goal done ✓" : "Daily goal"),
        h("span", { class: "muted small right" }, `${d.todayXp} / ${d.dailyGoal} XP today`)),
      h("div", { class: "bar" }, h("div", { class: `fill ${goalPct >= 100 ? "full" : ""}`, style: `width:${goalPct}%` }))),
    h("div", { class: "lv-path" }, ...d.levels.map((l) => h("div", { class: `lv-node ${l.reached ? "reached" : ""} ${l.level === d.level ? "current" : ""}` },
      h("div", { class: "lv-num" }, l.level), h("div", { class: "small" }, l.name)))),
    h("h3", { style: "margin-top:14px" }, `${map.name} quests`),
    map.maxLevel && c?.passed ? h("div", { class: "notice" }, "Legend rank reached. Keep replaying for three stars and keep your streak alive.") : null,
    h("div", { class: "cards" }, ...map.quests.map(questCard), challengeCard),
    board,
    h("h3", { style: "margin-top:18px" }, "Badges"),
    h("div", { class: "badge-grid" }, ...d.badges.map((b) => h("div", { class: `badge-tile ${b.earned ? "earned" : ""}`, title: b.hint },
      h("div", { class: "badge-icon" }, b.earned ? "🏅" : "○"), h("div", { class: "small" }, b.name)))),
    h("p", { class: "muted small", style: "margin-top:10px" }, `${d.wordCount} words in your word bank.`));
  return root;
}
