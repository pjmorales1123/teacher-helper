// JSON editor for a custom quest with validation, publish toggle and a readable preview.
import { post, put } from "../../api.js";
import { busy, h, toast } from "../../ui.js";

const TEMPLATE = {
  id: "l1-q5", level: 1, kind: "quest", order: 5, title: "My quest",
  tip: { skill: "details", title: "Right there!", text: "How to find answers that are right there in the text." },
  passage: { title: "Title", text: "Paragraph one.\n\nParagraph two." },
  words: [{ word: "word", meaning: "what it means", example: "A sentence using the word." }],
  items: [
    { id: "i1", type: "mc", skill: "details", prompt: "Question?", choices: ["A", "B", "C", "D"], answer: 0, why: "Because the text says so." },
    { id: "i2", type: "mc", skill: "details", prompt: "Question?", choices: ["A", "B", "C", "D"], answer: 1, why: "..." },
    { id: "i3", type: "order", skill: "sequence", prompt: "Put in order.", steps: ["First", "Second", "Third"], why: "..." },
    { id: "i4", type: "short", skill: "details", prompt: "One word answer?", accept: ["answer"], why: "..." },
  ],
};

function preview(obj) {
  if (!obj || typeof obj !== "object") return h("p", { class: "muted" }, "Preview appears when the JSON parses.");
  const items = Array.isArray(obj.items) ? obj.items : [];
  return h("div", {},
    h("h3", {}, obj.title || "(no title)"), h("div", { class: "muted small" }, `Level ${obj.level ?? "?"} · ${obj.kind ?? "quest"} · ${items.length} items · ${(obj.words ?? []).length} words`),
    obj.tip && h("p", { class: "small" }, h("strong", {}, `Tip (${obj.tip.skill}): `), obj.tip.text),
    obj.passage && h("div", { class: "passage small" }, ...String(obj.passage.text ?? "").split("\n").filter(Boolean).map((p) => h("p", {}, p))),
    h("ol", { class: "small" }, ...items.map((it) => h("li", {}, `[${it.skill}] ${it.prompt}`,
      it.type === "mc" && h("div", { class: "muted" }, (it.choices ?? []).map((c, i) => `${i === it.answer ? "✓" : "·"} ${c}`).join("  ")),
      it.type === "order" && h("div", { class: "muted" }, (it.steps ?? []).join(" → ")),
      it.type === "short" && h("div", { class: "muted" }, `accepts: ${(it.accept ?? []).join(", ")}`)))));
}

export function renderEditor(q, swap, home) {
  const isNew = !q.id;
  const ta = h("textarea", { style: "min-height:60vh;font-family:ui-monospace,monospace;font-size:.85rem", value: q.json || JSON.stringify(TEMPLATE, null, 2) });
  const published = h("input", { type: "checkbox", checked: q.published });
  const errors = h("div", { class: q.errors.length ? "notice" : "", html: "" });
  const prev = h("div", { class: "card sticky" });
  const parse = () => { try { return JSON.parse(ta.value); } catch { return null; } };
  const refresh = () => prev.replaceChildren(preview(parse()));
  const showErrors = (list) => { errors.className = list.length ? "notice" : ""; errors.replaceChildren(...(list.length ? [h("strong", {}, "Fix these: "), h("ul", {}, ...list.map((e) => h("li", {}, e)))] : [])); };
  ta.addEventListener("input", refresh);
  refresh();
  showErrors(q.errors);

  const validate = h("button", { onclick: () => busy(validate, async () => {
    const obj = parse();
    if (!obj) throw new Error("The JSON does not parse. Check for a missing comma or quote.");
    const r = await post("/api/levels/content/validate", obj);
    showErrors(r.errors);
    if (r.ok) toast(`Valid: ${r.summary.items} items, ${r.summary.words} words.`);
  }) }, "Validate");
  const save = h("button", { class: "primary", onclick: () => busy(save, async () => {
    const obj = parse();
    if (!obj) throw new Error("The JSON does not parse. Check for a missing comma or quote.");
    if (q.builtIn) throw new Error("Built-in quests are read-only. Use Copy to make an editable version.");
    const id = String(obj.id ?? "").toLowerCase();
    await put(`/api/levels/content/${id}`, { json: obj, published: published.checked });
    toast(published.checked ? "Saved and published." : "Saved as draft.");
    home();
  }) }, "Save");

  return h("div", {},
    h("div", { class: "toolbar" }, h("button", { onclick: home }, "← Back"), h("h2", {}, q.builtIn ? `View: ${q.id}` : isNew ? "New quest" : `Edit: ${q.id}`),
      !q.builtIn && h("label", { class: "row right", style: "font-weight:400" }, published, " Published (visible to students)"),
      validate, !q.builtIn && save),
    errors,
    h("div", { class: "split" }, h("div", { class: "card" }, ta,
      h("p", { class: "muted small", style: "margin-top:8px" }, "Fields: id, level 1-6, kind quest|challenge, title, tip{skill,title,text}, passage{title,text}, words[], items[] of mc (choices, answer index), order (steps), short (accept). Every item needs skill and why.")),
      prev));
}
