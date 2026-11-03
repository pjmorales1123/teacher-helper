import type { FastifyInstance } from 'fastify';
import type { Config } from '../../config.ts';
import type { DocumentStore } from '../documents/store.ts';
import { runCli } from './cli.ts';
import type { History } from './history.ts';
import { systemPrompt, userMessage } from './prompt.ts';
import { normalizeResult } from './schema.ts';
import type { AiEvent, AiTurnRequest } from './types.ts';

const MAX_CONTEXT = 600_000;
let running = 0;
const MAX_PARALLEL = 2;

/** POST /api/ai/turn streams Server-Sent Events: status, delta, then done or error. */
export function aiRoutes(app: FastifyInstance, cfg: Config, store: DocumentStore, history: History) {
  app.get<{ Params: { id: string } }>('/api/documents/:id/messages', async (req) => history.list(req.params.id));
  app.delete<{ Params: { id: string } }>('/api/documents/:id/messages', async (req, reply) => {
    history.clear(req.params.id);
    return reply.code(204).send();
  });

  app.post<{ Body: AiTurnRequest }>('/api/ai/turn', async (req, reply) => {
    const body = req.body;
    const doc = typeof body?.docId === 'string' ? store.get(body.docId) : undefined;
    if (!doc) return reply.code(404).send({ error: 'Document not found.' });
    if (typeof body.prompt !== 'string' || !body.prompt.trim()) return reply.code(400).send({ error: 'Type a request first.' });
    if (typeof body.context !== 'string') return reply.code(400).send({ error: 'Missing document context.' });
    if (running >= MAX_PARALLEL) return reply.code(429).send({ error: 'Another AI request is still running. Try again in a moment.' });

    const turn: AiTurnRequest = {
      ...body, kind: doc.kind, mode: body.mode === 'ask' ? 'ask' : 'edit',
      prompt: body.prompt.slice(0, 4000), context: body.context.slice(0, MAX_CONTEXT),
      selection: typeof body.selection === 'string' ? body.selection.slice(0, 8000) : undefined,
    };
    const recent = history.recent(doc.id);

    reply.hijack();
    const res = reply.raw;
    res.writeHead(200, { 'content-type': 'text/event-stream', 'cache-control': 'no-store', connection: 'keep-alive' });
    const send = (e: AiEvent) => { if (!res.writableEnded) res.write(`data: ${JSON.stringify(e)}\n\n`); };

    const ctrl = new AbortController();
    res.on('close', () => { if (!res.writableFinished) ctrl.abort(); });
    const timer = setTimeout(() => ctrl.abort(), cfg.aiTimeoutMs);
    const started = Date.now();
    running++;
    try {
      send({ type: 'status', text: 'Reading your document…' });
      const out = await runCli(cfg, { system: systemPrompt(doc.kind, turn.mode), message: userMessage(turn, recent), emit: send, signal: ctrl.signal });
      const result = out.isError ? null : normalizeResult(out.structured, turn.mode, doc.kind);
      if (!result) throw new Error(friendly(out.text));
      history.add(doc.id, 'user', turn.prompt);
      history.add(doc.id, 'assistant', result.reply, result.edits);
      send({ type: 'done', result, costUsd: out.costUsd, ms: Date.now() - started });
    } catch (err) {
      send({ type: 'error', message: ctrl.signal.aborted && Date.now() - started >= cfg.aiTimeoutMs ? 'The AI took too long. Try a smaller request.' : (err as Error).message });
    } finally {
      clearTimeout(timer);
      running--;
      res.end();
    }
  });
}

/** Maps raw CLI failures to messages a teacher can act on. */
function friendly(text: string): string {
  const t = text.toLowerCase();
  if (t.includes('login') || t.includes('authenticat') || t.includes('/login')) return 'Claude is not logged in. Open a terminal, run "claude", and log in.';
  if (t.includes('limit')) return `Your Claude plan's usage limit was reached. ${text}`;
  return text || 'The AI did not return a usable answer. Try again.';
}
