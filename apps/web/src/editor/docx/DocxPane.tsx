import { useEffect, useMemo, useRef } from 'react';
import { DocxEditor, type DocxEditorRef } from '@betteroffice/docx-react';
import '@betteroffice/docx-react/styles.css';
import '../../lib/fonts';
import type { PaneProps } from '../pane';
import { createDocxHandle } from './adapter';

/** Fonts for scripts we do not bundle (e.g. CJK) fall back silently; that is not an error for the teacher. */
const isFontNotice = (e: Error) => e.message.startsWith('[font]');

/**
 * Word editor: paginated canvas, toolbar, comments, tracked changes, AI proposals in the sidebar.
 * `legacySyncApi` keeps the engine in-thread so AI formatting can set exact selections and run
 * toolbar commands. It is pinned with BetterOffice 0.5.x (removed in 0.6; see docs/guro-buddy).
 */
export default function DocxPane({ bytes, name, onReady, onSaveRequest, onDirty, onError }: PaneProps) {
  const ref = useRef<DocxEditorRef | null>(null);
  const handle = useMemo(() => createDocxHandle(ref), []);
  useEffect(() => { onReady(handle); }, [handle, onReady]);

  return (
    <DocxEditor
      ref={ref}
      legacySyncApi
      documentBuffer={bytes}
      documentName={name}
      author="Teacher"
      showRuler
      allowHostProposals
      showHostProposalsInSidebar
      downloadOnSave={false}
      onSaveRequest={() => { onSaveRequest(); return false; }}
      onDocumentChange={onDirty}
      onError={(e) => (isFontNotice(e) ? console.warn(e.message) : onError(e))}
    />
  );
}
