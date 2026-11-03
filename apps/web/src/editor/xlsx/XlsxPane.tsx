import { useEffect, useMemo, useRef } from 'react';
import { XlsxEditor, type XlsxAsyncEditorApi } from '@betteroffice/xlsx-react';
import type { PaneProps } from '../pane';
import { createXlsxHandle } from './adapter';

/** Excel editor: canvas grid, formula bar, formatting toolbar, AI cell proposals with accept/reject. */
export default function XlsxPane({ bytes, name, onReady, onSaveRequest, onDirty, onError }: PaneProps) {
  const ref = useRef<XlsxAsyncEditorApi | null>(null);
  const handle = useMemo(() => createXlsxHandle(ref), []);

  useEffect(() => () => { ref.current = null; }, []);

  return (
    <div className="pane-fill">
      <XlsxEditor
        file={bytes}
        fileName={name}
        downloadOnSave={false}
        onReady={(api) => { ref.current = api; onReady(handle); }}
        onSaveRequest={() => { onSaveRequest(); return false; }}
        onDocumentChange={onDirty}
        onError={onError}
        style={{ height: '100%' }}
      />
    </div>
  );
}
