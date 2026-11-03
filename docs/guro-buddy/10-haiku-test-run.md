# Haiku capability run (2026-11-03)

Everything on Claude Haiku through the CLI (`AI_MODEL=haiku`, `GURO_VOICE_MODEL=haiku`), spoken requests through the
voice path with the local Gemini Live mock (`scripts/mock-gemini-live.mjs`, `scripts/voice-scenario.cjs`): the mock
"hears" the request, calls `edit_document`, then `apply_changes` ("yes, apply it"); the app then runs the check.
Saved files were read back with python-docx / openpyxl / python-pptx.

| # | Start | Spoken request | Result |
|---|---|---|---|
| 1 | New Word | School memo from the principal about the Science Fair | Pass after fixes: Title, memo no. placeholder, TO/FROM/DATE/SUBJECT (caps), numbered paragraphs, standard closing. Missing: signature block |
| 2 | New Excel | Class record, 5 learners, WW1-3, PT1-2, exam, DO 015 weights | Pass after fixes: 20/50/30, PS/WS/IG formulas, full 41-row DO 015 transmutation sheet with LOOKUP |
| 3 | New PowerPoint | 4-slide water-cycle lesson | Pass after fix: title slide + 3 Title-and-Content slides. Bullets are saved but have no hanging indent |
| 4 | ILAW template (DO 016 Annex B) | Math 4, 1 x 60 min, dissimilar fractions | Pass: all parts, timings add to 60, correct answer key, `[VERIFY]` for competency/standards |
| 5 | Class-record template | Add WW4 (20) with 3 scores | Pass: column inserted, scores matched, total /80 and PS updated, Summary intact |
| 6 | Flower deck | Summary slide + dark-blue titles | Pass: copied design, 5 titles #1F4E79 |

## Problems the run found, all fixed
- Voice "apply" applied formatting before accepting the text, and the check looked before suggestions were accepted
  (it saw an empty sheet and rebuilt a class record on top of the first).
- Knowledge was matched on the document only; empty documents got no DepEd knowledge (memo format, DO 015 weights
  were missed). Now the request is matched too.
- Haiku shortens paragraph ids ("p0" for "body:p0"): exact-id fallbacks now accepted.
- New paragraphs with a numbered-list style were refused by the engine; they are now created plain and styled after.
- A table-cell fix had broken body paragraph inserts; fixed.
- A new sheet and its cells in one turn: cells were staged before the sheet existed; now applied in order.
- New slides in an empty deck copied the title slide (bullets in a subtitle box); now built as title + bulleted body.
- The check could not always open its page images; the turn folder is now also allowed by absolute path.

## What Haiku does well with the knowledge
Uses the DepEd structures, refuses to invent codes/standards/people (placeholders instead), checks its own arithmetic
in the review, keeps the teacher's template. Weaker: optional finishing parts (signature block, bold lead-ins) are
sometimes left for the check step.
