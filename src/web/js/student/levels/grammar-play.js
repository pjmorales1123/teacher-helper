// Grammar Rush run: one sentence at a time, four answers, hearts, a timer bar, streak multiplier, keys 1–4.
import { post } from "../../api.js";
import { h, toast } from "../../ui.js";

export async function playRush(tier, onFinish, goHome) {
  const run = await post("/api/student/levels/grammar/run/start", { tier });
  const root = h("div", { class: "rush" });
  const hearts = h("span", { class: "hearts" });
  const streakEl = h("span", { class: "combo" });
  const progress = h("span", { class: "muted small" });
  const xpEl = h("span", { class: "xp-chip" }, "0 XP");
  const timer = h("div", { class: "bar rush-timer" }, h("div", { class: "fill" }));
  const slot = h("div");
  let index = 0, hearts_ = run.hearts, xp = 0, locked = false, tick = null, started = 0;
  const limit = run.seconds * 1000;

  const drawHearts = () => { hearts.textContent = "♥".repeat(hearts_) + "♡".repeat(Math.max(0, run.hearts - hearts_)); };
  const end = async () => { clearInterval(tick); document.removeEventListener("keydown", onKey); try { onFinish(await post("/api/student/levels/grammar/run/finish")); } catch (e) { toast(e.message, true); } };
  let currentButtons = [];
  function onKey(e) { const n = Number(e.key); if (n >= 1 && n <= 4 && currentButtons[n - 1] && !locked) currentButtons[n - 1].click(); }

  async function answer(item, choice, buttons) {
    if (locked) return; locked = true; clearInterval(tick);
    const ms = Date.now() - started;
    let r; try { r = await post("/api/student/levels/grammar/run/answer", { item: item.id, answer: choice, ms }); } catch (e) { toast(e.message, true); locked = false; return; }
    hearts_ = r.hearts; drawHearts(); xp = r.xpSoFar; xpEl.textContent = `${xp} XP`;
    streakEl.textContent = r.streak >= 2 ? `🔥 ${r.streak} streak${r.multiplier > 1 ? ` ×${r.multiplier}` : ""}` : "";
    streakEl.className = `combo ${r.multiplier > 1 ? "hot" : ""}`;
    for (const b of buttons) { b.disabled = true; if (b.dataset.c === r.answer) b.classList.add("correct"); else if (b.dataset.c === choice) b.classList.add("wrong"); }
    const fb = slot.querySelector(".feedback");
    fb.className = `feedback ${r.correct ? "good" : "bad"}`;
    fb.replaceChildren(h("strong", {}, r.correct ? (r.multiplier > 1 ? "On fire! " : "Correct! ") : choice === null ? "Time's up. " : "Not quite. "), r.why);
    slot.firstChild.classList.add(r.correct ? "pulse-good" : "shake");
    setTimeout(() => { index += 1; r.over ? end() : show(); }, r.correct ? 650 : 1500);
  }

  function show() {
    locked = false;
    const item = run.items[index];
    progress.textContent = `${index + 1} / ${run.items.length}`;
    const [before, after] = item.sentence.split("___");
    const buttons = item.choices.map((c, i) => h("button", { class: "rush-choice", "data-c": c, onclick: () => answer(item, c, buttons) }, h("kbd", {}, i + 1), c));
    currentButtons = buttons;
    slot.replaceChildren(h("div", { class: "card rush-q" },
      h("p", { class: "rush-sentence" }, before, h("span", { class: "blank" }, "____"), after),
      h("div", { class: "rush-choices" }, ...buttons), h("div", { class: "feedback" })));
    started = Date.now();
    timer.firstChild.style.width = "100%"; timer.firstChild.className = "fill";
    tick = setInterval(() => {
      const left = Math.max(0, 1 - (Date.now() - started) / limit);
      timer.firstChild.style.width = `${left * 100}%`;
      if (left < 0.3) timer.firstChild.className = "fill urgent";
      if (left <= 0) answer(item, null, buttons);
    }, 100);
  }

  drawHearts();
  document.addEventListener("keydown", onKey);
  root.append(
    h("div", { class: "toolbar" }, h("button", { onclick: () => { clearInterval(tick); document.removeEventListener("keydown", onKey); goHome(); } }, "← Quit"),
      h("h2", {}, `⚡ ${run.name} Rush`), progress, hearts, streakEl, h("span", { class: "right" }, xpEl)),
    timer, slot);
  show();
  return root;
}
