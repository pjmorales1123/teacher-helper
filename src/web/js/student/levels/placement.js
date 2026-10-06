// Placement test: rounds of three items, climbing until a round is failed.
import { get, post } from "../../api.js";
import { busy, h } from "../../ui.js";
import { itemView } from "./items.js";

export async function renderPlacement(onDone) {
  const root = h("div");
  async function round() {
    const r = await get("/api/student/levels/placement");
    const views = r.items.map((it) => ({ it, v: itemView(it) }));
    const submit = h("button", { class: "primary", onclick: () => busy(submit, async () => {
      const answers = {};
      for (const { it, v } of views) {
        const a = v.answer();
        if (a === null) throw new Error("Answer all three questions first.");
        answers[it.id] = a;
      }
      const res = await post("/api/student/levels/placement", { answers });
      if (res.done) {
        root.replaceChildren(h("div", { class: "card result passed" },
          h("h2", {}, `You start at ${res.levelName}!`),
          h("p", {}, "This is where the quests will fit you best. You can climb from here."),
          h("button", { class: "primary", onclick: onDone }, "Open my map")));
      } else {
        await round();
      }
    }) }, "Submit answers");
    root.replaceChildren(
      h("div", { class: "card" }, h("h2", {}, "Where do I start?"),
        h("p", { class: "muted" }, `Round ${r.round}. Answer three quick questions. Get two right to climb to the next round.`)),
      ...views.map(({ v }) => h("div", { class: "card" }, v.el)),
      h("div", { class: "row" }, submit,
        r.round === 1 && h("button", { onclick: async () => { await post("/api/student/levels/placement/skip"); onDone(); } }, "Skip, start at Seedling")));
  }
  await round();
  return root;
}
