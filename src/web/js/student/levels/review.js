// Word review: due words as meaning multiple-choice, one screen, then results.
import { get, post } from "../../api.js";
import { busy, h } from "../../ui.js";

export async function renderReview(goHome) {
  const r = await get("/api/student/levels/review");
  const root = h("div", {}, h("div", { class: "toolbar" }, h("button", { onclick: goHome }, "← Back"), h("h2", {}, "Word review")));
  if (!r.items.length) {
    root.append(h("div", { class: "card" }, h("p", {}, "No words are due right now. Finish a quest to collect new words, and come back tomorrow.")));
    return root;
  }
  const picks = new Map();
  const cards = r.items.map((it) => {
    const name = `rv-${it.id}`;
    return h("div", { class: "card", "data-id": it.id },
      h("p", { class: "prompt" }, "What does ", h("strong", {}, it.word), " mean?"),
      it.example && h("p", { class: "muted small" }, it.example),
      h("div", { class: "choices" }, ...it.choices.map((c, i) => h("label", { class: "choice" },
        h("input", { type: "radio", name, value: String(i), onchange: () => picks.set(it.id, i) }), h("span", {}, c)))));
  });
  const submit = h("button", { class: "primary", onclick: () => busy(submit, async () => {
    if (picks.size < r.items.length) throw new Error("Answer every word first.");
    const res = await post("/api/student/levels/review", { answers: Object.fromEntries(picks) });
    for (const row of res.results) {
      const card = cards.find((c) => Number(c.dataset.id) === row.id);
      const labels = card.querySelectorAll(".choice");
      labels[row.answer].classList.add("correct");
      if (!row.correct) labels[picks.get(row.id)].classList.add("wrong");
      card.querySelectorAll("input").forEach((i) => (i.disabled = true));
    }
    submit.replaceWith(h("div", { class: "card result " + (res.correct === res.total ? "passed" : "") },
      h("h3", {}, `${res.correct} of ${res.total} right · +${res.xp} XP`),
      h("p", { class: "small muted" }, "Words you got right move to a later box; misses come back tomorrow."),
      h("button", { class: "primary", onclick: goHome }, "Back to map")));
  }) }, "Check my answers");
  root.append(h("p", { class: "muted small" }, `${r.items.length} word${r.items.length > 1 ? "s" : ""} due today.`), ...cards, submit);
  return root;
}
