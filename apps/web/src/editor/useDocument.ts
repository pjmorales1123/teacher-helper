import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../lib/api';
import type { DocumentMeta, VersionMeta } from '../lib/types';
import type { EngineHandle } from './engine';

export type SaveState = 'saved' | 'dirty' | 'saving' | 'error';

/** Loads a document's bytes and owns saving new versions to the server. */
export function useDocument(id: string) {
  const [meta, setMeta] = useState<(DocumentMeta & { versions: VersionMeta[] }) | null>(null);
  const [bytes, setBytes] = useState<Uint8Array | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [save, setSave] = useState<SaveState>('saved');
  const handle = useRef<EngineHandle | null>(null);

  useEffect(() => {
    let live = true;
    setBytes(null); setMeta(null); setError(null); setSave('saved');
    Promise.all([api.get(id), api.content(id)])
      .then(([m, b]) => { if (live) { setMeta(m); setBytes(b); } })
      .catch((e: Error) => live && setError(e.message));
    return () => { live = false; };
  }, [id]);

  // Warn before closing the tab with unsaved work.
  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => { if (save === 'dirty') e.preventDefault(); };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [save]);

  const doSave = useCallback(async (note = 'Saved') => {
    if (!handle.current) return;
    setSave('saving');
    try {
      const out = await handle.current.save();
      const m = await api.save(id, out, note);
      const full = await api.get(m.id);
      setMeta(full);
      setSave('saved');
    } catch (e) {
      setError((e as Error).message);
      setSave('error');
    }
  }, [id]);

  const rename = useCallback(async (name: string) => {
    const m = await api.rename(id, name);
    setMeta((old) => (old ? { ...old, name: m.name } : old));
  }, [id]);

  return {
    meta, bytes, error, save, setError, rename,
    markDirty: useCallback(() => setSave((s) => (s === 'saving' ? s : 'dirty')), []),
    attach: useCallback((h: EngineHandle) => { handle.current = h; }, []),
    doSave,
  };
}
