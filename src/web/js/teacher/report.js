// Printable per-student report: term grades, every activity, effort claims.
import { get } from "../api.js";
import { badge, fmtDate, h } from "../ui.js";

function termCard(t) {
  const g = t.grade;
  return h("div", { class: "card" },
    h("div", { class: "row" }, h("h3", {}, `Term ${t.term}`),
      h("span", { class: g.complete ? "score right" : "muted right" }, g.complete ? g.transmutedGrade : "incomplete")),
    h("table", {}, h("tbody", {}, ...g.components.map((c) => h("tr", {},
      h("td", {}, c.component), h("td", {}, `${c.raw} / ${c.highestPossible}`),
      h("td", {}, c.percentage === null ? "–" : `${c.percentage}%`), h("td", { class: "muted small" }, `× ${c.weight}%`))))),
    h("p", { class: "muted small", style: "margin-top:6px" }, `Initial grade ${g.initialGrade}`));
}

export async function renderReport(studentId, onBack) {
  const r = await get(`/api/grades/${encodeURIComponent(studentId)}/report`);
  const s = r.grades;
  const missing = r.activities.filter((a) => a.status === "missing" && !a.formative);
  return h("div", { class: "report" },
    h("div", { class: "toolbar no-print" }, h("button", { onclick: onBack }, "← Back to grades"),
      h("button", { class: "primary right", onclick: () => window.print() }, "Print / Save PDF")),
    h("div", { class: "toolbar" }, h("div", {}, h("h2", {}, s.name),
      h("div", { class: "muted small" }, `${s.studentId} · ${s.section || "no section"} · generated ${fmtDate(r.generated_at)}`)),
      h("div", { class: "right" }, h("div", { class: "muted small" }, "Final grade"), h("div", { class: "stat" }, s.finalGrade ?? "–"))),
    h("div", { class: "cards" }, ...s.terms.map(termCard)),
    h("h3", { style: "margin-top:20px" }, `Activities (${missing.length} missing)`),
    h("div", { class: "card table-wrap" }, h("table", {}, h("thead", {}, h("tr", {},
      ...["Activity", "Term", "Status", "Score", "Feedback"].map((x) => h("th", {}, x)))),
      h("tbody", {}, ...r.activities.map((a) => h("tr", {},
        h("td", {}, a.title, a.formative ? h("span", { class: "muted small" }, " · formative") : null),
        h("td", {}, `${a.component} · T${a.term}`), h("td", {}, badge(a.status)),
        h("td", {}, a.score === null ? "–" : `${a.score} / ${a.max_score}`),
        h("td", { class: "small" }, a.feedback ?? "")))))),
    r.claims.length ? h("h3", { style: "margin-top:20px" }, "Effort claims") : null,
    r.claims.length ? h("div", { class: "card table-wrap" }, h("table", {}, h("tbody", {}, ...r.claims.map((c) => h("tr", {},
      h("td", {}, c.activity_title), h("td", {}, badge(c.status)),
      h("td", {}, c.status === "approved" ? `+${c.points}` : ""), h("td", { class: "small" }, c.note)))))) : null,
  );
}
