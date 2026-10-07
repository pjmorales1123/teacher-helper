// Renders one LEVELS item (mc / order / short) and reads the student's answer.
import { h } from "../../ui.js";

/** Returns { el, answer(), lock(), mark(answer) } for an item. */
export function itemView(item) {
  if (item.type === "mc") return mcView(item);
  if (item.type === "order") return orderView(item);
  return shortView(item);
}

function promptEl(item) {
  const lines = item.prompt.split("\n");
  return h("p", { class: "prompt" }, ...lines.flatMap((l, i) => (i ? [h("br"), l] : [l])));
}

function mcView(item) {
  const name = `mc-${item.id}-${Math.random().toString(36).slice(2, 6)}`;
  const inputs = item.choices.map((c) =>
    h("label", { class: "choice" }, h("input", { type: "radio", name, value: c }), h("span", {}, c)));
  const el = h("div", { class: "item" }, promptEl(item), h("div", { class: "choices" }, ...inputs));
  return {
    el,
    answer: () => el.querySelector("input:checked")?.value ?? null,
    lock: () => el.querySelectorAll("input").forEach((i) => (i.disabled = true)),
    mark: (correctText) => inputs.forEach((lab) => {
      const input = lab.querySelector("input");
      if (input.value === correctText) lab.classList.add("correct");
      else if (input.checked) lab.classList.add("wrong");
    }),
  };
}

function orderView(item) {
  let steps = [...item.steps];
  const list = h("ol", { class: "order-list" });
  const draw = () => {
    list.replaceChildren(...steps.map((s, i) => h("li", {},
      h("span", { class: "step-text" }, s),
      h("span", { class: "row" },
        h("button", { type: "button", class: "mini", title: "Move up", disabled: i === 0, onclick: () => move(i, -1) }, "▲"),
        h("button", { type: "button", class: "mini", title: "Move down", disabled: i === steps.length - 1, onclick: () => move(i, 1) }, "▼")))));
  };
  const move = (i, d) => { [steps[i], steps[i + d]] = [steps[i + d], steps[i]]; draw(); };
  draw();
  const el = h("div", { class: "item" }, promptEl(item), h("p", { class: "muted small" }, "Use the arrows to put the steps in order."), list);
  return {
    el,
    answer: () => [...steps],
    lock: () => el.querySelectorAll("button").forEach((b) => (b.disabled = true)),
    mark: (correct) => [...list.children].forEach((li, i) => li.classList.add(steps[i] === correct[i] ? "correct" : "wrong")),
  };
}

function shortView(item) {
  const input = h("input", { type: "text", placeholder: "Type your answer", autocomplete: "off" });
  const el = h("div", { class: "item" }, promptEl(item), input);
  return {
    el,
    answer: () => input.value.trim() || null,
    lock: () => (input.disabled = true),
    mark: (correct, wasCorrect) => {
      input.classList.add(wasCorrect ? "correct" : "wrong");
      if (!wasCorrect) el.append(h("p", { class: "small" }, "Accepted answer: ", h("strong", {}, correct)));
    },
  };
}

export function starsEl(n, total = 3) {
  return h("span", { class: "stars", title: `${n} of ${total} stars` }, "★".repeat(n) + "☆".repeat(total - n));
}
