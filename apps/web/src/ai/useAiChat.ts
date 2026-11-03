import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../lib/api';
import { streamTurn, type AiEvent } from '../lib/ai-stream';
import type { AiEdit, AiMode } from '../lib/types';
import type { EngineHandle, ProposeReport } from '../editor/engine';

export interface UiMessage {
  key: string;
  role: 'user' | 'assistant';
  text: string;
  edits: AiEdit[];
  streaming?: boolean;
  error?: string;
  report?: ProposeReport;
  meta?: string;
}

/** Chat state for one document: send a turn, stream the reply, stage edits in the editor. */
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
      let done: Extract<AiEvent, { type: 'done' }> | null = null;
      await streamTurn({ docId, mode, prompt, context, selection }, (e) => {
        if (e.type === 'status') setStatus(e.text);
        else if (e.type === 'delta') patch(key, (m) => ({ text: m.text + e.text }));
        else if (e.type === 'error') patch(key, { error: e.message, streaming: false });
        else done = e;
      }, ctrl.signal);
      const result = (done as Extract<AiEvent, { type: 'done' }> | null);
      if (!result) return patch(key, (m) => ({ streaming: false, error: m.error ?? 'The AI stopped without an answer.' }));
      const { reply, edits } = result.result;
      patch(key, { text: reply, edits, streaming: false, meta: `${(result.ms / 1000).toFixed(1)} s` });
      if (edits.length) {
        setStatus('Adding suggestions to the document…');
        const report = await handle.propose(edits, turnId)
          .catch((err: Error) => ({ staged: 0, failed: edits.map((edit) => ({ edit, reason: err.message })) }));
        patch(key, { report });
      }
    } catch (err) {
      const msg = ctrl.signal.aborted ? 'Stopped.' : (err as Error).message;
      patch(key, { error: msg, streaming: false });
    } finally {
      abort.current = null;
      setStatus(null);
    }
  }, [docId, handle]);

  const stop = useCallback(() => abort.current?.abort(), []);
  const clear = useCallback(async () => { await api.clearMessages(docId); setMessages([]); }, [docId]);

  return { messages, status, busy: status !== null, send, stop, clear };
}
