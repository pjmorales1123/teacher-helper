import { lazy, Suspense, useCallback, useState } from 'react';
import { AiSidebar } from '../ai/AiSidebar';
import type { DocKind } from '../lib/types';
import { EditorHeader } from './EditorHeader';
import type { EngineHandle } from './engine';
import type { PaneProps } from './pane';
import { useDocument } from './useDocument';

// Each engine is a separate chunk, so opening a Word file never downloads the spreadsheet engine.
const PANES: Record<DocKind, React.LazyExoticComponent<(p: PaneProps) => React.ReactElement>> = {
  docx: lazy(() => import('./docx/DocxPane')),
  xlsx: lazy(() => import('./xlsx/XlsxPane')),
  pptx: lazy(() => import('./pptx/PptxPane')),
};

/** Editor screen: header, the format's editor in the middle, AI sidebar on the right. */
export function EditorPage({ id, onBack }: { id: string; onBack: () => void }) {
  const doc = useDocument(id);
  const [handle, setHandle] = useState<EngineHandle | null>(null);

  const onReady = useCallback((h: EngineHandle) => { doc.attach(h); setHandle(h); }, [doc.attach]);
  const onError = useCallback((e: Error) => doc.setError(e.message), [doc.setError]);
  const onSaveRequest = useCallback(() => { void doc.doSave(); }, [doc.doSave]);

  if (!doc.meta || !doc.bytes) {
    return <div className="center">{doc.error ? <p className="error">{doc.error}</p> : <p>Opening…</p>}</div>;
  }
  const Pane = PANES[doc.meta.kind];
  return (
    <div className="editor">
      <EditorHeader meta={doc.meta} save={doc.save} onSave={() => doc.doSave()} onRename={doc.rename} onBack={onBack} />
      {doc.error && <div className="banner error" onClick={() => doc.setError(null)}>{doc.error} <small>(click to dismiss)</small></div>}
      <div className="workspace">
        <main className="canvas">
          <Suspense fallback={<div className="pane-loading">Loading the {doc.meta.kind.toUpperCase()} editor…</div>}>
            <Pane key={`${id}-${doc.meta.kind}`} bytes={doc.bytes} name={doc.meta.name} onReady={onReady}
              onSaveRequest={onSaveRequest} onDirty={doc.markDirty} onError={onError} />
          </Suspense>
        </main>
        <AiSidebar docId={id} kind={doc.meta.kind} handle={handle} />
      </div>
    </div>
  );
}
