// "To check" tab: submissions queue, AI pre-score, approval.
import { get, post } from "../api.js";
import { append, badge, busy, field, fmtDate, h, toast } from "../ui.js";

function detail(s, onDone) {
  const score = h("input", { type: "number", min: 0, max: s.max_score, step: "0.5", value: s.score ?? s.draft_score ?? "" });
  const feedback = h("textarea", { value: s.feedback ?? s.draft_feedback ?? "" });
  const prescore = h("button", { onclick: () => busy(prescore, async () => {
    const r = await post(`/api/grading/submissions/${s.id}/prescore`);
    score.value = r.draft.score;
    feedback.value = r.draft.feedback;
    toast(`Draft from ${r.backend}. Review, then approve.`);
  }) }, "Pre-score with AI");
  const approve = h("button", { class: "ok", onclick: () => busy(approve, async () => {
    await post(`/api/grading/submissions/${s.id}/approve`, { score: score.value, feedback: feedback.value });
    toast("Approved.");
    onDone();
  }) }, "Approve score");
  const reopen = h("button", { onclick: () => busy(reopen, async () => {
    await post(`/api/grading/submissions/${s.id}/reopen`);
    onDone();
  }) }, "Reopen");

  return h("div", { class: "card" },
    h("div", { class: "row" }, h("h2", {}, `${s.student_name} · ${s.activity_title}`), badge(s.status),
      h("span", { class: "muted small right" }, `Submitted ${fmtDate(s.submitted_at)}`)),
    s.kind === "image"
      ? h("img", { class: "preview", src: `/api/grading/submissions/${s.id}/image`, alt: "Submitted work" })
      : h("pre", { class: "work" }, s.content),
    h("div", { class: "grid", style: "margin-top:12px" },
      field(`Score (out of ${s.max_score})`, score), field("Feedback to student", feedback)),
    h("div", { class: "row" }, s.status !== "approved" && prescore, s.status !== "approved" && approve,
      s.status === "approved" && reopen, h("button", { onclick: onDone }, "Back to list")),
  );
}

export async function renderGrading() {
  const root = h("div");
  const reload = () => renderGrading().then((n) => root.replaceWith(n));
  const [subs, activities] = await Promise.all([get("/api/grading/submissions"), get("/api/activities")]);
  const filter = h("select", {}, h("option", { value: "" }, "All activities"),
    ...activities.map((a) => h("option", { value: a.id }, a.title)));
  const onlyPending = h("input", { type: "checkbox", checked: true });
  const tableSlot = h("div");

  const draw = () => {
    const rows = subs
      .filter((s) => !filter.value || String(s.activity_id) === filter.value)
      .filter((s) => !onlyPending.checked || s.status !== "approved")
      .map((s) => h("tr", {},
        h("td", {}, s.student_name, h("div", { class: "muted small" }, s.section)),
        h("td", {}, s.activity_title, h("div", { class: "muted small" }, `${s.component} · Term ${s.term}`)),
        h("td", {}, badge(s.status)),
        h("td", {}, s.score ?? (s.draft_score !== null ? h("span", { class: "muted" }, `draft ${s.draft_score}`) : ""), ` / ${s.max_score}`),
        h("td", {}, h("button", { onclick: () => root.replaceChildren(detail(s, reload)) }, s.status === "approved" ? "View" : "Check"))));
    tableSlot.replaceChildren(rows.length
      ? h("div", { class: "card table-wrap" }, h("table", {}, h("thead", {}, h("tr", {},
          ...["Student", "Activity", "Status", "Score", ""].map((t) => h("th", {}, t)))), h("tbody", {}, ...rows)))
      : h("p", { class: "muted" }, "Nothing to check. Submissions appear here as students send them."));
  };
  filter.addEventListener("change", draw);
  onlyPending.addEventListener("change", draw);
  draw();
  append(root, h("div", { class: "row", style: "margin-bottom:12px" }, h("h2", {}, "To check"),
    h("div", { style: "min-width:220px" }, filter), h("label", { class: "row" }, onlyPending, "Hide approved"),
    h("button", { class: "right", onclick: reload }, "Refresh")), tableSlot);
  return root;
}
