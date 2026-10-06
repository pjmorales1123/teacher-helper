// Students tab: roster with ID + PIN sign-in, single add or bulk import.
import { del, get, post } from "../api.js";
import { append, busy, field, h, toast } from "../ui.js";

export async function renderStudents() {
  const root = h("div");
  const reload = () => renderStudents().then((n) => root.replaceWith(n));
  const students = await get("/api/students");

  const id = h("input", { placeholder: "e.g. 2026-0012", required: true });
  const name = h("input", { placeholder: "Full name", required: true });
  const section = h("input", { placeholder: "e.g. Grade 7 - Rizal" });
  const pin = h("input", { placeholder: "4-12 digits", inputmode: "numeric", required: true });
  const add = h("button", { class: "primary", type: "submit" }, "Add student");
  const addForm = h("form", { class: "card", onsubmit: (e) => { e.preventDefault(); busy(add, async () => {
    await post("/api/students", { id: id.value, name: name.value, section: section.value, pin: pin.value });
    toast("Student added."); reload();
  }); } },
    h("h3", {}, "Add student"),
    h("div", { class: "grid" }, field("Student ID", id), field("Name", name), field("Section", section), field("PIN", pin)), add);

  const bulk = h("textarea", { placeholder: "2026-0001, Juan Dela Cruz, Grade 7 - Rizal, 1234\n2026-0002, Maria Santos, Grade 7 - Rizal, 5678" });
  const importBtn = h("button", { onclick: () => busy(importBtn, async () => {
    const r = await post("/api/students/import", { text: bulk.value });
    toast(`Imported ${r.imported} students.`); reload();
  }) }, "Import");
  const bulkForm = h("details", { class: "card" }, h("summary", {}, "Bulk import (one per line: ID, name, section, PIN)"),
    h("div", { style: "margin-top:10px" }, bulk), importBtn);

  const rows = students.map((s) => h("tr", {}, h("td", {}, s.id), h("td", {}, s.name), h("td", {}, s.section),
    h("td", {}, h("button", { class: "danger", onclick: async () => {
      if (!confirm(`Remove ${s.name} and all their submissions?`)) return;
      await del(`/api/students/${encodeURIComponent(s.id)}`).catch((e) => toast(e.message, true));
      reload();
    } }, "Remove"))));

  append(root, h("div", { class: "toolbar" }, h("h2", {}, `Students (${students.length})`)),
    h("div", { class: "cols-2" }, addForm, bulkForm),
    rows.length
      ? h("div", { class: "card table-wrap" }, h("table", {}, h("thead", {}, h("tr", {},
          ...["ID", "Name", "Section", ""].map((t) => h("th", {}, t)))), h("tbody", {}, ...rows)))
      : h("p", { class: "muted" }, "No students yet. Students sign in with their ID and PIN."));
  return root;
}
