// Quest player: tip → passage + one item at a time with instant feedback → submit.
import { get, post } from "../../api.js";
import { busy, h, toast } from "../../ui.js";
import { strandEl } from "../../levels-art/index.js";
import { itemView } from "./items.js";
import { renderResult } from "./result.js";

function passageEl(p) {
  if (!p) return null;
  return h("div", { class: "card passage sticky" }, h("h3", {}, p.title),
    ...p.text.split("\n").filter(Boolean).map((para) => h("p", {}, para)));
}

function tipScreen(q, onStart) {
  return h("div", { class: "card tip" },
    h("div", { class: "muted small row" }, strandEl(q.tip.strand, 16), `${q.levelName} · ${q.tip.skillLabel}`),
    h("h2", {}, q.tip.title), h("p", { class: "tip-text" }, q.tip.text),
    q.words.length ? h("div", { class: "words" }, h("strong", {}, "Words to watch for: "),
      ...q.words.map((w) => h("span", { class: "word", title: w.meaning }, w.word))) : null,
    h("button", { class: "primary", onclick: onStart }, "Start reading"));
}

export async function playQuest(id, goHome) {
  const q = await get(`/api/student/levels/quests/${id}`);
  const root = h("div");
  const answers = {};
  let index = 0;

  const progress = h("div", { class: "muted small" });
  const combo = h("span", { class: "combo" });
  const bar = h("div", { class: "bar small-bar" }, h("div", { class: "fill" }));
  const slot = h("div");
  const right = h("div", {}, h("div", { class: "row" }, progress, combo), bar, slot);
  let run = 0;

  function showItem() {
    const item = q.items[index];
    progress.textContent = `Question ${index + 1} of ${q.items.length}`;
    bar.firstChild.style.width = `${Math.round((100 * index) / q.items.length)}%`;
    const view = itemView(item);
    const feedback = h("div", { class: "feedback" });
    const next = h("button", { class: "primary", hidden: true, onclick: () => { index += 1; index < q.items.length ? showItem() : finish(); } },
      index + 1 < q.items.length ? "Next" : "See results");
    const check = h("button", { class: "primary", onclick: () => busy(check, async () => {
      const a = view.answer();
      if (a === null) throw new Error("Choose or type an answer first.");
      const r = await post(`/api/student/levels/quests/${q.id}/check`, { item: item.id, answer: a });
      answers[item.id] = a;
      view.lock();
      view.mark(r.answer, r.correct);
      run = r.correct ? run + 1 : 0;
      combo.textContent = run >= 2 ? `🔥 ${run} in a row${run >= 3 ? " +5 XP" : ""}` : "";
      combo.className = `combo ${run >= 3 ? "hot" : ""}`;
      view.el.classList.add(r.correct ? "pulse-good" : "shake");
      feedback.className = `feedback ${r.correct ? "good" : "bad"}`;
      feedback.replaceChildren(h("strong", {}, r.correct ? (run >= 3 ? "On fire! " : "Correct! ") : "Not quite. "), r.why);
      check.hidden = true;
      next.hidden = false;
      next.focus();
    }) }, "Check");
    slot.replaceChildren(h("div", { class: "card" }, view.el, feedback, h("div", { class: "row", style: "margin-top:10px" }, check, next)));
  }

  async function finish() {
    try {
      const r = await post(`/api/student/levels/quests/${q.id}/submit`, { answers });
      const open = (id) => playQuest(id, goHome).then((n) => root.replaceWith(n));
      root.replaceWith(renderResult(q, r, goHome, () => open(q.id), open));
    } catch (err) {
      toast(err.message, true);
    }
  }

  function startReading() {
    root.replaceChildren(
      h("div", { class: "toolbar" }, h("button", { onclick: goHome }, "← Back"), h("h2", {}, q.title)),
      h("div", { class: "split" }, passageEl(q.passage), right));
    showItem();
  }

  root.append(h("div", { class: "toolbar" }, h("button", { onclick: goHome }, "← Back"), h("h2", {}, q.title)));
  if (q.tip) root.append(tipScreen(q, startReading));
  else root.append(h("div", { class: "card" }, h("h3", {}, `${q.levelName} Challenge`),
    h("p", {}, "No tips this time. Read carefully, use everything you practised, and score 80% or more to rank up."),
    h("button", { class: "primary", onclick: startReading }, "Begin challenge")));
  return root;
}
