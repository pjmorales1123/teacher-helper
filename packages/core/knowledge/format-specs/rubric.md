---
kinds: docx, xlsx
title: Performance Rubric (format spec)
match: rubric|criteria|performance level|scoring guide
source: Homeroom format spec, status adapted; basis: The one-page landscape sheet already built and approved in src/features/ai-tools/rubric-layout.ts, rubric-file.ts and rubric-prompt.ts. DO 8 s.2015 sets the performance-task idea only; no official rubric layout exists (research section "Assessment formats"). This file documents what is built; do not redesign it.
---
> Imported from the Homeroom format research (status: adapted). Written for that app: where it says the content
> comes from "Code", the "Profile", a "picker" or the "Teacher", in Guro Buddy it comes from the teacher or the open
> document: keep what is there, never invent it, leave a placeholder. Its page setup applies only when the document
> has no format of its own: the teacher's format always wins. Its "free checks" are what to verify before replying.

# Performance Rubric: how to write it

## What it is and when a teacher uses it
A scoring guide for one performance task: what the learner makes or does, the quality levels, and the points. The teacher hands it to learners before the task and scores with it after.

## Page setup
A4 landscape, one page, Arial. Plain or designed look (teacher's choice).

## Parts, in order

| Part | What goes in it | Who supplies it | Length and style |
|---|---|---|---|
| Info block | Learner, Section, Date, Teacher lines | Blank lines | Never filled |
| Competency | The competency being assessed | Curriculum picker or teacher; code prints | Exact text |
| Task | What learners do | Teacher's own task text; code prints | As given |
| What to hand in | The output | Teacher's own text; code prints | As given |
| Level table | Rows = criteria; columns = levels, highest first, level names in the header; Points per row | AI writes criteria and level descriptors; code allocates points | 3-5 criteria; 3-5 levels |
| Remarks, Score, TOTAL | Teacher fills after scoring | Blank; code prints the total points | Blank |

## How to fill each part
- **Criteria.** Short quality names, not task parts. Good: "Accuracy", "Clarity", "Neatness". Bad: "Step 1 of the poster".
- **Level descriptors.** Observable, differ only in degree. Good: "Poster shows all five parts with correct labels." / "Shows four parts with one wrong label." Bad: "Good" and "Better".
- **Learner line.** One simple sentence per level in the learner's reading level, introduced by the marker the prompt names; the parser accepts wording variants ("In simple words:", "Learner version:").
- **Lowest level.** Never credits off-task work.

## Writing rules
- Teacher's language (Filipino detected by code and passed to the model).
- Same wording pattern across levels; one idea per cell.
- Points and weights are code-owned; the model never writes totals.

## Free checks code can run
- Every criterion has a descriptor for every level.
- Level points strictly descending; row points sum to the stated total; weights sum to 100.
- Descriptors unique across levels.
- 3 to 5 criteria within the available points.

## AI must never write
- Scores, totals, weights or any arithmetic.
- Learner names or grades.
- Invented task instructions (the task text is the teacher's own).

## Sample (fictional, for style only)
**Competency:** Make a poster that shows how to reduce waste. **Task:** Make a poster for the school. **Hand in:** One poster.

| Criteria | Excellent (4) | Proficient (3) | Developing (2) | Beginning (1) | Points |
|---|---|---|---|---|---|
| Content | Shows five correct ways to reduce waste | Shows four correct ways | Shows two or three ways | Shows one way or unrelated ideas | 20 |
| Clarity | Message is clear at a glance | Message is clear with some effort | Message is hard to find | No clear message | 20 |
| Neatness | Clean and well arranged | Mostly clean | Some marks or crowding | Messy and hard to read | 10 |

TOTAL: ____ / 50. Remarks: ________

## Open points
- Weights field on the form is not built (weights typed in notes give an equal split).
- Sheet labels are English even for Filipino rubrics; a native speaker must check any translation.
- Total points and level count are fixed values in code.
