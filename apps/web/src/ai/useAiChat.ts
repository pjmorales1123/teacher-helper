import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../lib/api';
import { streamTurn, type AiEvent } from '../lib/ai-stream';
import type { AiEdit, AiMode } from '../lib/types';
import type { EngineHandle, ProposeReport } from '../editor/engine';

export type PendingState = 'waiting' | 'applied' | 'skipped' | { failed: string };

export interface UiMessage {
  key: string;
  role: 'user' | 'assistant';
  text: string;
  edits: AiEdit[];
  streaming?: boolean;
  error?: string;
  report?: ProposeReport;
  pendingState?: Record<string, PendingState>;
  meta?: string;
}

type Done = Extract<AiEvent, { type: 'done' }>;

/** Chat state for one document: send a turn, stream the reply, stage changes, apply approved ones. */
export function useAiChat(docId: string, handle: EngineHandle | null) {
  const [messages, setMessages] = useState<UiMessage[]>([]);
  const [status, setStatus] = useState<string | null>(null);
  const abort = useRef<AbortController | null>(null);

  useEffect(() => {
    api.messages(docId).then((list) => setMessages(list.map((m) => ({ key: `h${m.id}`, role: m.role, text: m.text, edits: m.edits }))), () => {});
    return () => abort.current?.abort();
  }, [docId]);

  const patch = (key: string, p: Partial<UiMessage> | ((m: UiMessage) => Partial<UiMessage>)) =>
    setMessages((all) => all.map((m) => (m.key === key ? { ...m, ...(typeof p === 'function' ? p(m) : p) } : m)));

  const send = useCallback(async (prompt: string, mode: AiMode) => {
    if (!handle || abort.current) return;
    const turnId = `t${Date.now().toString(36)}`;
    const key = `a-${turnId}`;
    setMessages((all) => [...all, { key: `u-${turnId}`, role: 'user', text: prompt, edits: [] }, { key, role: 'assistant', text: '', edits: [], streaming: true }]);
    const ctrl = new AbortController();
    abort.current = ctrl;
    try {
      setStatus('Reading your document…');
      const { context, selection } = await handle.snapshot();
      let done: Done | null = null;
      await streamTurn({ docId, mode, prompt, context, selection }, (e) => {
        if (e.type === 'status') setStatus(e.text);
        else if (e.type === 'delta') patch(key, (m) => ({ text: m.text + e.text }));
        else if (e.type === 'error') patch(key, { error: e.message, streaming: false });
        else done = e;
      }, ctrl.signal);
      const result = (done as Done | null)?.result;
      if (!result) return patch(key, (m) => ({ streaming: false, error: m.error ?? 'The AI stopped without an answer.' }));
      patch(key, { text: result.reply, edits: result.edits, streaming: false, meta: `${((done as unknown as Done).ms / 1000).toFixed(1)} s` });
      if (result.edits.length || result.ops.length || result.dropped?.length) {
        setStatus('Adding suggestions to the document…');
        const report = await handle.propose(result, turnId)
          .catch((err: Error): ProposeReport => ({ staged: 0, pending: [], failed: [{ label: 'All changes', reason: err.message }] }));
        report.failed.push(...(result.dropped ?? []).map((d) => ({ label: d.op, reason: d.reason })));
        patch(key, { report, pendingState: Object.fromEntries(report.pending.map((c) => [c.id, 'waiting' as const])) });
      }
    } catch (err) {
      patch(key, { error: ctrl.signal.aborted ? 'Stopped.' : (err as Error).message, streaming: false });
    } finally {
      abort.current = null;
      setStatus(null);
    }
  }, [docId, handle]);

  /** Applies the approved pending changes of one message; the rest are marked skipped. */
  const apply = useCallback(async (key: string, approved: string[]) => {
    const msg = messages.find((m) => m.key === key);
    if (!handle || !msg?.report) return;
    setStatus('Applying changes…');
    const chosen = msg.report.pending.filter((c) => approved.includes(c.id));
    const res = await handle.applyPending(chosen);
    const retry = msg.report.pending.every((c) => msg.pendingState?.[c.id] !== 'waiting');
    const state: Record<string, PendingState> = { ...msg.pendingState };
    for (const c of msg.report.pending) {
      if (approved.includes(c.id)) state[c.id] = 'applied';
      else if (!retry) state[c.id] = 'skipped';
    }
    for (const f of res.failed) state[f.id] = { failed: f.reason };
    patch(key, { pendingState: state });
    setStatus(null);
  }, [handle, messages]);

  const stop = useCallback(() => abort.current?.abort(), []);
  const clear = useCallback(async () => { await api.clearMessages(docId); setMessages([]); }, [docId]);

  return { messages, status, busy: status !== null, send, apply, stop, clear };
}
