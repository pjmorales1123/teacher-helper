// Teacher dashboard shell: tab routing and shared state.
import { get, logout, requireRole } from "../api.js";
import { clear, h } from "../ui.js";
import { renderActivities } from "./activities.js";
import { renderClaims } from "./claims.js";
import { renderGrades } from "./grades.js";
import { renderGrading } from "./grading.js";
import { renderOverview } from "./overview.js";
import { renderStudents } from "./students.js";

const views = {
  overview: renderOverview,
  grading: renderGrading,
  activities: renderActivities,
  claims: renderClaims,
  grades: renderGrades,
  students: renderStudents,
};

const view = document.getElementById("view");
const tabs = document.getElementById("tabs");

async function show(name) {
  for (const b of tabs.querySelectorAll("button")) b.classList.toggle("active", b.dataset.tab === name);
  clear(view).append(h("p", { class: "muted" }, "Loading…"));
  try {
    const content = await views[name]();
    clear(view).append(content);
  } catch (err) {
    clear(view).append(h("p", { class: "muted" }, err.message));
  }
  history.replaceState(null, "", `#${name}`);
}

tabs.addEventListener("click", (e) => {
  const b = e.target.closest("button[data-tab]");
  if (b) show(b.dataset.tab);
});
document.getElementById("logout").addEventListener("click", logout);

await requireRole("teacher");
const health = await get("/api/health").catch(() => ({}));
document.getElementById("ai-backend").textContent = `AI: ${health.aiBackend ?? "?"} CLI`;
if (health.passwordIsDefault) {
  document.getElementById("notice").append(
    h("div", { class: "notice" }, "TEACHER_PASSWORD is not set in .env. Set one before students connect."),
  );
}
show(views[location.hash.slice(1)] ? location.hash.slice(1) : "overview");
