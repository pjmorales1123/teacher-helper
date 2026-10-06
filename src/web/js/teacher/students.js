// Students tab: roster with ID + PIN sign-in, single add or bulk import.
import { del, get, post } from "../api.js";
import { append, busy, field, h, toast } from "../ui.js";
import { withSection } from "../section.js";
import { refreshSections } from "./main.js";

export async function renderStudents() {
  const root = h("div");
  const reload = () => renderStudents().then((n) => root.replaceWith(n));
  const students = await get(withSection("/api/students"));

  const id = h("input", { placeholder: "e.g. 2026-0012", required: true });
  const name = h("input", { placeholder: "Full name", required: true });
  const section = h("input", { placeholder: "e.g. Grade 7 - Rizal" });
  const pin = h("input", { placeholder: "4-12 digits", inputmode: "numeric", required: true });
  const add = h("button", { class: "primary", type: "submit" }, "Add student");
  const addForm = h("form", { class: "card", onsubmit: (e) => { e.preventDefault(); busy(add, async () => {
    await post("/api/students", { id: id.value, name: name.value, section: section.value, pin: pin.value });
    toast("Student added."); await refreshSections(); reload();
  }); } },
    h("h3", {}, "Add student"),
    h("div", { class: "grid" }, field("Student ID", id), field("Name", name), field("Section", section), field("PIN", pin)), add);

  const bulk = h("textarea", { placeholder: "2026-0001, Juan Dela Cruz, Grade 7 - Rizal, 1234\n2026-0002, Maria Santos, Grade 7 - Rizal, 5678" });
  const file = h("input", { type: "file", accept: ".csv,.txt,text/csv" });
  file.addEventListener("change", async () => { if (file.files[0]) bulk.value = await file.files[0].text(); });
  const importBtn = h("button", { class: "primary", onclick: () => busy(importBtn, async () => {
    const r = await post("/api/students/import", { text: bulk.value });
    const skipped = r.skipped.length ? ` ${r.skipped.length} skipped (line ${r.skipped[0].line}: ${r.skipped[0].reason}).` : "";
    toast(`Imported ${r.imported} students.${skipped}`, r.skipped.length > 0);
    await refreshSections(); reload();
  }) }, "Import");
  const template = "data:text/csv;charset=utf-8," + encodeURIComponent("Student ID,Name,Section,PIN\r\n2026-0001,Juan Dela Cruz,Grade 7 - Rizal,1234\r\n");
  const bulkForm = h("div", { class: "card" }, h("h3", {}, "Import from CSV"),
    h("p", { class: "muted small" }, "Columns: Student ID, Name, Section, PIN. A header row is fine. Existing IDs are updated. ",
      h("a", { href: template, download: "students-template.csv" }, "Download template")),
    h("div", { class: "field" }, file), h("div", { class: "field" }, bulk), importBtn);

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
