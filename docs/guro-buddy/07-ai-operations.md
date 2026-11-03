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
| Word | Text fixes, new paragraphs (with styles), filling table cells | Paragraph style, bold/italic/underline/size/font/color/highlight on exact text (also inside table cells), alignment, line spacing, spacing before/after, first-line indent, lists, tables with content, delete paragraphs, page size/orientation/margins, page breaks, keep with next / keep lines together / start on new page, signatory blocks, pictures before or after a paragraph |
| Excel | Cell values and formulas, blocks of cells | Bold, fonts, colors, fills, alignment, wrap, borders, number formats |
| PowerPoint | Text, text formatting, alignment, shape fill, resizing or moving a box, speaker notes | Rewrite a box line by line (add or remove bullets), copy a slide with new text, move or delete slides, place a picture, new text boxes and shapes, new slides in the deck's own design, remove a box |
| Excel (structure) | | Column widths, row heights, merge/unmerge, insert/delete rows and columns, add/rename sheets. A turn that inserts or deletes rows runs as one ordered list after approval, so later addresses stay right |

The checklist has **Retry** for failed items. Applying settles suggestions the teacher already
accepted or rejected first, so a decided suggestion never blocks formatting.

## The view step (checking its own work)
After the teacher applies changes (or accepts all suggestions), the app renders what the teacher sees and sends the images
to the AI with the original request: Word page canvases (up to 20 pages, as ~1000 px JPEGs; each page is read once it stops changing, and
the canvas is looked up again because the editor replaces it after a picture is added), slides touched by the turn (painted
with the deck's own renderer, pictures included), or every sheet (up to 4). The AI compares them with the request and with professional layout
rules (nothing split across pages, text inside its box, pictures not covering text, consistent alignment). Fixes come back
through the same approval flow. "Check again" runs it on demand. The AI is told never to re-add something the document
context shows exists, so a rendering gap cannot cause duplicates.

Verified: it caught a Score column that was not centered, mixed font sizes and overflowing slide labels, and (before the
renderer drew pictures) a logo missing from the render, which led to fixing the renderer.

## Files on the teacher's computer
The backend runs on the teacher's computer, so the AI can open local files without uploads. The teacher ticks folders in the
**Files** panel (Documents, Desktop, Downloads, Pictures are suggested). Each turn the CLI gets:
- two read-only tools from our MCP server (`packages/core/src/features/files/mcp-server.ts`): `find_files` (name search,
  bounded walk) and `read_file` (Word, Excel, PowerPoint as text; CSV/text as is);
- the built-in Read tool limited by permission rules to those folders (PDFs, pictures) and the turn folder (page images);
- `--permission-mode dontAsk`, so anything else is denied. Verified: a file outside the allowed folders was refused.
Pictures for the image ops are served only from allowed folders (`/api/files/image`).

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
Word, PowerPoint and Excel run BetterOffice with `legacySyncApi` (in-thread). The default worker API cannot
set an exact selection in Word, add paragraphs and copy slides in PowerPoint, or change sheet structure in Excel
(Excel structure uses the workbook handle's raw op list: `setColWidth`, `mergeCells`, `insertRows`, ...). The sync API is
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

## More verified scenarios
- **Fill a table from a local file:** "Fill this table with the results in my Week 3 quiz results file" found and read
  `Week3 quiz results.docx` in Documents, filled scores and remarks, bolded the header, centered the score column (after the check).
- **Letterhead and signatories:** logo from Pictures centered above the title, three signatories in one row (labels, bold
  capitalized names, positions) kept together on one page, headings kept with the text after them.
- **Slides:** renamed pills widened to fit at 16 pt without covering text; a logo placed in an empty corner of slide 1.

## Verified after "make the not-possible possible" (Nov 2026)
- **Excel:** "insert 2 rows for a title merged across the table, bold 14 pt, widen the Learner column, add Zamora, Luis with
  the same formulas": rows inserted, A1:G1 merged and styled, column A 28 characters, new row with SUM/ROUND formulas,
  and the Summary sheet's ranges extended to row 12. Styling a merged range styles only the visible cell.
- **Slides:** a yellow note box and an accent bar on slide 2 and a new "Exit Ticket" slide copied from the deck's
  Title and Content design with 3 bullets. Engine quirk found: a new text color only shows live when written with a
  leading `#` (the saved file is the same either way).
- **Word:** a flower photo floated at the right of the first objective, 1.6" wide, text wrapping; the check saw it.

## Known limits
- Page setup is refused while a suggestion sits on the last paragraph of the document. The message
  asks the teacher to accept or reject it, then Retry.
- Word table header cells can take a paragraph style; per-cell shading is not wired yet.
- A copied slide keeps the original's speaker notes until the AI is asked to change them (new slides start empty).
- The view step sees at most 20 pages, 6 slides and 4 sheets per check.
- In development the file server starts through the `tsx` loader; the packaged app must ship it as a subcommand of the
  backend executable. In the browser version the folder picker is the app's own; the Tauri app can use the native one.
