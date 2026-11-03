import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { api } from '../lib/api';
import type { AiMode, AiStatus, DocKind } from '../lib/types';
import type { EngineHandle } from '../editor/engine';
import { FilesPanel } from './FilesPanel';
import { Message } from './Message';
import { QUICK_PROMPTS } from './prompts';
import { useAiChat } from './useAiChat';
import { VoiceBar } from '../voice/VoiceBar';

const PLACEHOLDER: Record<DocKind, Record<AiMode, string>> = {
  docx: { edit: 'e.g. "Make the objectives SMART"', ask: 'e.g. "What is missing in this DLL?"' },
  xlsx: { edit: 'e.g. "Put 15 in WW3 for Cruz, Ana"', ask: 'e.g. "Who is below 75?"' },
  pptx: { edit: 'e.g. "Add a slide summary to slide 4"', ask: 'e.g. "Is this deck too wordy?"' },
};

interface Props { docId: string; kind: DocKind; name: string; handle: EngineHandle | null; onSave: () => Promise<unknown> }

/** The Claude-style side panel: ask about the open file or have the AI propose edits. */
export function AiSidebar({ docId, kind, name, handle, onSave }: Props) {
  const chat = useAiChat(docId, handle);
  const [mode, setMode] = useState<AiMode>('edit');
  const [text, setText] = useState('');
  const [cli, setCli] = useState<AiStatus | null>(null);
  const end = useRef<HTMLDivElement>(null);

  useEffect(() => { api.aiStatus().then(setCli, () => setCli(null)); }, []);
  useEffect(() => { end.current?.scrollIntoView({ block: 'end' }); }, [chat.messages, chat.status]);

  const submit = (prompt = text) => {
    if (!prompt.trim() || chat.busy) return;
    setText('');
    void chat.send(prompt.trim(), mode);
  };
  const onKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit(); }
  };

  return (
    <aside className="ai">
      <header className="ai-head">
        <strong>Guro Buddy AI</strong>
        <FilesPanel />
        <span className={`ai-cli ${cli?.installed ? 'on' : 'off'}`} title={cli?.version ?? ''}>
          {cli ? (cli.installed ? `${cli.backend} · ${cli.model}` : `${cli.backend} not found`) : '…'}
        </span>
      </header>
      <div className="ai-modes" role="tablist">
        {(['edit', 'ask'] as const).map((m) => (
          <button key={m} role="tab" aria-selected={mode === m} className={mode === m ? 'on' : ''} onClick={() => setMode(m)}>
            {m === 'edit' ? 'Edit with AI' : 'Ask only'}
          </button>
        ))}
      </div>

      <VoiceBar kind={kind} name={name} handle={handle} chat={chat} save={onSave} />

      <div className="ai-log">
        {chat.messages.length === 0 && (
          <div className="ai-empty">
            <p>{mode === 'edit' ? 'Tell me what to change. Every change shows up as a suggestion you accept or reject.' : 'Ask anything about this file.'}</p>
            {QUICK_PROMPTS[kind].map((p) => <button key={p} className="chip" onClick={() => submit(p)} disabled={!handle}>{p}</button>)}
          </div>
        )}
        {chat.messages.map((m) => <Message key={m.key} m={m} busy={chat.busy} onApply={chat.apply} onCheck={chat.check} />)}
        {chat.status && <div className="ai-status">{chat.status}</div>}
        <div ref={end} />
      </div>

      {handle?.decideAll && (
        <div className="ai-decide">
          <button onClick={() => chat.decideAll(true)} disabled={chat.busy}>Accept all suggestions</button>
          <button onClick={() => chat.decideAll(false)} disabled={chat.busy}>Reject all</button>
        </div>
      )}

      <div className="ai-compose">
        <textarea
          value={text} onChange={(e) => setText(e.target.value)} onKeyDown={onKey} rows={3}
          placeholder={handle ? PLACEHOLDER[kind][mode] : 'Loading document…'}
          disabled={!handle}
        />
        <div className="ai-actions">
          {chat.messages.length > 0 && <button className="link" onClick={chat.clear} disabled={chat.busy}>Clear chat</button>}
          {chat.busy ? <button onClick={chat.stop}>Stop</button> : <button className="primary" onClick={() => submit()} disabled={!text.trim() || !handle}>Send</button>}
        </div>
      </div>
    </aside>
  );
}
