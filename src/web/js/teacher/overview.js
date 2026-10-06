// Overview tab: what needs attention, and who has not submitted what.
import { get, post } from "../api.js";
import { busy, h, toast } from "../ui.js";
import { withSection } from "../section.js";

const today = new Date().toISOString().slice(0, 10);

function tile(label, value, hint) {
  return h("div", { class: "card" }, h("div", { class: "stat" }, value), h("div", {}, label),
    hint && h("div", { class: "muted small" }, hint));
}

function activityRow(a, reload) {
  const names = a.missing.map((s) => s.name).join(", ");
  const batch = h("button", { onclick: () => busy(batch, async () => {
    const r = await post(`/api/grading/activities/${a.id}/prescore-all`);
    const failed = r.failed.length ? ` ${r.failed.length} failed: ${r.failed[0].error}` : "";
    toast(`${r.done} drafted.${failed}`, r.failed.length > 0);
    reload();
  }) }, `Pre-score ${a.submitted} pending`);
  const overdue = a.due_date && a.due_date < today && a.missing.length > 0;
  return h("tr", {},
    h("td", {}, h("strong", {}, a.title), h("div", { class: "muted small" },
      `${a.component} · Term ${a.term}${a.section ? ` · ${a.section}` : ""}${a.formative ? " · formative" : ""}`,
      a.due_date && h("span", { class: overdue ? "overdue" : "" }, ` · due ${a.due_date}${overdue ? " (overdue)" : ""}`))),
    h("td", {}, `${a.approved} / ${a.total}`),
    h("td", {}, a.submitted ? h("span", { class: "badge submitted" }, `${a.submitted} to check`) : h("span", { class: "muted" }, "0")),
    h("td", {}, a.missing.length
      ? [h("span", { class: "badge missing" }, `${a.missing.length} missing`), h("div", { class: "small", style: "margin-top:4px" }, names)]
      : h("span", { class: "badge checked" }, "all in")),
    h("td", {}, a.submitted > 0 && batch));
}

export async function renderOverview() {
  const root = h("div");
  const reload = () => renderOverview().then((n) => root.replaceWith(n));
  const o = await get(withSection("/api/overview"));
  root.append(
    h("div", { class: "toolbar" }, h("h2", {}, "Overview"), h("button", { class: "right", onclick: reload }, "Refresh"),
      h("a", { class: "btn", href: "/api/backup/database", download: "" }, "Download backup")),
    h("div", { class: "grid", style: "margin-bottom:14px" },
      tile("to check", o.toCheck, "submissions waiting for you"),
      tile("missing", o.missingTotal, "student-activity pairs not yet submitted"),
      tile("effort claims", o.pendingClaims, "pending your decision"),
      tile("students", o.students, "signed up")),
    o.activities.length
      ? h("div", { class: "card table-wrap" }, h("table", {}, h("thead", {}, h("tr", {},
          ...["Activity", "Approved", "To check", "Missing", ""].map((t) => h("th", {}, t)))),
          h("tbody", {}, ...o.activities.map((a) => activityRow(a, reload)))))
      : h("p", { class: "muted" }, "Post an activity and add students to see who is missing what."),
  );
  return root;
}
