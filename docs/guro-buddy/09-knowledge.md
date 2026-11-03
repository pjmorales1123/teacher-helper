# What the AI knows: the knowledge layer

The teacher's file gives the format. The AI still has to know what goes where, which facts are official, and when
to stop and leave a placeholder. No model is trained on DepEd specifics (codes, new orders, division formats); that
comes from this layer, from the teacher's own files, and optionally from web search.

## Where facts come from (in this order, enforced in `skills/content-accuracy.md`)
1. The document and the request.
2. The teacher's allowed folders: curriculum guides, budget of work, LMs, division templates (best source of
   competencies and codes).
3. Knowledge files (below).
4. Web search, if the teacher ticks it in the Files panel: official sites first, sources named in the reply.
Otherwise a visible placeholder: `[VERIFY: ...]`, `[TG pp. __]`, `[DATA: ...]`, `[CITATION NEEDED: ...]`.

## Knowledge files
| Folder | What | Loaded |
|---|---|---|
| `packages/core/skills/*.md` | Guides: content accuracy, DepEd formatting, lesson plans (DO 016 ILAW, DLL/DLP), grading (DO 015 tables), class records, school forms, tests/TOS, letters/memos, proposals/reports/minutes, certificates, action research, worksheets/parent letters, slides | Files without `match:` always for their formats; up to 3 matching guides |
| `packages/core/knowledge/format-specs/*.md` | 22 per-document specs from the Homeroom format research (ILAW, test + TOS, LAC plan/report/reflection, activity proposal, narrative/accomplishment reports, incident, referral, home visit, HPTA minutes, IRIP, SIM, rubric, quiz sheet, action plan, project work plan, ...) | The single best match |

Matching reads the file name and the first ~6000 characters of the document. The prompt says which type was
recognized ("This document looks like: ...") or that none was (then the AI follows the document's own structure).

### Adding or correcting knowledge (no code)
Create or edit a `.md` file in `packages/core/skills/`:
```
---
kinds: docx            # docx, xlsx, pptx (comma-separated)
title: Pupil's Daily Log (division format)
match: daily log|pupil'?s log    # regex, case-insensitive; omit to always load for these kinds
source: SDO Tarlac Memo No. __, s. 2026     # shown to the AI so it can cite it
---
# What goes in each part
...
# How to work on it
1. ...
```
Keep each file short and concrete: parts in order, what goes in each, rules, and "never invent". Mark unverified
items as such. Run `npm test` (the knowledge tests check every file parses and is recognized).

### Refreshing the Homeroom specs
```
node scripts/import-format-specs.mjs ../homeroom/docs/format-specs
```
New specs need a line in the script's `MAP` (formats and recognition words).

## Model choice
Homeroom's live tests (2026-11-02) found Haiku 5.5 adequate for ILAW at medium effort and about 24 times cheaper;
Sonnet 5.5 wrote clearly better plans. Here: typed requests use `AI_MODEL` (sonnet by default), voice uses
`GURO_VOICE_MODEL` (haiku). Knowledge matters more than the model for correctness: with the knowledge layer, Haiku
left placeholders for the competency instead of inventing one.

## Verified (2026-11-03, Haiku via the CLI)
- Blank DO 016 Annex B ILAW template, "2 sessions of 50 minutes on parts of a flower, visual learners, some below
  grade level": 41 suggestions, all parts aligned, three objectives per session (cognitive/affective/psychomotor),
  timed flow, low-cost resources with a backup, answer keys, Reflections left blank, competency/standards as
  `[VERIFY]`, DO 003 AI-use reminder. The check step found the minutes added to 45, not 50, and fixed it.
- With web on, asked to fill the official MATATAG competency: it rejected a third-party PDF and an old K-12 code,
  named the DepEd pages it found, and kept the placeholders because the official pages would not open. deped.gov.ph
  often blocks automated downloads (Homeroom saw 403s too), so curriculum guides in the teacher's folders are the
  dependable source.
- Engine fix found on the way: multi-line text into a Word table cell now adds the lines inside the cell.
