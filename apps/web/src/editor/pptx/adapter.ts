import type { PptxAsyncEditorApi } from '@betteroffice/pptx-react';
import type { AiEdit } from '../../lib/types';
import { clip, type EngineHandle, type ProposeReport } from '../engine';

type Ref = { current: PptxAsyncEditorApi | null };
interface Box { id: string; slide: number; storyId: string; text: string }

/** PowerPoint adapter: text boxes get short ids like "S2.T1"; edits become slide proposals shown on the canvas. */
export function createPptxHandle(ref: Ref): EngineHandle {
  const api = () => {
    if (!ref.current) throw new Error('The presentation is still loading.');
    return ref.current;
  };

  /** Deterministic ids: the same deck read twice gives the same ids. */
  async function boxes(): Promise<{ boxes: Box[]; titles: (string | null | undefined)[] }> {
    const access = await api().handleAsync();
    const read = await access.readContent();
    if (!read.ok) throw new Error('Could not read the slides.');
    const order = new Map(read.slides.map((s, i) => [s.id, i + 1]));
    const counters = new Map<number, number>();
    const list = read.stories.map((st) => {
      const slide = order.get(st.slideId) ?? 0;
      const n = (counters.get(slide) ?? 0) + 1;
      counters.set(slide, n);
      return { id: `S${slide}.T${n}`, slide, storyId: st.storyId, text: st.text };
    });
    return { boxes: list, titles: read.slides.map((s) => s.title) };
  }

  return {
    async snapshot() {
      const { boxes: list, titles } = await boxes();
      const lines = titles.map((t, i) => {
        const own = list.filter((b) => b.slide === i + 1).map((b) => `[${b.id}] ${b.text.replace(/\n/g, ' / ')}`);
        return `## Slide ${i + 1}${t ? `: ${t}` : ''}\n${own.join('\n') || '(no text)'}`;
      });
      return { context: clip(`Lines inside a text box are separated by " / " here. A find may not span two lines.\n\n${lines.join('\n\n')}`) };
    },

    async propose(edits: AiEdit[], turnId: string): Promise<ProposeReport> {
      const { boxes: list } = await boxes();
      const failed: ProposeReport['failed'] = [];
      const staged = [];
      for (const edit of edits) {
        const box = list.find((b) => b.id === edit.target);
        if (!box) { failed.push({ edit, reason: 'unknown text box' }); continue; }
        if (/[\r\n]/.test(edit.replace)) { failed.push({ edit, reason: 'new lines cannot be added to slides yet; add the line yourself' }); continue; }
        const find = edit.find.replace(/ \/ /g, '\n');
        const start = find ? box.text.indexOf(find) : box.text.length;
        if (start < 0) { failed.push({ edit, reason: 'text not found' }); continue; }
        staged.push({ type: 'replaceText' as const, storyId: box.storyId, start, end: start + find.length, text: edit.replace });
      }
      if (!staged.length) return { staged: 0, failed };
      const access = await api().handleAsync();
      await access.propose('guro-buddy', `AI turn ${turnId}`, staged);
      await api().refreshProposals();
      return { staged: staged.length, failed };
    },

    async decideAll(accept: boolean) {
      const access = await api().handleAsync();
      for (const prop of await access.listProposals()) {
        if (prop.agentId !== 'guro-buddy') continue;
        if (accept) await access.acceptProposal(prop.id, { force: true }); else await access.rejectProposal(prop.id);
      }
      await api().refreshProposals();
    },

    async save() {
      return api().save();
    },
  };
}
