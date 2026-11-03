import type { PptxEditorApi } from '@betteroffice/pptx-react';
import type { AiResult } from '../../lib/types';
import { clip, runEach, type EngineHandle, type ProposeReport } from '../engine';
import { deckContext, EMU_PER_IN, readDeck } from './deck';
import { addPicture, runPptxChange } from './ops';
import { BOX_OPS, runBoxChange } from './boxes';
import { planPptx, type SlideChange } from './plan';
import { renderSlides } from './render';

type Ref = { current: PptxEditorApi | null };
const AGENT = 'guro-buddy';

/** PowerPoint adapter on the in-thread engine: text and formatting are canvas proposals; structure waits for approval. */
export function createPptxHandle(ref: Ref): EngineHandle {
  const api = () => {
    if (!ref.current) throw new Error('The presentation is still loading.');
    return ref.current;
  };
  const changes = new Map<string, SlideChange>();
  let touched: number[] = [];

  return {
    async snapshot() {
      const snap = api().handle.snapshot();
      const layouts = [...new Set(api().handle.layouts().map((l) => l.name).filter((n): n is string => !!n))];
      const ctx = deckContext(readDeck(api().handle), [snap.widthEmu / EMU_PER_IN, snap.heightEmu / EMU_PER_IN], layouts);
      return { context: clip(`A box's "fits ~N chars" is an estimate at its current font size.\n\n${ctx}`) };
    },

    async propose(result: AiResult, turnId: string): Promise<ProposeReport> {
      const h = api().handle;
      const plan = planPptx(result, readDeck(h), turnId);
      // Slides this turn changes, for the view step (a copied slide lands right after its source).
      const ids = [...result.edits.map((e) => e.target), ...result.ops.map((o) => o.target ?? (o.slide ? `S${o.slide}.` : ''))];
      touched = [...new Set(ids.map((t) => Number(/^S(\d+)\./.exec(t)?.[1] ?? 0)).filter(Boolean)
        .concat(result.ops.filter((o) => o.op === 'duplicateSlide').map((o) => (o.slide ?? 0) + 1))
        .concat(result.ops.filter((o) => o.op === 'newSlide').map((o) => o.position ?? 0)))].sort((a, b) => a - b);
      const failed = [...plan.failed];
      let staged = 0;
      if (plan.proposals.length) {
        try {
          h.propose(AGENT, `AI turn ${turnId}`, plan.proposals.map((p) => p.edit));
          staged = plan.proposals.length;
        } catch {
          // One bad edit refuses the whole group: retry one by one so the good ones still land.
          for (const p of plan.proposals) {
            try { h.propose(AGENT, `AI turn ${turnId}`, [p.edit]); staged += 1; } catch (e) { failed.push({ label: p.label, reason: (e as Error).message }); }
          }
        }
        api().refreshProposals();
        await api().commands.execute('proposalsPanel', { open: true }).catch(() => undefined);
      }
      plan.pending.forEach((c) => changes.set(c.id, c));
      return { staged, pending: plan.pending, failed };
    },

    async applyPending(list) {
      const h = api().handle;
      // Structure last: text rewrites first, then copies, moves and deletes.
      const rank = (op: string) => ['bullets', 'deleteShape', 'image', 'textBox', 'shape', 'duplicateSlide', 'moveSlide', 'deleteSlide', 'newSlide'].indexOf(op);
      const ordered = [...list].sort((a, b) => rank(a.op.op) - rank(b.op.op));
      const report = await runEach(ordered, async (op) => {
        const c = [...changes.values()].find((x) => x.op === op);
        if (!c) throw new Error('This change is out of date. Ask again.');
        if (c.op.op === 'image') await addPicture(h, c);
        else if (BOX_OPS.has(c.op.op)) runBoxChange(h, c);
        else runPptxChange(h, c);
      });
      api().refresh();
      return report;
    },

    render: async () => renderSlides(api().handle, touched),

    async decideAll(accept: boolean) {
      const h = api().handle;
      for (const p of h.listProposals()) {
        if (p.agentId !== AGENT) continue;
        if (accept) h.acceptProposal(p.id, { force: true }); else h.rejectProposal(p.id);
      }
      api().refreshProposals();
      api().refresh();
    },

    async save() {
      return api().save();
    },
  };
}
