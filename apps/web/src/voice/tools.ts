import { Behavior, Type, type FunctionDeclaration } from '@google/genai';
import type { DocKind } from '../lib/types';

const KIND: Record<DocKind, string> = { docx: 'a Word document', xlsx: 'an Excel workbook (often a class record)', pptx: 'a PowerPoint deck' };

/**
 * The voice's tools. The voice only talks and decides; every real change is done by the editing agent
 * (Claude) behind edit_document, and shows up as suggestions the teacher approves.
 */
export function voiceTools(asyncCalls: boolean): FunctionDeclaration[] {
  const slow = asyncCalls ? { behavior: Behavior.NON_BLOCKING } : {};
  return [
    {
      name: 'edit_document', ...slow,
      description: 'Have the editing agent change the open document (text, formatting, tables, grades, slides, layout, pictures from the teacher\'s folders). '
        + 'Takes 10-40 seconds; keep talking with the teacher meanwhile. Changes appear as suggestions the teacher must approve.',
      parameters: {
        type: Type.OBJECT, required: ['request'],
        properties: { request: { type: Type.STRING, description: 'The full request in clear words, with every name, number and detail the teacher said, and what "it"/"that" refers to.' } },
      },
    },
    {
      name: 'read_document',
      description: 'Read the open document\'s current content (text, cells or slides) to answer a question or to understand what the teacher refers to.',
      parameters: { type: Type.OBJECT, properties: {} },
    },
    { name: 'apply_changes', description: 'Accept all suggestions and apply all changes waiting for approval. Only when the teacher clearly says yes / apply / accept / go ahead.', parameters: { type: Type.OBJECT, properties: {} } },
    { name: 'discard_changes', description: 'Reject all pending suggestions. Only when the teacher says no / undo that / discard.', parameters: { type: Type.OBJECT, properties: {} } },
    { name: 'check_result', ...slow, description: 'Look at the pages as rendered and fix layout problems from the last request.', parameters: { type: Type.OBJECT, properties: {} } },
    { name: 'save_document', description: 'Save the document (a new version).', parameters: { type: Type.OBJECT, properties: {} } },
  ];
}

export function voiceInstruction(kind: DocKind, name: string): string {
  return `You are Guro Buddy, a warm, efficient voice assistant for a Filipino public school teacher (DepEd).
The teacher has ${KIND[kind]} open: "${name}". Speak naturally and briefly (1-2 sentences), in the teacher's language:
English, Filipino or Taglish, matching them.
You cannot see or change the document yourself. Use the tools:
- edit_document for ANY change. Pass a complete, specific request. While it runs, keep the conversation going
  (confirm what you asked for, ask what is next). When the result arrives, say in one sentence what changed and
  that it is waiting for their OK, unless they already told you to apply.
- read_document before answering questions about the content.
- apply_changes only after a clear yes; discard_changes on a clear no.
For grades: repeat names and scores back briefly so the teacher can catch mistakes ("Cruz, Ana, 18, got it").
Never invent content the teacher did not ask for. If a request is unclear, ask one short question.`;
}
