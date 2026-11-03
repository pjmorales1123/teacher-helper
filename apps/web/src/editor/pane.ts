import type { EngineHandle } from './engine';

/** Props every format pane receives from the editor page. */
export interface PaneProps {
  bytes: Uint8Array;
  name: string;
  onReady: (h: EngineHandle) => void;
  /** Ctrl+S or the engine's own save button: the page owns saving to the server. */
  onSaveRequest: () => void;
  onDirty: () => void;
  onError: (e: Error) => void;
}
