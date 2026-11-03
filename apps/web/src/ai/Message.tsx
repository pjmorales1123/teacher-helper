import { PendingList } from './PendingList';
import type { UiMessage } from './useAiChat';

interface Props { m: UiMessage; busy: boolean; onApply: (key: string, ids: string[]) => void; onCheck: (key: string) => void }

/** One chat bubble. Assistant bubbles show suggestions placed, changes awaiting approval, and failures. */
export function Message({ m, busy, onApply, onCheck }: Props) {
  if (m.role === 'user') return <div className="msg msg-user">{m.text}</div>;
  const r = m.report;
  return (
    <div className={`msg msg-ai${m.review ? ' msg-review' : ''}`}>
      {m.review && <div className="msg-tag">Checked the result</div>}
      {m.text ? <div className="msg-text">{m.text}</div> : m.streaming ? <div className="msg-dots">…</div> : null}
      {m.error && <div className="msg-error">{m.error}</div>}
      {r && (
        <div className="msg-report">
          {r.staged > 0 && <div className="ok">✓ {r.staged} suggestion{r.staged > 1 ? 's' : ''} added to the document for your review.</div>}
          {r.pending.length > 0 && <PendingList items={r.pending} state={m.pendingState ?? {}} busy={busy} onApply={(ids) => onApply(m.key, ids)} />}
          {r.failed.length > 0 && (
            <details>
              <summary>{r.failed.length} could not be done</summary>
              <ul>{r.failed.map((f, i) => <li key={i}>{f.label} ({f.reason})</li>)}</ul>
            </details>
          )}
        </div>
      )}
      {!r && m.edits.length > 0 && !m.streaming && <div className="msg-meta">{m.edits.length} edit(s) suggested in an earlier session.</div>}
      {r && !m.review && !m.streaming && (
        <button className="link check" disabled={busy} onClick={() => onCheck(m.key)}>{m.checked ? 'Check again' : 'Check the result'}</button>
      )}
      {m.meta && <div className="msg-meta">{m.meta}</div>}
    </div>
  );
}
