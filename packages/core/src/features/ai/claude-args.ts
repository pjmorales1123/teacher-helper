import { fileURLToPath } from 'node:url';
import type { Config } from '../../config.ts';
import { RESULT_SCHEMA } from './schema.ts';

const MCP_SERVER = fileURLToPath(new URL('../files/mcp-server.ts', import.meta.url));

/** Node flags for the file server: the same loader this process uses, with module names made absolute
 * because the CLI starts the server from the turn folder, where "tsx" would not resolve. */
export function loaderArgs(execArgv = process.execArgv): string[] {
  return execArgv.map((a, i) => (execArgv[i - 1] === '--import' && !a.startsWith('file:') && !a.startsWith('/') ? import.meta.resolve(a) : a));
}

/** Claude permission rules use "//" for absolute paths; Windows drives become "//c/...". */
export function readRule(folder: string): string {
  const unix = folder.replace(/\\/g, '/').replace(/^([A-Za-z]):/, (_, d: string) => `/${d.toLowerCase()}`);
  return `Read(/${unix.startsWith('/') ? unix : `/${unix}`}/**)`;
}

/**
 * Flags for one turn. The AI may only use: our two read-only file tools, and the built-in Read tool
 * inside the turn folder (page images) and the folders the teacher allowed, plus web search/fetch when the teacher
 * turned web research on. Everything else is denied.
 */
export function claudeArgs(cfg: Config, system: string, folders: string[], hasImages: boolean, web = false, cwd?: string): string[] {
  const args = [
    '-p', '--output-format', 'stream-json', '--verbose', '--include-partial-messages',
    '--setting-sources', '', '--strict-mcp-config', '--no-session-persistence',
    '--model', cfg.aiModel, '--system-prompt', system, '--json-schema', JSON.stringify(RESULT_SCHEMA),
  ];
  const canRead = folders.length > 0 || hasImages;
  const tools = [...(canRead ? ['Read'] : []), ...(web ? ['WebSearch', 'WebFetch'] : [])];
  args.push('--tools', tools.join(','));
  if (!tools.length) return args;
  // Web research (opt-in): search and read pages only; nothing is written or run.
  // The turn folder by relative and by absolute path: models sometimes read page images by their full path.
  const allow = [...(canRead ? ['Read(./**)', ...(cwd ? [readRule(cwd)] : []), ...folders.map(readRule)] : []), ...(web ? ['WebSearch', 'WebFetch'] : [])];
  if (folders.length) {
    const server = { type: 'stdio', command: process.execPath, args: [...loaderArgs(), MCP_SERVER], env: { GURO_READ_DIRS: JSON.stringify(folders) } };
    args.push('--mcp-config', JSON.stringify({ mcpServers: { files: server } }));
    allow.push('mcp__files__find_files', 'mcp__files__read_file');
  }
  args.push('--allowedTools', allow.join(','), '--permission-mode', 'dontAsk');
  return args;
}
