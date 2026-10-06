// Effort claims tab: approve or reject extra-point requests.
import { get, post } from "../api.js";
import { append, badge, busy, fmtDate, h, toast } from "../ui.js";

function row(c, reload) {
  const points = h("input", { type: "number", min: 0, step: "0.5", value: c.points || 1, style: "width:90px" });
  const note = h("input", { placeholder: "Note to student (optional)", value: c.teacher_note });
  const decide = (status) => async (e) => busy(e.target, async () => {
    await post(`/api/claims/${c.id}/decide`, { status, points: points.value, teacher_note: note.value });
    toast(status === "approved" ? "Extra points approved." : "Claim rejected.");
    reload();
  });
  return h("div", { class: "card" },
    h("div", { class: "row" }, h("h3", {}, `${c.student_name} · ${c.activity_title}`), badge(c.status),
      h("span", { class: "muted small right" }, fmtDate(c.created_at))),
    h("p", {}, c.note),
    c.status === "pending"
      ? h("div", { class: "row" }, h("span", {}, "Points:"), points, h("div", { style: "flex:1;min-width:200px" }, note),
          h("button", { class: "ok", onclick: decide("approved") }, "Approve"),
          h("button", { class: "danger", onclick: decide("rejected") }, "Reject"))
      : h("p", { class: "muted small" }, c.status === "approved" ? `+${c.points} points added to ${c.component}, Term ${c.term}. ` : "", c.teacher_note),
  );
}

export async function renderClaims() {
  const root = h("div");
  const reload = () => renderClaims().then((n) => root.replaceWith(n));
  const claims = await get("/api/claims");
  const pending = claims.filter((c) => c.status === "pending");
  const decided = claims.filter((c) => c.status !== "pending");
  append(root, 
    h("h2", {}, `Effort claims (${pending.length} pending)`),
    h("p", { class: "muted small" }, "Approved points are added to the activity's component raw score for that term, capped at the highest possible score."),
    ...pending.map((c) => row(c, reload)),
    pending.length ? null : h("p", { class: "muted" }, "No pending claims."),
    decided.length ? h("h3", { style: "margin-top:20px" }, "Decided") : null,
    ...decided.slice(0, 30).map((c) => row(c, reload)),
  );
  return root;
}
