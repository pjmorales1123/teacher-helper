import { useEffect, useMemo, useRef, useState } from 'react';
import { PptxEditor, type PptxEditorApi } from '@betteroffice/pptx-react';
import type { PptxFontFace } from '@betteroffice/pptx';
import { loadPptxFonts } from '../../lib/fonts';
import type { PaneProps } from '../pane';
import { createPptxHandle } from './adapter';

/**
 * PowerPoint editor: slide strip, canvas, text editing, AI proposals reviewed on the slide.
 * `legacySyncApi` keeps the engine in-thread so the AI can add bullets and copy slides
 * (the async API cannot yet). Pinned with BetterOffice 0.5.x; see docs/guro-buddy.
 */
export default function PptxPane({ bytes, name, onReady, onSaveRequest, onDirty, onError }: PaneProps) {
  const ref = useRef<PptxEditorApi | null>(null);
  const handle = useMemo(() => createPptxHandle(ref), []);
  const [fonts, setFonts] = useState<PptxFontFace[] | null>(null);

  useEffect(() => { loadPptxFonts().then(setFonts, onError); }, [onError]);
  useEffect(() => () => { ref.current = null; }, []);

  if (!fonts) return <div className="pane-loading">Loading fonts…</div>;
  return (
    <div className="pane-fill">
      <PptxEditor
        legacySyncApi
        file={bytes}
        fileName={name}
        fonts={fonts}
        onReady={(api: unknown) => { const a = api as PptxEditorApi; if (a.handle) { ref.current = a; onReady(handle); } }}
        onSaveRequest={() => { onSaveRequest(); return false; }}
        onChange={onDirty}
        onError={onError}
      />
    </div>
  );
}
