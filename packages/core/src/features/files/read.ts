import { readFileSync, statSync } from 'node:fs';
import { extname } from 'node:path';
import { docxText, pptxText, xlsxText } from './extract.ts';

const MAX_BYTES = 30 * 1024 * 1024;
const MAX_TEXT = 300_000;

/** Turns an allowed file into text the AI can use. PDFs and images are read by the CLI's own reader. */
export function readForAi(path: string): string {
  const size = statSync(path).size;
  if (size > MAX_BYTES) return `This file is too large to read (${Math.round(size / 1e6)} MB).`;
  const ext = extname(path).toLowerCase();
  let text: string;
  if (ext === '.docx') text = docxText(readFileSync(path));
  else if (ext === '.xlsx') text = xlsxText(readFileSync(path));
  else if (ext === '.pptx') text = pptxText(readFileSync(path));
  else if (['.csv', '.txt', '.md', '.json'].includes(ext)) text = readFileSync(path, 'utf8');
  else if (['.pdf', '.png', '.jpg', '.jpeg', '.gif', '.webp'].includes(ext)) return `Use the Read tool on this exact path to view it: ${path}`;
  else return 'This file type cannot be read.';
  return text.length > MAX_TEXT ? `${text.slice(0, MAX_TEXT)}\n[… truncated …]` : text;
}
