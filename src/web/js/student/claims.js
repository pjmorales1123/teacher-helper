// Effort claims tab: ask for extra points and see decisions.
import { get, post } from "../api.js";
import { append, badge, busy, field, fmtDate, h, toast } from "../ui.js";

export async function renderClaims() {
  const root = h("div");
  const reload = () => renderClaims().then((n) => root.replaceWith(n));
  const [claims, activities] = await Promise.all([get("/api/student/claims"), get("/api/student/activities")]);
  const activity = h("select", {}, ...activities.map((a) => h("option", { value: a.id }, `${a.title} (${a.component}, Term ${a.term})`)));
  const note = h("textarea", { placeholder: "Describe the extra effort you put in (e.g. extra practice, helping classmates, revised work)." });
  const send = h("button", { class: "primary", onclick: () => busy(send, async () => {
    await post("/api/student/claims", { activity_id: activity.value, note: note.value });
    toast("Claim sent to your teacher.");
    reload();
  }) }, "Send claim");

  append(root, h("div", { class: "split" },
    h("div", { class: "card" }, h("h2", {}, "File an effort claim"),
      h("p", { class: "muted small" }, "Your teacher decides whether to award extra points."),
      activities.length ? [field("Activity", activity), field("What did you do?", note), send]
        : h("p", { class: "muted" }, "No activities to claim on yet.")),
    h("div", {}, claims.length ? null : h("p", { class: "muted" }, "No claims yet."), ...claims.map((c) => h("div", { class: "card" },
      h("div", { class: "row" }, h("h3", {}, c.activity_title), badge(c.status), h("span", { class: "muted small right" }, fmtDate(c.created_at))),
      h("p", { class: "small" }, c.note),
      c.status === "approved" && h("p", { class: "small" }, h("strong", {}, `+${c.points} points. `), c.teacher_note),
      c.status === "rejected" && c.teacher_note && h("p", { class: "small muted" }, c.teacher_note))))));
  return root;
}
