// Tiny fetch wrapper. Every call returns parsed JSON or throws Error(message).
export async function api(method, path, body) {
  const init = { method, headers: {} };
  if (body !== undefined) {
    init.headers["Content-Type"] = "application/json";
    init.body = JSON.stringify(body);
  }
  let res;
  try {
    res = await fetch(path, init);
  } catch {
    throw new Error("Cannot reach the server. Is it still running?");
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

export const get = (p) => api("GET", p);
export const post = (p, b) => api("POST", p, b ?? {});
export const put = (p, b) => api("PUT", p, b);
export const del = (p) => api("DELETE", p);

/** Redirect to the login page unless the session has the wanted role. */
export async function requireRole(role) {
  const s = await get("/api/auth/session");
  if (s.role !== role) {
    location.replace("/");
    throw new Error("redirecting");
  }
  return s;
}

export async function logout() {
  await post("/api/auth/logout");
  location.replace("/");
}
