import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../lib/api';
import type { AiEdit, AiMode } from '../lib/types';
import type { EngineHandle, ProposeReport } from '../editor/engine';
import { runTurn } from './turn';

export type PendingState = 'waiting' | 'applied' | 'skipped' | { failed: string };

export interface UiMessage {
  key: string;
  role: 'user' | 'assistant';
  text: string;
  edits: AiEdit[];
  /** The request this answer belongs to, used by "Check the result". */
  prompt?: string;
  review?: boolean;
  checked?: boolean;
  streaming?: boolean;
  error?: string;
  report?: ProposeReport;
  pendingState?: Record<string, PendingState>;
  meta?: string;
}

/** Chat state for one document: send a turn, apply approved changes, and check the result visually. */
export function useAiChat(docId: string, handle: EngineHandle | null) {
  const [messages, setMessages] = useState<UiMessage[]>([]);
  const [status, setStatus] = useState<string | null>(null);
  const abort = useRef<AbortController | null>(null);
  const latest = useRef(messages);
  latest.current = messages;

  useEffect(() => {
    api.messages(docId).then((list) => setMessages(list.map((m) => ({ key: `h${m.id}`, role: m.role, text: m.text, edits: m.edits }))), () => {});
    return () => abort.current?.abort();
  }, [docId]);

  const patch = (key: string, p: Partial<UiMessage> | ((m: UiMessage) => Partial<UiMessage>)) =>
    setMessages((all) => all.map((m) => (m.key === key ? { ...m, ...(typeof p === 'function' ? p(m) : p) } : m)));

  const run = useCallback(async (prompt: string, mode: AiMode, review = false) => {
    if (!handle || abort.current) return;
    const turnId = `t${Date.now().toString(36)}`;
    const key = `a-${turnId}`;
    const user: UiMessage[] = review ? [] : [{ key: `u-${turnId}`, role: 'user', text: prompt, edits: [] }];
    setMessages((all) => [...all, ...user, { key, role: 'assistant', text: '', edits: [], prompt, review, streaming: true }]);
    const ctrl = new AbortController();
    abort.current = ctrl;
    try {
      const out = await runTurn(handle, docId, prompt, mode, review, turnId, {
        status: setStatus, delta: (t) => patch(key, (m) => ({ text: m.text + t })), error: (e) => patch(key, { error: e, streaming: false }),
      }, ctrl.signal);
      if (!out) return patch(key, (m) => ({ streaming: false, error: m.error ?? 'The AI stopped without an answer.' }));
      patch(key, {
        text: out.result.reply, edits: out.result.edits, streaming: false, meta: `${(out.ms / 1000).toFixed(1)} s`,
        ...(out.report ? { report: out.report, pendingState: Object.fromEntries(out.report.pending.map((c) => [c.id, 'waiting' as const])) } : {}),
      });
    } catch (err) {
      patch(key, { error: ctrl.signal.aborted ? 'Stopped.' : (err as Error).message, streaming: false });
    } finally {
      abort.current = null;
      setStatus(null);
    }
  }, [docId, handle]);

  const send = useCallback((prompt: string, mode: AiMode) => run(prompt, mode), [run]);

  /** View step: render the pages, let the AI compare them with the request, and propose fixes. */
  const check = useCallback(async (key: string) => {
    const msg = latest.current.find((m) => m.key === key);
    if (!msg?.prompt) return;
    patch(key, { checked: true });
    await run(msg.prompt, 'edit', true);
  }, [run]);

  /** Applies the approved pending changes of one message, then checks the result automatically once. */
  const apply = useCallback(async (key: string, approved: string[]) => {
    const msg = latest.current.find((m) => m.key === key);
    if (!handle || !msg?.report) return;
    setStatus('Applying changes…');
    const res = await handle.applyPending(msg.report.pending.filter((c) => approved.includes(c.id)));
    const retry = msg.report.pending.every((c) => msg.pendingState?.[c.id] !== 'waiting');
    const state: Record<string, PendingState> = { ...msg.pendingState };
    for (const c of msg.report.pending) {
      if (approved.includes(c.id)) state[c.id] = 'applied';
      else if (!retry) state[c.id] = 'skipped';
    }
    for (const f of res.failed) state[f.id] = { failed: f.reason };
    patch(key, { pendingState: state });
    setStatus(null);
    if (!msg.checked && res.applied.length) await check(key);
  }, [handle, check]);

  /** Accept/Reject all, then check the most recent unchecked answer that changed the document. */
  const decideAll = useCallback(async (accept: boolean) => {
    if (!handle?.decideAll) return;
    await handle.decideAll(accept);
    const last = [...latest.current].reverse().find((m) => m.role === 'assistant' && m.report && !m.review);
    if (accept && last && !last.checked && !last.report!.pending.length) await check(last.key);
  }, [handle, check]);

  const stop = useCallback(() => abort.current?.abort(), []);
  const clear = useCallback(async () => { await api.clearMessages(docId); setMessages([]); }, [docId]);

  return { messages, status, busy: status !== null, send, apply, check, decideAll, stop, clear };
}
