import { useEffect, useMemo, useRef } from 'react';
import { XlsxEditor, type XlsxEditorApi } from '@betteroffice/xlsx-react';
import type { PaneProps } from '../pane';
import { createXlsxHandle } from './adapter';

/**
 * Excel editor: canvas grid, formula bar, formatting toolbar, AI cell proposals with accept/reject.
 * `legacySyncApi` keeps the engine in-thread so the AI can set column widths, merge cells and insert
 * rows (the async API has no structural edits yet). Pinned with BetterOffice 0.5.x; see docs/guro-buddy.
 */
export default function XlsxPane({ bytes, name, onReady, onSaveRequest, onDirty, onError }: PaneProps) {
  const ref = useRef<XlsxEditorApi | null>(null);
  const handle = useMemo(() => createXlsxHandle(ref), []);

  useEffect(() => () => { ref.current = null; }, []);

  return (
    <div className="pane-fill">
      <XlsxEditor
        legacySyncApi
        file={bytes}
        fileName={name}
        onReady={(api: XlsxEditorApi) => { ref.current = api; onReady(handle); }}
        onSaveRequest={() => { onSaveRequest(); return false; }}
        onChange={onDirty}
        onError={onError}
      />
    </div>
  );
}
