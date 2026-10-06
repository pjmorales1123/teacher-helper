// Student page shell: required work, effort claims, grades.
import { get, logout, requireRole } from "../api.js";
import { clear, h } from "../ui.js";
import { renderClaims } from "./claims.js";
import { renderGrades } from "./grades.js";
import { renderWork } from "./work.js";
import { renderLevels } from "./levels/index.js";

const views = { work: renderWork, levels: renderLevels, claims: renderClaims, grades: renderGrades };
const view = document.getElementById("view");
const tabs = document.getElementById("tabs");

async function show(name) {
  for (const b of tabs.querySelectorAll("button")) b.classList.toggle("active", b.dataset.tab === name);
  clear(view).append(h("p", { class: "muted" }, "Loading…"));
  try {
    clear(view).append(await views[name]());
  } catch (err) {
    clear(view).append(h("p", { class: "muted" }, err.message));
  }
}

tabs.addEventListener("click", (e) => {
  const b = e.target.closest("button[data-tab]");
  if (b) show(b.dataset.tab);
});
document.getElementById("logout").addEventListener("click", logout);

await requireRole("student");
const me = await get("/api/student/me");
document.getElementById("who").firstChild.textContent = me.name + " ";
document.getElementById("section").textContent = `${me.id} · ${me.section}`;
show("work");
