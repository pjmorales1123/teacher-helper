import { useEffect, useState } from 'react';
import { EditorPage } from './editor/EditorPage';
import { Library } from './library/Library';

const docFromHash = () => /^#\/doc\/([0-9a-f-]{36})$/.exec(location.hash)?.[1] ?? null;

/** Two screens, routed by the URL hash so the back button and reloads work. */
export function App() {
  const [docId, setDocId] = useState(docFromHash);
  useEffect(() => {
    const on = () => setDocId(docFromHash());
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  const open = (id: string | null) => { location.hash = id ? `/doc/${id}` : ''; };
  return docId ? <EditorPage id={docId} onBack={() => open(null)} /> : <Library onOpen={open} />;
}
