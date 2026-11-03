import type { UiMessage } from './useAiChat';

/** One chat bubble. Assistant bubbles show what happened to their proposed edits. */
export function Message({ m }: { m: UiMessage }) {
  if (m.role === 'user') return <div className="msg msg-user">{m.text}</div>;
  const r = m.report;
  return (
    <div className="msg msg-ai">
      {m.text ? <div className="msg-text">{m.text}</div> : m.streaming ? <div className="msg-dots">…</div> : null}
      {m.error && <div className="msg-error">{m.error}</div>}
      {r && (
        <div className="msg-report">
          {r.staged > 0 && <div className="ok">✓ {r.staged} suggestion{r.staged > 1 ? 's' : ''} added to the document for your review.</div>}
          {r.failed.length > 0 && (
            <details>
              <summary>{r.failed.length} could not be placed</summary>
              <ul>{r.failed.map((f, i) => <li key={i}><code>{f.edit.target}</code> {f.edit.find ? `“${f.edit.find}” → ` : '+ '}“{f.edit.replace}” ({f.reason})</li>)}</ul>
            </details>
          )}
        </div>
      )}
      {!r && m.edits.length > 0 && !m.streaming && <div className="msg-meta">{m.edits.length} edit(s) suggested in an earlier session.</div>}
      {m.meta && <div className="msg-meta">{m.meta}</div>}
    </div>
  );
}
