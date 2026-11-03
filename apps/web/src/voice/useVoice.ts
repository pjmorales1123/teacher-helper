import { useCallback, useEffect, useRef, useState } from 'react';
import type { EngineHandle } from '../editor/engine';
import type { DocKind } from '../lib/types';
import type { useAiChat } from '../ai/useAiChat';
import { startVoice, type VoiceSession, type VoiceState } from './live';

type Chat = ReturnType<typeof useAiChat>;
export interface Caption { id: number; who: 'you' | 'ai'; text: string; final: boolean }
export interface VoiceDoc { kind: DocKind; name: string; handle: EngineHandle | null; chat: Chat; save: () => Promise<unknown> }

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * The voice assistant: Gemini Live does the talking; its tool calls run here on the same chat the
 * teacher types into, so every spoken change appears as a suggestion (or waiting change) in the chat and document.
 */
export function useVoice(doc: VoiceDoc) {
  const [state, setState] = useState<VoiceState>('closed');
  const [captions, setCaptions] = useState<Caption[]>([]);
  const [working, setWorking] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const session = useRef<VoiceSession | null>(null);
  const live = useRef(doc);
  live.current = doc;
  const seq = useRef(0);

  /** One edit at a time: a second spoken request waits for the first to finish. */
  const untilFree = async () => { for (let i = 0; i < 240 && live.current.chat.busy; i++) await wait(500); };

  const tool = useCallback(async (name: string, args: Record<string, unknown>): Promise<Record<string, unknown>> => {
    const { chat, handle, save } = live.current;
    if (!handle) return { error: 'The document is still loading.' };
    switch (name) {
      case 'edit_document': {
        const request = String(args.request ?? '').trim();
        if (!request) return { error: 'No request given.' };
        setWorking(request);
        try {
          await untilFree();
          const out = await chat.send(request, 'edit', true);
          if (!out) return { error: 'The editing agent did not finish. Ask the teacher to try again.' };
          return { done: true, agent_reply: out.reply, suggestions_shown_in_document: out.staged, waiting_for_teacher_ok: out.pending, could_not_do: out.failed };
        } finally { setWorking(null); }
      }
      case 'read_document': {
        const snap = await handle.snapshot();
        return { content: snap.context.slice(0, 24000), selected_text: snap.selection ?? '' };
      }
      case 'apply_changes': { await untilFree(); const n = await chat.approveAll(); return { done: true, answers_applied: n }; }
      case 'discard_changes': { await chat.decideAll(false); return { done: true }; }
      case 'check_result': {
        const last = chat.lastAnswer();
        if (!last) return { error: 'Nothing to check yet.' };
        setWorking('Checking the result');
        try { await untilFree(); const out = await chat.check(last.key); return out ? { done: true, found: out.reply, fixes_waiting: out.pending, fixes_suggested: out.staged } : { error: 'Check failed.' }; }
        finally { setWorking(null); }
      }
      case 'save_document': { await save(); return { done: true }; }
      default: return { error: `Unknown tool ${name}` };
    }
  }, []);

  const caption = useCallback((who: 'you' | 'ai', text: string, final: boolean) => {
    setCaptions((all) => {
      const last = all[all.length - 1];
      if (last && last.who === who && !last.final) return [...all.slice(0, -1), { ...last, text, final }];
      return [...all.slice(-30), { id: ++seq.current, who, text, final }];
    });
  }, []);

  const start = useCallback(async () => {
    if (session.current) return;
    setError(null);
    try {
      session.current = await startVoice(live.current.kind, live.current.name, {
        state: (s) => { setState(s); if (s === 'closed') session.current = null; }, caption, tool, error: setError,
      });
    } catch (e) { setError((e as Error).message); setState('closed'); session.current = null; }
  }, [caption, tool]);

  const stop = useCallback(() => { session.current?.stop(); session.current = null; }, []);
  useEffect(() => () => session.current?.stop(), []);

  return { state, captions, working, error, start, stop, level: () => session.current?.level() ?? 0 };
}
