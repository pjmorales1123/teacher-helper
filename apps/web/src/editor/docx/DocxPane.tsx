import { useEffect, useMemo, useRef } from 'react';
import { DocxEditor, type DocxEditorRef } from '@betteroffice/docx-react';
import '@betteroffice/docx-react/styles.css';
import '../../lib/fonts';
import type { PaneProps } from '../pane';
import { createDocxHandle } from './adapter';

/** Word editor: paginated canvas, toolbar, comments, tracked changes, AI proposals in the sidebar. */
export default function DocxPane({ bytes, name, onReady, onSaveRequest, onDirty, onError }: PaneProps) {
  const ref = useRef<DocxEditorRef | null>(null);
  const handle = useMemo(() => createDocxHandle(ref), []);
  useEffect(() => { onReady(handle); }, [handle, onReady]);

  return (
    <DocxEditor
      ref={ref}
      documentBuffer={bytes}
      documentName={name}
      author="Teacher"
      showRuler
      allowHostProposals
      showHostProposalsInSidebar
      downloadOnSave={false}
      onSaveRequest={() => { onSaveRequest(); return false; }}
      onDocumentChange={onDirty}
      onError={(e) => onError(e)}
    />
  );
}
