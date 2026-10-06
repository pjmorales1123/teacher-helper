// Required work tab: every activity with status and score, plus submission.
import { get, post } from "../api.js";
import { append, badge, busy, h, toast } from "../ui.js";
import { fileToDataUrl } from "./camera.js";

function submitForm(a, onDone) {
  const text = h("textarea", { placeholder: "Type your essay or answer here…" });
  const photo = h("input", { type: "file", accept: "image/*", capture: "environment" });
  const scan = h("input", { type: "file", accept: "image/*" });
  const preview = h("img", { class: "preview", hidden: true, alt: "Preview" });
  let imageData = null;
  const pick = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      imageData = await fileToDataUrl(file);
      preview.src = imageData;
      preview.hidden = false;
      text.value = "";
    } catch (err) {
      toast(err.message, true);
    }
  };
  photo.addEventListener("change", pick);
  scan.addEventListener("change", pick);
  const send = h("button", { class: "primary", onclick: () => busy(send, async () => {
    const body = imageData
      ? { activity_id: a.id, kind: "image", image: imageData }
      : { activity_id: a.id, kind: "text", text: text.value };
    if (!imageData && !text.value.trim()) throw new Error("Write your answer or add a photo first.");
    await post("/api/student/submissions", body);
    toast("Submitted. Your teacher will check it.");
    onDone();
  }) }, a.status === "missing" ? "Submit" : "Resubmit");

  return h("div", { class: "card" },
    h("h3", {}, `Submit: ${a.title}`),
    a.instructions && h("p", { class: "small" }, a.instructions),
    h("div", { class: "grid" },
      h("div", {}, h("label", {}, "📷 Take a photo"), photo),
      h("div", {}, h("label", {}, "🖨 Scan or choose an image"), scan)),
    preview,
    h("div", { class: "field", style: "margin-top:10px" }, h("label", {}, "Or write your essay / answer"), text),
    h("div", { class: "row" }, send, h("button", { onclick: onDone }, "Cancel")),
  );
}

function card(a, root, reload) {
  const slot = h("div");
  return h("div", { class: "card" },
    h("div", { class: "row" },
      h("div", {}, h("h3", {}, a.title),
        h("div", { class: "muted small" }, `${a.component} · Term ${a.term}${a.formative ? " · practice" : ""}${a.due_date ? ` · due ${a.due_date}` : ""}`)),
      h("div", { class: "right row" }, badge(a.status),
        a.score !== null && h("span", { class: "score" }, `${a.score} / ${a.max_score}`))),
    a.feedback && h("p", { class: "small", style: "margin-top:8px" }, h("strong", {}, "Teacher: "), a.feedback),
    h("div", { class: "row", style: "margin-top:8px" },
      h("button", { onclick: () => slot.replaceChildren(submitForm(a, reload)) }, a.status === "missing" ? "Submit work" : "Resubmit"),
      a.instructions && h("details", {}, h("summary", { class: "small" }, "Instructions & rubric"),
        h("p", { class: "small" }, a.instructions), a.rubric && h("p", { class: "small muted" }, a.rubric))),
    slot);
}

export async function renderWork() {
  const root = h("div");
  const reload = () => renderWork().then((n) => root.replaceWith(n));
  const activities = await get("/api/student/activities");
  const missing = activities.filter((a) => a.status === "missing").length;
  append(root, 
    h("p", { class: "muted" }, missing ? `${missing} item${missing > 1 ? "s" : ""} still to submit.` : "Everything is submitted. Nice work."),
    ...activities.map((a) => card(a, root, reload)),
    activities.length ? null : h("p", { class: "muted" }, "Your teacher has not posted any activities yet."),
  );
  return root;
}
