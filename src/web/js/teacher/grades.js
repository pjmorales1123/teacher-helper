// Grades tab: per-student term grades and grading presets.
import { get, put } from "../api.js";
import { busy, field, h, toast } from "../ui.js";
import { withSection } from "../section.js";
import { renderReport } from "./report.js";

function cell(term) {
  const g = term.grade;
  const comps = g.components.map((c) => `${c.component} ${c.percentage ?? "–"}%`).join(" · ");
  return h("td", {},
    h("div", { class: g.complete ? "score" : "muted" }, g.complete ? g.transmutedGrade : "incomplete"),
    h("div", { class: "muted small" }, `IG ${g.initialGrade}`),
    h("div", { class: "muted small" }, comps));
}

function presets(settings) {
  const w = h("select", {}, ...settings.weight_presets.map((p) => h("option", { value: p.id, selected: p.id === settings.weight_preset }, p.label)));
  const t = h("select", {}, ...settings.transmutation_presets.map((p) => h("option", { value: p.id, selected: p.id === settings.transmutation_preset }, p.label)));
  const save = h("button", { class: "primary", onclick: () => busy(save, async () => {
    await put("/api/grades/settings", { weight_preset: w.value, transmutation_preset: t.value });
    toast("Presets saved. Grades recomputed.");
    location.reload();
  }) }, "Save presets");
  return h("details", { class: "card" }, h("summary", {}, "Grading presets (DepEd DO 015 s. 2026)"),
    h("div", { class: "grid", style: "margin-top:12px" }, field("Component weights", w), field("Transmutation", t)), save);
}

export async function renderGrades() {
  const root = h("div");
  const back = () => renderGrades().then((n) => root.replaceWith(n));
  const open = (id) => renderReport(id, back).then((n) => root.replaceChildren(n)).catch((e) => toast(e.message, true));
  const [reports, settings] = await Promise.all([get(withSection("/api/grades")), get("/api/grades/settings")]);
  const rows = reports.map((r) => h("tr", {},
    h("td", {}, h("a", { href: "#grades", onclick: (e) => { e.preventDefault(); open(r.studentId); } }, h("strong", {}, r.name)),
      h("div", { class: "muted small" }, `${r.studentId} · ${r.section}`)),
    ...r.terms.map(cell),
    h("td", {}, h("div", { class: "score" }, r.finalGrade ?? "–"))));
  root.append(
    h("div", { class: "toolbar" }, h("h2", {}, "Grades"),
      h("a", { class: "btn right", href: withSection("/api/grades/export.csv"), download: "" }, "Download CSV")),
    h("p", { class: "muted small" }, "Only approved scores on non-formative activities count. IG = initial grade; the big number is the transmuted grade. Click a name for a printable report."),
    presets(settings),
    rows.length
      ? h("div", { class: "card table-wrap" }, h("table", {}, h("thead", {}, h("tr", {},
          ...["Student", "Term 1", "Term 2", "Term 3", "Final"].map((x) => h("th", {}, x)))), h("tbody", {}, ...rows)))
      : h("p", { class: "muted" }, "Add students first."));
  return root;
}
