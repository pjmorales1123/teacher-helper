// Teacher Grammar Rush views: class topic heatmap and the question bank browser.
import { get } from "../../api.js";
import { h } from "../../ui.js";
import { withSection } from "../../section.js";
import { heat } from "./index.js";

export async function renderGrammarTeacher(subnav) {
  const [o, bank] = await Promise.all([get(withSection("/api/levels/grammar/overview")), get("/api/levels/grammar/bank")]);
  const tierSel = h("select", {}, ...bank.map((b) => h("option", { value: b.tier }, `${b.tier} ${b.name} (${b.items.length} items)`)));
  const topicSel = h("select", {}, h("option", { value: "" }, "All topics"));
  const table = h("div", { class: "card table-wrap" });
  const draw = () => {
    const b = bank.find((x) => x.tier === Number(tierSel.value));
    topicSel.replaceChildren(h("option", { value: "" }, "All topics"), ...b.topics.map((t) => h("option", { value: t.id, selected: t.id === topicSel.value }, t.label)));
    const items = b.items.filter((it) => !topicSel.value || it.topic === topicSel.value);
    table.replaceChildren(h("h3", { style: "padding:12px 12px 0" }, `${b.name} bank · ${items.length} items`),
      h("table", {}, h("thead", {}, h("tr", {}, ...["#", "Sentence", "Answer", "Distractors", "Topic", "Why"].map((t) => h("th", {}, t)))),
        h("tbody", {}, ...items.map((it) => h("tr", {}, h("td", { class: "small muted" }, it.id), h("td", {}, it.sentence),
          h("td", {}, h("strong", {}, it.choices[it.answer])), h("td", { class: "small muted" }, it.choices.filter((_, i) => i !== it.answer).join(" · ")),
          h("td", { class: "small" }, it.topicLabel), h("td", { class: "small" }, it.why))))));
  };
  tierSel.onchange = () => { topicSel.value = ""; draw(); }; topicSel.onchange = draw; draw();
  return h("div", {}, subnav,
    h("div", { class: "grid", style: "margin-bottom:14px" },
      h("div", { class: "card" }, h("div", { class: "stat" }, o.players), h("div", {}, "students played"), h("div", { class: "muted small" }, `${o.runs} runs`)),
      h("div", { class: "card" }, h("div", { class: "stat" }, o.tiers.map((t) => `${t.name} ${t.runs}`).join(" · ") || "–"), h("div", {}, "runs per tier")),
      h("div", { class: "card" }, h("div", { class: "stat" }, bank.reduce((n, b) => n + b.items.length, 0)), h("div", {}, "questions in the bank"), h("div", { class: "muted small" }, `${bank.length} tiers`))),
    h("div", { class: "cols-2" },
      h("div", { class: "card table-wrap" }, h("h3", { style: "padding:12px 12px 0" }, "Grammar topics (class, lowest first)"),
        o.topics.length ? h("table", {}, h("thead", {}, h("tr", {}, ...["Topic", "Accuracy", "Items"].map((t) => h("th", {}, t)))),
          h("tbody", {}, ...o.topics.map((t) => h("tr", {}, h("td", {}, t.label), h("td", {}, heat(t.accuracy, t.total)), h("td", {}, t.total)))))
          : h("p", { class: "muted", style: "padding:12px" }, "No runs yet.")),
      h("div", { class: "card" }, h("h3", {}, "Browse the bank"), h("div", { class: "row" }, tierSel, topicSel),
        h("p", { class: "muted small" }, "Each run draws 10 questions, leaning toward the topics a student gets wrong."))),
    table);
}
