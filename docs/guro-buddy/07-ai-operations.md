# AI operations: formatting and structure, not just text

Status as of 2026-11-03. Verified end to end against the real `claude` CLI, with every saved
file reopened in python-docx, openpyxl and python-pptx.

## How a turn works
1. The editor sends a rich snapshot. Word: paragraphs with ids, styles and list marks, tables,
   the style catalog, page size and margins. Excel: cells with formulas. PowerPoint: every text box
   with its size, font size and an estimate of how many characters fit, plus speaker notes.
2. The CLI returns `reply`, text `edits`, and structured `ops` (JSON schema enforced).
   `packages/core/src/features/ai/ops-schema.ts` validates every op per format and drops bad ones
   with a reason the teacher can see.
3. Changes the engine can show as suggestions go into the document for review. Everything else
   waits in the chat as a checklist. Nothing is applied until the teacher approves it.

| Format | Shown as suggestions in the document | Approved from the chat checklist |
| - | - | - |
| Word | Text fixes, new paragraphs (with styles) | Paragraph style, bold/italic/underline/size/font/color/highlight on exact text, alignment, line spacing, lists, tables with content, delete paragraphs, page size/orientation/margins, page breaks |
| Excel | Cell values and formulas, blocks of cells | Bold, fonts, colors, fills, alignment, wrap, borders, number formats |
| PowerPoint | Text, text formatting, alignment, shape fill, speaker notes | Rewrite a box line by line (add or remove bullets), copy a slide with new text, move or delete slides |

The checklist has **Retry** for failed items. Applying settles suggestions the teacher already
accepted or rejected first, so a decided suggestion never blocks formatting.

## Knowledge the AI gets (`packages/core/skills/*.md`)
- **Lesson plans:** DepEd Order No. 016, s. 2026 (ILAW: Intentions, Learning Experience, Assessing
  Learning, Ways Forward), which replaces DO 42, s. 2016. The older DLL structure is kept for
  existing templates. MATATAG lesson exemplar parts.
- **Official documents:** DepEd Manual of Style (DO 30, s. 2019), Bookman Old Style and block format
  for letters per a 2022 reiteration memo. The point size is reported as 11 pt but needs confirming.
- **Research:** action research outline (DO 16, s. 2017), APA 7, never invent sources.
- **Slides:** fit text to the box, short labels, readable sizes, parallel titles, consistent terms,
  keep typed slide numbers correct after adding or removing slides.
- **Class records:** never overwrite formulas, 2 decimals, header styling, DO 015, s. 2026 weights
  from the project brief.
Teachers or schools can add their own `.md` files to that folder.

## Engine mode decision
Word and PowerPoint run BetterOffice with `legacySyncApi` (in-thread). The default worker API cannot
set an exact selection in Word or add paragraphs and copy slides in PowerPoint. The sync API is
deprecated and removed in 0.6, so the packages are pinned at 0.5.1. Revisit when 0.6 ships.
React StrictMode is off: its dev-only double mount left the Word command store bound to a discarded
editor.

## Verified scenarios (`scripts/scenario.cjs`)
- **Word lesson plan:** spelling fixes, A4 with 1" margins, justified 1.5-spaced paragraph, bold dark-blue
  phrase, a 4x4 rubric table filled in, a remark in body style. Saved file has no leftover revision marks.
- **Excel class record:** Remarks column with an IF formula on every row, bold filled centered header,
  borders on the table, 2-decimal PS and WS, original formulas intact.
- **Teacher's 29-slide English 9 deck:** fair yearly cost comparison, bold step titles, speaker notes
  on 3 slides, a new slide copied from slide 17's design, "n / 30" renumbered on every slide, a
  cross-reference updated, an extra exit-ticket line. 37 suggestions and 2 structural changes, none failed.

## Known limits
- Page setup is refused while a suggestion sits on the last paragraph of the document. The message
  asks the teacher to accept or reject it, then Retry.
- No column widths, merged cells or row insertion in Excel. No new text boxes or pictures in PowerPoint.
- Word table header cells can take a paragraph style; per-cell shading is not wired yet.
- A copied slide keeps the original's speaker notes until the AI is asked to change them.
