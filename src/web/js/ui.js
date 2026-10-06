// Small DOM helpers: h() builds elements, toast() shows a message.
export function h(tag, attrs = {}, ...children) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === undefined || v === null || v === false) continue;
    if (k === "class") el.className = v;
    else if (k.startsWith("on")) el.addEventListener(k.slice(2), v);
    else if (k === "html") el.innerHTML = v;
    else if (k === "value") el.value = v;
    else if (k in el && typeof v !== "string") el[k] = v;
    else el.setAttribute(k, v);
  }
  for (const c of children.flat()) {
    if (c === null || c === undefined || c === false) continue;
    el.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
  return el;
}

/** Append children to an existing element, skipping null/false like h(). */
export function append(el, ...children) {
  for (const c of children.flat()) {
    if (c === null || c === undefined || c === false) continue;
    el.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
  return el;
}

export function clear(el) {
  while (el.firstChild) el.removeChild(el.firstChild);
  return el;
}

let toastEl;
export function toast(message, isError = false) {
  if (!toastEl) {
    toastEl = h("div", { class: "toast" });
    document.body.append(toastEl);
  }
  toastEl.textContent = message;
  toastEl.className = `toast show${isError ? " error" : ""}`;
  clearTimeout(toastEl._t);
  toastEl._t = setTimeout(() => (toastEl.className = "toast"), isError ? 5000 : 2500);
}

/** Run an async action from a button, disabling it and reporting errors. */
export async function busy(button, action) {
  const label = button.textContent;
  button.disabled = true;
  button.textContent = "Working…";
  try {
    return await action();
  } catch (err) {
    toast(err.message, true);
    throw err;
  } finally {
    button.disabled = false;
    button.textContent = label;
  }
}

export function badge(status) {
  return h("span", { class: `badge ${status}` }, status);
}

export function field(labelText, input) {
  return h("div", { class: "field" }, h("label", {}, labelText), input);
}

export function fmtDate(iso) {
  if (!iso) return "";
  const d = new Date(iso.includes("T") ? iso : iso.replace(" ", "T") + "Z");
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString();
}
