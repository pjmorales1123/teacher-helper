/**
 * Pulls the "reply" string out of a JSON object while it is still being streamed,
 * so the teacher sees the answer appear word by word instead of waiting for the end.
 */
export function createReplyExtractor() {
  let buf = '';
  let emitted = 0;

  /** Feed the next partial_json chunk; returns newly decoded reply text (may be ""). */
  return function push(chunk: string): string {
    buf += chunk;
    const m = /"reply"\s*:\s*"/.exec(buf);
    if (!m) return '';
    const decoded = decodePartialString(buf.slice(m.index + m[0].length));
    const fresh = decoded.slice(emitted);
    emitted = decoded.length;
    return fresh;
  };
}

/** Decodes a JSON string body up to its closing quote or the last complete escape. */
export function decodePartialString(s: string): string {
  let out = '';
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (c === '"') break;
    if (c !== '\\') { out += c; continue; }
    const n = s[i + 1];
    if (n === undefined) break;
    if (n === 'u') {
      const hex = s.slice(i + 2, i + 6);
      if (hex.length < 4) break;
      out += String.fromCharCode(parseInt(hex, 16));
      i += 5;
      continue;
    }
    out += ({ n: '\n', t: '\t', r: '\r', b: '\b', f: '\f' } as Record<string, string>)[n] ?? n;
    i += 1;
  }
  return out;
}
