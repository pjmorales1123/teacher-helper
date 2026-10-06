import { get, post } from "./api.js";

const msg = document.getElementById("msg");

get("/api/auth/session").then((s) => {
  if (s.role === "teacher") location.replace("/teacher");
  if (s.role === "student") location.replace("/student");
}).catch(() => {});

async function submit(form, path, next) {
  msg.textContent = "";
  const data = Object.fromEntries(new FormData(form).entries());
  const button = form.querySelector("button");
  button.disabled = true;
  try {
    await post(path, data);
    location.assign(next);
  } catch (err) {
    msg.textContent = err.message;
    msg.style.color = "var(--bad)";
  } finally {
    button.disabled = false;
  }
}

document.getElementById("student-form").addEventListener("submit", (e) => {
  e.preventDefault();
  submit(e.target, "/api/auth/student", "/student");
});
document.getElementById("teacher-form").addEventListener("submit", (e) => {
  e.preventDefault();
  submit(e.target, "/api/auth/teacher", "/teacher");
});
