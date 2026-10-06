// Grades tab: per-student term grades and grading presets.
import { get, put } from "../api.js";
import { busy, field, h, toast } from "../ui.js";

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
  const [reports, settings] = await Promise.all([get("/api/grades"), get("/api/grades/settings")]);
  const rows = reports.map((r) => h("tr", {},
    h("td", {}, h("strong", {}, r.name), h("div", { class: "muted small" }, `${r.studentId} · ${r.section}`)),
    ...r.terms.map(cell),
    h("td", {}, h("div", { class: "score" }, r.finalGrade ?? "–"))));
  return h("div", {},
    h("h2", {}, "Grades"),
    h("p", { class: "muted small" }, "Only approved scores on non-formative activities count. IG = initial grade; the big number is the transmuted grade."),
    presets(settings),
    rows.length
      ? h("div", { class: "card table-wrap" }, h("table", {}, h("thead", {}, h("tr", {},
          ...["Student", "Term 1", "Term 2", "Term 3", "Final"].map((x) => h("th", {}, x)))), h("tbody", {}, ...rows)))
      : h("p", { class: "muted" }, "Add students first."));
}
