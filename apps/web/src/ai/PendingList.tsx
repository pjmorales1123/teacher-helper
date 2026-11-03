import { useState } from 'react';
import type { PendingChange } from '../editor/engine';
import type { PendingState } from './useAiChat';

interface Props { items: PendingChange[]; state: Record<string, PendingState>; busy: boolean; onApply: (ids: string[]) => void }

/** Formatting and structure changes the editor cannot show as suggestions: the teacher ticks and applies them. */
export function PendingList({ items, state, busy, onApply }: Props) {
  const [picked, setPicked] = useState<Set<string>>(() => new Set(items.map((c) => c.id)));
  const waiting = items.some((c) => state[c.id] === 'waiting');
  const failedIds = items.filter((c) => typeof state[c.id] === 'object').map((c) => c.id);
  const toggle = (id: string) => setPicked((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });

  return (
    <div className="pending">
      <div className="pending-head">{waiting ? 'Needs your OK before it is applied:' : 'Formatting and structure changes:'}</div>
      <ul>
        {items.map((c) => {
          const st = state[c.id];
          return (
            <li key={c.id} className={typeof st === 'object' ? 'failed' : st}>
              {st === 'waiting'
                ? <label><input type="checkbox" checked={picked.has(c.id)} onChange={() => toggle(c.id)} /> {c.label}</label>
                : <span>{st === 'applied' ? '✓' : st === 'skipped' ? '–' : '✗'} {c.label}{typeof st === 'object' ? ` (${st.failed})` : ''}</span>}
            </li>
          );
        })}
      </ul>
      {!waiting && failedIds.length > 0 && (
        <button disabled={busy} onClick={() => onApply(failedIds)}>Retry {failedIds.length} failed</button>
      )}
      {waiting && (
        <button className="primary" disabled={busy || picked.size === 0} onClick={() => onApply([...picked])}>
          Apply {picked.size} change{picked.size === 1 ? '' : 's'}
        </button>
      )}
    </div>
  );
}
