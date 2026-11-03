import type { AiStatus, ChatMessage, DocumentMeta, VersionMeta } from './types';

async function json<T>(res: Response): Promise<T> {
  if (res.ok) return (res.status === 204 ? undefined : await res.json()) as T;
  const body = await res.json().catch(() => ({}));
  throw new Error(body.error ?? `Request failed (${res.status})`);
}

/** Thin client for the guro-core REST API. */
export const api = {
  list: () => fetch('/api/documents').then((r) => json<DocumentMeta[]>(r)),
  get: (id: string) => fetch(`/api/documents/${id}`).then((r) => json<DocumentMeta & { versions: VersionMeta[] }>(r)),

  upload(file: File) {
    const form = new FormData();
    form.append('file', file, file.name);
    return fetch('/api/documents', { method: 'POST', body: form }).then((r) => json<DocumentMeta>(r));
  },

  async content(id: string, version?: number): Promise<Uint8Array> {
    const res = await fetch(`/api/documents/${id}/content${version ? `?version=${version}` : ''}`);
    if (!res.ok) await json(res);
    return new Uint8Array(await res.arrayBuffer());
  },

  downloadUrl: (id: string, version?: number) => `/api/documents/${id}/content?download=1${version ? `&version=${version}` : ''}`,

  save: (id: string, bytes: Uint8Array, note: string) =>
    fetch(`/api/documents/${id}/content?note=${encodeURIComponent(note)}`, {
      method: 'PUT', headers: { 'content-type': 'application/octet-stream' }, body: bytes as BodyInit,
    }).then((r) => json<DocumentMeta>(r)),

  rename: (id: string, name: string) =>
    fetch(`/api/documents/${id}`, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name }) })
      .then((r) => json<DocumentMeta>(r)),

  remove: (id: string) => fetch(`/api/documents/${id}`, { method: 'DELETE' }).then((r) => json<void>(r)),
  messages: (id: string) => fetch(`/api/documents/${id}/messages`).then((r) => json<ChatMessage[]>(r)),
  clearMessages: (id: string) => fetch(`/api/documents/${id}/messages`, { method: 'DELETE' }).then((r) => json<void>(r)),
  aiStatus: () => fetch('/api/ai/status').then((r) => json<AiStatus>(r)),
};
