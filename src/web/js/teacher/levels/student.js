// Per-student LEVELS detail: level override, quest map, skills, attempts, words, badges.
import { get, post, put } from "../../api.js";
import { busy, fmtDate, h, toast } from "../../ui.js";
import { rankEl, strandEl } from "../../levels-art/index.js";
import { slots, stateText } from "../../student/levels/cards.js";
import { heat } from "./index.js";

export async function renderLevelsStudent(id, back) {
  const [d, meta] = await Promise.all([get(`/api/levels/students/${id}`), get("/api/levels/meta")]);
  const reload = () => renderLevelsStudent(id, back).then((n) => root.replaceWith(n));
  const sel = h("select", {}, ...meta.levels.map((l) => h("option", { value: l.level, selected: l.level === d.level }, `${l.level} ${l.name} (≈ ${l.band})`)));
  const setBtn = h("button", { onclick: () => busy(setBtn, async () => {
    await put(`/api/levels/students/${id}/level`, { level: Number(sel.value) });
    toast("Level updated."); reload();
  }) }, "Set level");
  const resetBtn = h("button", { onclick: () => busy(resetBtn, async () => {
    if (!confirm("Reset placement? The student retakes the short test next time.")) return;
    await post(`/api/levels/students/${id}/reset-placement`); toast("Placement reset."); reload();
  }) }, "Reset placement");

  const root = h("div", {},
    h("div", { class: "toolbar no-print" }, h("button", { onclick: back }, "← Back"), h("h2", {}, d.student.name),
      h("span", { class: "muted" }, d.student.section), h("button", { class: "right", onclick: () => print() }, "Print")),
    h("div", { class: "grid", style: "margin-bottom:14px" },
      h("div", { class: "card" }, h("div", { class: "row" }, d.placed ? rankEl(d.level, 44) : null, h("div", { class: "stat" }, d.placed ? d.levelName : "Not placed")), h("div", {}, `≈ ${d.band} reading band`),
        h("div", { class: "row no-print", style: "margin-top:8px" }, sel, setBtn, resetBtn)),
      h("div", { class: "card" }, h("div", { class: "stat" }, d.xp), h("div", {}, "XP"), h("div", { class: "muted small" }, d.streak ? `🔥 ${d.streak}-day streak` : "no active streak")),
      h("div", { class: "card" }, h("div", { class: "stat" }, d.attempts.length), h("div", {}, "attempts"), h("div", { class: "muted small" }, d.lastActive ? `last active ${d.lastActive}` : "never played")),
      h("div", { class: "card" }, h("div", { class: "stat" }, d.words.filter((w) => w.box >= 5).length), h("div", {}, "words mastered"), h("div", { class: "muted small" }, `${d.words.length} in bank · ${d.reviews} reviews`))),
    h("div", { class: "cols-3" },
      h("div", { class: "card table-wrap" }, h("h3", { style: "padding:12px 12px 0" }, `${d.map.name} quest map`),
        h("table", {}, h("thead", {}, h("tr", {}, ...["Quest", "Best", "Tries", "Stars"].map((t) => h("th", {}, t)))),
          h("tbody", {}, ...[...d.map.quests, d.map.challenge].filter(Boolean).map((q) => h("tr", {},
            h("td", {}, q.title, q.unlocked === false ? h("span", { class: "muted small" }, " (locked)") : null),
            h("td", {}, q.tries ? `${q.best}/${q.total}` : "–"), h("td", {}, q.tries),
            h("td", { class: "stars" }, q.passed ? "★".repeat(q.stars || 1) : "")))))),
      h("div", { class: "card" }, h("h3", {}, `${d.map.name} skills: evidence per text`),
        ...d.map.skills.map((s) => h("div", { class: `skill-block ${s.state}` },
          h("div", { class: "skill-row" }, strandEl(s.strand, 16), h("span", { class: "skill-name" }, s.label), slots(s), h("span", { class: "small skill-state" }, stateText(s))),
          h("div", { class: "ev-list" }, ...(s.evidence.length ? s.evidence.map((e) => h("span", { class: `chip ev ${e.passed ? "pass" : "fail"}`, title: `${e.day}${e.noHint ? " · no hint" : " · tip shown"}` },
            `${e.title}: ${e.correct}/${e.total}${e.noHint ? " ·" : ""}`)) : [h("span", { class: "muted small" }, "no evidence yet")])))),
        h("p", { class: "muted small" }, "A dot after a score means the skill was not the passage's tip (no-hint evidence). ",
          d.map.challenge?.unlocked ? "Challenge unlocked." : "Challenge locks until every skill is passed on 3 texts, one without the hint.")),
      h("div", { class: "card table-wrap" }, h("h3", { style: "padding:12px 12px 0" }, "All skills (lowest accuracy first)"),
        d.skills.length ? h("table", {}, h("thead", {}, h("tr", {}, ...["Skill", "Accuracy", "Items"].map((t) => h("th", {}, t)))),
          h("tbody", {}, ...d.skills.map((s) => h("tr", {}, h("td", {}, s.label, h("div", { class: "muted small" }, s.strand)), h("td", {}, heat(s.accuracy, s.total)), h("td", {}, s.total)))))
          : h("p", { class: "muted", style: "padding:12px" }, "No attempts yet."))),
    h("div", { class: "cols-2" },
      h("div", { class: "card table-wrap" }, h("h3", { style: "padding:12px 12px 0" }, "Recent attempts"),
        d.attempts.length ? h("table", {}, h("thead", {}, h("tr", {}, ...["When", "Quest", "Score", ""].map((t) => h("th", {}, t)))),
          h("tbody", {}, ...d.attempts.map((a) => h("tr", {}, h("td", { class: "small" }, fmtDate(a.at)), h("td", {}, a.title, h("div", { class: "muted small" }, `${a.kind} · level ${a.level}`)),
            h("td", {}, `${a.score}/${a.total}`), h("td", {}, h("span", { class: `badge ${a.passed ? "checked" : "missing"}` }, a.passed ? "passed" : "retry"))))))
          : h("p", { class: "muted", style: "padding:12px" }, "Nothing yet.")),
      h("div", { class: "card" }, h("h3", {}, "Word bank"),
        d.words.length ? h("p", { class: "small" }, ...d.words.map((w) => h("span", { class: "chip", style: "margin:0 6px 6px 0", title: `${w.meaning} · box ${w.box}, due ${w.due}` }, `${w.word} ${"·".repeat(w.box)}`)))
          : h("p", { class: "muted" }, "No words yet."),
        h("h3", { style: "margin-top:10px" }, "Grammar Rush"),
        d.grammar.runs ? h("div", {}, h("p", { class: "small" }, `Tier ${d.grammar.tier} reached · ${d.grammar.runs} runs · best: `, d.grammar.tiers.filter((t) => t.best !== null).map((t) => `${t.name} ${t.best}/10`).join(", ")),
          h("div", { class: "small" }, ...d.grammar.topics.map((t) => h("span", { class: "chip", style: "margin:0 6px 6px 0" }, `${t.label} `, heat(t.accuracy, t.total))))) : h("p", { class: "muted" }, "No runs yet."),
        h("h3", { style: "margin-top:10px" }, "Badges"),
        d.badges.length ? h("p", {}, ...d.badges.map((b) => h("span", { class: "badge checked", style: "margin:0 6px 6px 0" }, b.badge))) : h("p", { class: "muted" }, "None yet."))));
  return root;
}
