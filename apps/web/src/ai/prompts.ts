import type { DocKind } from '../lib/types';

/** Starter prompts per format, tuned for DepEd teachers. */
export const QUICK_PROMPTS: Record<DocKind, string[]> = {
  docx: [
    'Fix spelling and grammar',
    'Check the objectives: are they specific and measurable (SMART)?',
    'Make the Lesson Proper simpler for Grade 6 learners',
    'Summarize this document in 3 bullet points',
  ],
  xlsx: [
    'Who has the lowest total? Who needs intervention?',
    'Fill the empty WW3 scores with 0 for now',
    'Explain how the PS column is computed',
    'Check the formulas for mistakes',
  ],
  pptx: [
    'Shorten the bullets on every slide',
    'Fix spelling and capitalization',
    'Suggest a better title for slide 1',
    'Translate the slide text to Filipino',
  ],
};
