export type DocKind = 'docx' | 'xlsx' | 'pptx';

export const MIME: Record<DocKind, string> = {
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
};

/** Maps a file name to a supported kind, or null. Legacy .doc/.xls/.ppt are rejected. */
export function kindFromName(name: string): DocKind | null {
  const ext = name.toLowerCase().split('.').pop();
  return ext === 'docx' || ext === 'xlsx' || ext === 'pptx' ? ext : null;
}

/** OOXML files are ZIP packages: they start with the "PK\x03\x04" signature. */
export function looksLikeOoxml(bytes: Uint8Array): boolean {
  return bytes.length > 4 && bytes[0] === 0x50 && bytes[1] === 0x4b && bytes[2] === 3 && bytes[3] === 4;
}

/** Keeps a display name safe to echo back in headers and UI. Never used as a path. */
export function cleanName(name: string): string {
  const base = name.split(/[\\/]/).pop() ?? 'document';
  return base.replace(/[\u0000-\u001f"<>|]/g, '').slice(0, 200) || 'document';
}
