import { spawn } from 'node:child_process';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { Config } from '../../config.ts';
import { createClaudeStreamParser } from './claude-stream.ts';
import { RESULT_SCHEMA } from './schema.ts';
import type { AiEvent } from './types.ts';

export interface CliRun { system: string; message: string; emit: (e: AiEvent) => void; signal: AbortSignal }
export interface CliOutput { structured: unknown; text: string; isError: boolean; costUsd?: number }

/** Runs one turn through the teacher's logged-in CLI. No API key is ever used. */
export async function runCli(cfg: Config, run: CliRun): Promise<CliOutput> {
  // An empty working dir keeps project files and CLAUDE.md out of the AI's context.
  const cwd = join(cfg.dataDir, 'ai-workdir');
  await mkdir(cwd, { recursive: true });
  return cfg.aiBackend === 'codex' ? runCodex(cfg, cwd, run) : runClaude(cfg, cwd, run);
}

function runClaude(cfg: Config, cwd: string, run: CliRun): Promise<CliOutput> {
  const args = [
    '-p', '--output-format', 'stream-json', '--verbose', '--include-partial-messages',
    '--tools', '', '--setting-sources', '', '--strict-mcp-config', '--no-session-persistence',
    '--model', cfg.aiModel, '--system-prompt', run.system, '--json-schema', JSON.stringify(RESULT_SCHEMA),
  ];
  const parser = createClaudeStreamParser(run.emit);
  return spawnLines('claude', args, cwd, run, parser.line).then(({ stderr }) => {
    const f = parser.final();
    if (!f) throw new Error(stderr.trim().split('\n').pop() || 'Claude ended without a result.');
    return f;
  });
}

/** Best-effort Codex adapter: `codex exec` with an output schema file. Untested without codex installed. */
async function runCodex(cfg: Config, cwd: string, run: CliRun): Promise<CliOutput> {
  const tmp = await mkdtemp(join(cwd, 'codex-'));
  try {
    const schema = join(tmp, 'schema.json');
    const out = join(tmp, 'last.json');
    await writeFile(schema, JSON.stringify(RESULT_SCHEMA));
    const args = ['exec', '--skip-git-repo-check', '--sandbox', 'read-only', '--output-schema', schema, '--output-last-message', out, '-'];
    run.emit({ type: 'status', text: 'Codex is working…' });
    await spawnLines('codex', args, cwd, { ...run, message: `${run.system}\n\n${run.message}` }, () => {});
    const text = await readFile(out, 'utf8');
    return { structured: JSON.parse(text), text, isError: false };
  } finally {
    await rm(tmp, { recursive: true, force: true });
  }
}

function spawnLines(
  cmd: string, args: string[], cwd: string, run: CliRun, onLine: (l: string) => void,
): Promise<{ stderr: string }> {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { cwd, stdio: ['pipe', 'pipe', 'pipe'] });
    let stderr = '';
    let pending = '';
    const abort = () => child.kill('SIGINT');
    run.signal.addEventListener('abort', abort, { once: true });
    child.stdout.setEncoding('utf8').on('data', (chunk: string) => {
      pending += chunk;
      const lines = pending.split('\n');
      pending = lines.pop() ?? '';
      lines.forEach(onLine);
    });
    child.stderr.setEncoding('utf8').on('data', (c: string) => { stderr = (stderr + c).slice(-4000); });
    child.on('error', (err: NodeJS.ErrnoException) => reject(
      err.code === 'ENOENT' ? new Error(`The "${cmd}" command was not found. Install it and log in first.`) : err,
    ));
    child.on('close', (code) => {
      run.signal.removeEventListener('abort', abort);
      if (pending) onLine(pending);
      if (run.signal.aborted) return reject(new Error('Cancelled.'));
      if (code !== 0 && cmd === 'codex') return reject(new Error(stderr.trim() || `codex exited with ${code}`));
      resolve({ stderr });
    });
    child.stdin.end(run.message);
  });
}
