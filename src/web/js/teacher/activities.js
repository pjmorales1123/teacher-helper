// Activities tab: list, create and edit posted work.
import { del, get, post, put } from "../api.js";
import { append, busy, field, h, toast } from "../ui.js";

const EMPTY = { title: "", component: "WW", term: 1, max_score: 10, formative: false,
  competencies: "", instructions: "", rubric: "", due_date: "" };

function form(initial, onSaved) {
  const v = { ...EMPTY, ...initial };
  const inputs = {
    title: h("input", { value: v.title, required: true, placeholder: "e.g. Quiz 1: Fractions" }),
    component: h("select", {}, ...["WW", "PT", "EX"].map((c) => h("option", { value: c, selected: c === v.component },
      { WW: "WW · Written Work", PT: "PT · Performance Task", EX: "EX · Exam" }[c]))),
    term: h("select", {}, ...[1, 2, 3].map((t) => h("option", { value: t, selected: t === Number(v.term) }, `Term ${t}`))),
    max_score: h("input", { type: "number", min: 1, step: "0.5", value: v.max_score }),
    due_date: h("input", { type: "date", value: v.due_date ?? "" }),
    formative: h("input", { type: "checkbox", checked: Boolean(v.formative) }),
    competencies: h("textarea", { value: v.competencies, placeholder: "Learning competencies covered" }),
    instructions: h("textarea", { value: v.instructions, placeholder: "What students must do" }),
    rubric: h("textarea", { value: v.rubric, placeholder: "How points are awarded" }),
  };
  const save = h("button", { class: "primary", type: "submit" }, initial.id ? "Save changes" : "Post activity");
  const el = h("form", { class: "card", onsubmit: (e) => {
    e.preventDefault();
    busy(save, async () => {
      const body = Object.fromEntries(Object.entries(inputs).map(([k, i]) => [k, i.type === "checkbox" ? i.checked : i.value]));
      if (initial.id) await put(`/api/activities/${initial.id}`, body);
      else await post("/api/activities", body);
      toast("Saved.");
      onSaved();
    });
  } },
    h("h2", {}, initial.id ? `Edit: ${initial.title}` : "New activity"),
    h("div", { class: "grid" },
      field("Title", inputs.title), field("Component", inputs.component), field("Term", inputs.term),
      field("Maximum score", inputs.max_score), field("Due date (optional)", inputs.due_date)),
    h("div", { class: "field row" }, inputs.formative, h("span", {}, "Formative (practice only, not counted in grades)")),
    field("Competencies", inputs.competencies), field("Instructions", inputs.instructions), field("Rubric", inputs.rubric),
    h("div", { class: "row" }, save, initial.id && h("button", { type: "button", onclick: onSaved }, "Cancel")),
  );
  return el;
}

export async function renderActivities() {
  const root = h("div");
  const reload = () => renderActivities().then((n) => root.replaceWith(n));
  const list = await get("/api/activities");
  const formSlot = h("div");
  const openForm = (a = {}) => { formSlot.replaceChildren(form(a, reload)); body.classList.add("cols-2"); formSlot.scrollIntoView({ behavior: "smooth", block: "nearest" }); };

  const rows = list.map((a) => h("tr", {},
    h("td", {}, h("strong", {}, a.title), a.formative ? h("span", { class: "muted small" }, " · formative") : null),
    h("td", {}, a.component), h("td", {}, a.term), h("td", {}, a.max_score), h("td", {}, a.due_date ?? ""),
    h("td", {}, h("div", { class: "row" },
      h("button", { onclick: () => openForm(a) }, "Edit"),
      h("button", { class: "danger", onclick: async () => {
        if (!confirm(`Delete "${a.title}" and all its submissions?`)) return;
        await del(`/api/activities/${a.id}`).catch((e) => toast(e.message, true));
        reload();
      } }, "Delete"))),
  ));

  const body = h("div", {}, h("div", {}, list.length
      ? h("div", { class: "card table-wrap" }, h("table", {}, h("thead", {}, h("tr", {},
          ...["Title", "Comp.", "Term", "Max", "Due", ""].map((t) => h("th", {}, t)))), h("tbody", {}, ...rows)))
      : h("p", { class: "muted" }, "No activities yet. Post one so students can submit.")), formSlot);
  append(root, h("div", { class: "toolbar" }, h("h2", {}, "Activities"),
    h("button", { class: "primary right", onclick: () => openForm() }, "+ New activity")), body);
  if (!list.length) openForm();
  return root;
}
