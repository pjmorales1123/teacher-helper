// Teacher LEVELS tab: class progress (default) and the content manager.
import { get, put } from "../../api.js";
import { append, fmtDate, h } from "../../ui.js";
import { withSection } from "../../section.js";
import { rankEl } from "../../levels-art/index.js";
import { renderContent } from "./content.js";
import { renderGrammarTeacher } from "./grammar.js";
import { renderLevelsStudent } from "./student.js";

export function heat(accuracy, total) {
  const cls = accuracy < 60 ? "h0" : accuracy < 80 ? "h1" : "h2";
  return h("span", { class: `heat ${cls}`, title: `${total} items` }, `${accuracy}%`);
}

function tile(label, value, hint) {
  return h("div", { class: "card" }, h("div", { class: "stat" }, value), h("div", {}, label), hint && h("div", { class: "muted small" }, hint));
}

export async function renderLevelsTeacher() {
  const root = h("div");
  const swap = (p) => Promise.resolve(p).then((n) => root.replaceChildren(n)).catch((e) => root.replaceChildren(h("p", { class: "muted" }, e.message)));
  const home = () => swap(renderProgress(swap, home));
  await home();
  return root;
}

function subnav(active, swap, home) {
  return h("div", { class: "toolbar" }, h("h2", {}, "LEVELS"),
    h("nav", { class: "tabs sub" },
      h("button", { class: active === "progress" ? "active" : "", onclick: home }, "Class progress"),
      h("button", { class: active === "content" ? "active" : "", onclick: () => swap(renderContent(swap, home)) }, "Quests & content"),
      h("button", { class: active === "grammar" ? "active" : "", onclick: () => swap(renderGrammarTeacher(subnav("grammar", swap, home))) }, "Grammar Rush")));
}

async function renderProgress(swap, home) {
  const [o, meta] = await Promise.all([get(withSection("/api/levels/overview")), get("/api/levels/meta")]);
  const root = h("div", {}, subnav("progress", swap, home));
  const board = h("input", { type: "checkbox", checked: meta.leaderboard, onchange: async () => {
    const r = await put("/api/levels/settings", { leaderboard: board.checked }); board.checked = r.leaderboard;
  } });
  const placed = o.students.filter((s) => s.placed).length;
  const levelLine = o.levels.map((l) => `${l.name} ${l.count}`).join(" · ");
  append(root,
    h("div", { class: "grid", style: "margin-bottom:14px" },
      tile("students placed", `${placed} / ${o.students.length}`, "took the placement test"),
      tile("active this week", o.activeThisWeek, "played at least once"),
      tile("levels", o.levels.length ? levelLine : "–", "students per level"),
      tile("items answered", o.skills.reduce((n, s) => n + s.total, 0), "across the class")),
    h("p", { class: "small muted" }, h("label", { class: "row", style: "font-weight:400;display:inline-flex" }, board, " Show the weekly section leaderboard to students (XP this week only; ranks and reading levels are never shown to classmates)")),
    h("div", { class: "cols-2" },
      h("div", { class: "card table-wrap" }, h("h3", { style: "padding:12px 12px 0" }, "Skill heatmap (class)"),
        o.skills.length ? h("table", {}, h("thead", {}, h("tr", {}, ...["Skill", "Strand", "Accuracy", "Items"].map((t) => h("th", {}, t)))),
          h("tbody", {}, ...o.skills.map((s) => h("tr", {}, h("td", {}, s.label), h("td", { class: "muted small" }, s.strand), h("td", {}, heat(s.accuracy, s.total)), h("td", {}, s.total)))))
          : h("p", { class: "muted", style: "padding:12px" }, "No answers yet. Lowest-accuracy skills will appear here first.")),
      h("div", { class: "card table-wrap" }, h("h3", { style: "padding:12px 12px 0" }, "Students"),
        o.students.length ? h("table", {}, h("thead", {}, h("tr", {}, ...["Student", "Rank", "Skills", "Quests", "XP", "Streak", "Weakest", "Last active"].map((t) => h("th", {}, t)))),
          h("tbody", {}, ...o.students.map((s) => h("tr", {},
            h("td", {}, h("a", { href: "#", onclick: (e) => { e.preventDefault(); swap(renderLevelsStudent(s.id, home)); } }, s.name), h("div", { class: "muted small" }, s.section)),
            h("td", {}, h("span", { class: "row nowrap" }, s.placed ? rankEl(s.level, 28) : null, h("span", {}, s.placed ? s.levelName : h("span", { class: "muted" }, "not placed"), h("div", { class: "muted small" }, `≈ ${s.band}`)))),
            h("td", {}, h("span", { class: `heat ${s.mastered === s.skillsTotal ? "h2" : s.mastered ? "h1" : "h0"}` }, `${s.mastered}/${s.skillsTotal}`)),
            h("td", {}, `${s.questsPassed}/${s.questsTotal}`, s.challengePassed ? " ✓" : ""),
            h("td", {}, s.xp), h("td", {}, s.streak ? `🔥 ${s.streak}` : "–"),
            h("td", {}, s.weakest ? [s.weakest.label, " ", heat(s.weakest.accuracy, 0)] : h("span", { class: "muted" }, "–")),
            h("td", { class: "small" }, s.lastActive ? fmtDate(s.lastActive).split(",")[0] : h("span", { class: "muted" }, "never"))))))
          : h("p", { class: "muted", style: "padding:12px" }, "Add students first."))));
  return root;
}
