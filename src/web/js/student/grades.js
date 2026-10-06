// My grades tab: term grades from approved scores only.
import { get } from "../api.js";
import { h } from "../ui.js";

export async function renderGrades() {
  const r = await get("/api/student/grades");
  const terms = r.terms.map((t) => {
    const g = t.grade;
    return h("div", { class: "card" },
      h("div", { class: "row" }, h("h3", {}, `Term ${t.term}`),
        h("span", { class: g.complete ? "score right" : "muted right" }, g.complete ? g.transmutedGrade : "not yet complete")),
      h("table", {}, h("tbody", {}, ...g.components.map((c) => h("tr", {},
        h("td", {}, c.component), h("td", {}, `${c.raw} / ${c.highestPossible}`),
        h("td", {}, c.percentage === null ? "–" : `${c.percentage}%`), h("td", { class: "muted small" }, `weight ${c.weight}%`))))),
      h("p", { class: "muted small", style: "margin-top:6px" }, `Initial grade ${g.initialGrade}`));
  });
  return h("div", {},
    h("p", { class: "muted small" }, "Only scores your teacher approved are counted. Extra points from approved effort claims are included."),
    ...terms,
    h("div", { class: "card row" }, h("h3", {}, "Final grade"), h("span", { class: "score right" }, r.finalGrade ?? "–")));
}
