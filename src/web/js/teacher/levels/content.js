// Content manager: every quest (built-in and custom), with edit, copy, publish, delete and AI draft.
import { del, get, post } from "../../api.js";
import { busy, field, h, toast } from "../../ui.js";
import { renderEditor } from "./editor.js";

function draftForm(swap, home, meta) {
  const level = h("select", {}, ...meta.levels.map((l) => h("option", { value: l.level }, `${l.level} ${l.name} (≈ ${l.band})`)));
  const skill = h("select", {}, ...Object.entries(meta.skills).map(([id, s]) => h("option", { value: id }, `${s.label} (${s.strand})`)));
  const kind = h("select", {}, h("option", { value: "quest" }, "Quest (with tip)"), h("option", { value: "challenge" }, "Challenge (10 mixed items)"));
  const topic = h("input", { placeholder: "Optional topic, e.g. a barangay fiesta, a science fair, a typhoon" });
  const go = h("button", { class: "primary", onclick: () => busy(go, async () => {
    toast("Asking the AI for a draft. This can take a minute…");
    const r = await post("/api/levels/content/draft", { level: Number(level.value), skill: skill.value, kind: kind.value, topic: topic.value });
    if (!r.ok) toast(`Draft needs fixes: ${r.errors[0]}`, true);
    swap(renderEditor({ id: r.id, json: r.json, published: false, builtIn: false, errors: r.errors }, swap, home));
  }) }, "Draft with AI");
  return h("div", { class: "card" }, h("h3", {}, "Draft a new quest with the AI"),
    h("p", { class: "muted small" }, "Uses your subscription CLI. The draft opens in the editor; nothing is shown to students until you publish it."),
    h("div", { class: "grid" }, field("Level", level), field("Focus skill", skill), field("Kind", kind), field("Topic", topic)),
    h("div", { class: "row" }, go, h("button", { onclick: () => swap(renderEditor({ id: "", json: "", published: false, builtIn: false, errors: [] }, swap, home)) }, "Write one by hand")));
}

export async function renderContent(swap, home) {
  const [list, meta] = await Promise.all([get("/api/levels/content"), get("/api/levels/meta")]);
  const reload = () => swap(renderContent(swap, home));
  const open = async (id) => {
    const q = await get(`/api/levels/content/${id}`);
    swap(renderEditor({ ...q, errors: [] }, swap, home));
  };
  const copy = async (id) => {
    const q = await get(`/api/levels/content/${id}`);
    const obj = JSON.parse(q.json);
    obj.id = `${id}-copy`;
    obj.title = `${obj.title} (copy)`;
    swap(renderEditor({ id: obj.id, json: JSON.stringify(obj, null, 2), published: false, builtIn: false, errors: [] }, swap, home));
  };
  const remove = async (id) => {
    if (!confirm(`Delete custom quest ${id}? Student attempts on it are kept.`)) return;
    await del(`/api/levels/content/${id}`); toast("Deleted."); reload();
  };
  const row = (q) => h("tr", {},
    h("td", {}, `${q.level} ${meta.levels[q.level - 1]?.name ?? ""}`),
    h("td", {}, q.title, h("div", { class: "muted small" }, `${q.id} · ${q.kind}${q.items ? ` · ${q.items} items` : ""}`)),
    h("td", {}, q.builtIn ? h("span", { class: "badge rejected" }, "built-in") : h("span", { class: `badge ${q.published ? "checked" : "pending"}` }, q.published ? "published" : "draft")),
    h("td", {}, h("div", { class: "row" },
      h("button", { onclick: () => open(q.id) }, q.builtIn ? "View" : "Edit"),
      h("button", { onclick: () => copy(q.id) }, "Copy"),
      !q.builtIn && h("button", { class: "danger", onclick: () => remove(q.id) }, "Delete"))));
  const sorted = [...list].sort((a, b) => a.level - b.level || (a.kind === "placement" ? -1 : 0) || a.id.localeCompare(b.id));
  return h("div", {},
    h("div", { class: "toolbar" }, h("h2", {}, "LEVELS"),
      h("nav", { class: "tabs sub" }, h("button", { onclick: home }, "Class progress"), h("button", { class: "active" }, "Quests & content"))),
    draftForm(swap, home, meta),
    h("div", { class: "card table-wrap" }, h("table", {}, h("thead", {}, h("tr", {}, ...["Level", "Quest", "Status", ""].map((t) => h("th", {}, t)))),
      h("tbody", {}, ...sorted.map(row)))),
    h("p", { class: "muted small" }, "Built-in quests cannot be changed, but Copy makes an editable version. A custom quest with the same id as a built-in one replaces it once published."));
}
