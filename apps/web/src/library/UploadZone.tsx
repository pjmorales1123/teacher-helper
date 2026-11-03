import { useRef, useState, type DragEvent } from 'react';

const ACCEPT = '.docx,.xlsx,.pptx';

/** Drag-and-drop or click to pick Word, Excel and PowerPoint files. */
export function UploadZone({ busy, onFiles }: { busy: boolean; onFiles: (f: File[]) => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);

  const drop = (e: DragEvent) => {
    e.preventDefault(); setOver(false);
    const files = [...e.dataTransfer.files];
    if (files.length) onFiles(files);
  };

  return (
    <div
      className={`drop ${over ? 'over' : ''}`}
      onDragOver={(e) => { e.preventDefault(); setOver(true); }}
      onDragLeave={() => setOver(false)}
      onDrop={drop}
      onClick={() => input.current?.click()}
      role="button" tabIndex={0}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && input.current?.click()}
    >
      <strong>{busy ? 'Uploading…' : 'Drop a Word, Excel or PowerPoint file here'}</strong>
      <span className="muted">or click to choose (.docx, .xlsx, .pptx)</span>
      <input ref={input} type="file" accept={ACCEPT} multiple hidden onChange={(e) => { onFiles([...(e.target.files ?? [])]); e.target.value = ''; }} />
    </div>
  );
}
