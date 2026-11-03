/**
 * Minimal MCP server (stdio, newline-delimited JSON-RPC) giving the AI two read-only tools over
 * the folders the teacher allowed. Started by the CLI per turn; folders arrive in GURO_READ_DIRS.
 */
import { createInterface } from 'node:readline';
import { insideAllowed } from './folders.ts';
import { readForAi } from './read.ts';
import { findFiles } from './search.ts';

const folders: string[] = JSON.parse(process.env.GURO_READ_DIRS ?? '[]');

const TOOLS = [
  {
    name: 'find_files',
    description: "Search the teacher's allowed folders for files by name. Returns paths, sizes and modified dates, newest and best matches first.",
    inputSchema: { type: 'object', properties: { query: { type: 'string', description: 'Words from the file name, e.g. "grades q1" or "action research"' } }, required: ['query'] },
  },
  {
    name: 'read_file',
    description: 'Read a Word, Excel, PowerPoint, CSV or text file from an allowed folder as text. For PDFs and images it tells you to use the Read tool.',
    inputSchema: { type: 'object', properties: { path: { type: 'string', description: 'A full path returned by find_files' } }, required: ['path'] },
  },
];

function call(name: string, args: Record<string, unknown>): string {
  if (name === 'find_files') {
    const found = findFiles(folders, String(args.query ?? ''));
    return found.length ? found.map((f) => `${f.path}  (${Math.ceil(f.size / 1024)} KB, modified ${f.modified.slice(0, 10)})`).join('\n') : 'No matching files in the allowed folders.';
  }
  if (name === 'read_file') {
    const safe = insideAllowed(String(args.path ?? ''), folders);
    return safe ? readForAi(safe) : 'That path is outside the folders the teacher allowed.';
  }
  throw new Error(`Unknown tool ${name}`);
}

function reply(id: unknown, result: unknown) { process.stdout.write(`${JSON.stringify({ jsonrpc: '2.0', id, result })}\n`); }
function fail(id: unknown, message: string) { process.stdout.write(`${JSON.stringify({ jsonrpc: '2.0', id, error: { code: -32603, message } })}\n`); }

createInterface({ input: process.stdin }).on('line', (line) => {
  let msg: { id?: unknown; method?: string; params?: Record<string, unknown> };
  try { msg = JSON.parse(line); } catch { return; }
  const { id, method, params = {} } = msg;
  if (id === undefined) return; // notifications need no answer
  try {
    if (method === 'initialize') reply(id, { protocolVersion: params.protocolVersion ?? '2025-06-18', capabilities: { tools: {} }, serverInfo: { name: 'guro-files', version: '1.0.0' } });
    else if (method === 'tools/list') reply(id, { tools: TOOLS });
    else if (method === 'tools/call') reply(id, { content: [{ type: 'text', text: call(String(params.name), (params.arguments ?? {}) as Record<string, unknown>) }] });
    else if (method === 'ping') reply(id, {});
    else fail(id, `Unsupported method ${method}`);
  } catch (e) {
    reply(id, { content: [{ type: 'text', text: `Error: ${(e as Error).message}` }], isError: true });
  }
});
