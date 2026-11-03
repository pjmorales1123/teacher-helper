import { useEffect, useMemo, useRef, useState } from 'react';
import { PptxEditor, type PptxAsyncEditorApi } from '@betteroffice/pptx-react';
import type { PptxFontFace } from '@betteroffice/pptx';
import { loadPptxFonts } from '../../lib/fonts';
import type { PaneProps } from '../pane';
import { createPptxHandle } from './adapter';

/** PowerPoint editor: slide strip, canvas, text editing, AI proposals reviewed on the slide. */
export default function PptxPane({ bytes, name, onReady, onSaveRequest, onDirty, onError }: PaneProps) {
  const ref = useRef<PptxAsyncEditorApi | null>(null);
  const handle = useMemo(() => createPptxHandle(ref), []);
  const [fonts, setFonts] = useState<PptxFontFace[] | null>(null);

  useEffect(() => { loadPptxFonts().then(setFonts, onError); }, [onError]);
  useEffect(() => () => { ref.current = null; }, []);

  if (!fonts) return <div className="pane-loading">Loading fonts…</div>;
  return (
    <div className="pane-fill">
      <PptxEditor
        file={bytes}
        fileName={name}
        fonts={fonts}
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
