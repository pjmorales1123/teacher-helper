import type { DocKind } from '../documents/kinds.ts';

/** What the model may do per format: text "edits" (reviewed in the document) and structured "ops". */
export const FORMAT_GUIDE: Record<DocKind, string> = {
  docx: `The document is a Word file. Paragraphs are shown as "[ID] <StyleId> {list|align} text".
Tables are shown as [TABLE n] with one line per row and an id per cell, e.g. [T1.R2.C3] (table 1, row 2, column 3).
Fill or change a cell with a text edit whose target is the cell id (find = "" to fill an empty cell). "format" and
"paragraph" align also work on cell ids.
TEXT EDITS ("edits"): target = paragraph ID, find = exact substring (copy it exactly, keep it short but unique),
replace = new text. find = "" appends. To add NEW paragraphs after a paragraph use find = "" and start replace
with a newline; each further line is a new paragraph; start a line with {StyleId} to set its style.
OPS ("ops"), applied only after the teacher approves them:
- {"op":"style","target":ID,"styleId":"Heading1"} set a paragraph style (use only styles listed under STYLES).
- {"op":"format","target":ID,"find":"text","bold":true,"italic":..,"underline":..,"fontSize":12,"fontFamily":"Arial","color":"#1F4E79","highlight":"#FFFF00"}
  formats that text (omit find to format the whole paragraph).
- {"op":"paragraph","target":ID,"align":"left|center|right|justify","lineSpacing":1.15,"list":"bullet|numbered",
   "spaceBefore":6,"spaceAfter":6 (pt),"indent":0.5 (first-line, inches),"keepWithNext":true,"keepTogether":true,"pageBreakBefore":true}
  Pagination: keepWithNext keeps a heading or caption on the same page as what follows; keepTogether stops a paragraph splitting.
- {"op":"signatories","target":ID,"rows":[["Prepared by:","Checked by:"],["",""],["JUAN DELA CRUZ","MARIA SANTOS"],["Teacher III","Principal II"]]}
  Lays out signatories side by side AFTER the paragraph: one line per row, columns centered evenly across the page, names (ALL CAPS
  rows) bold, extra space above the names for signatures, and the whole block kept on one page. 1 to 4 columns. Use this for any
  "Prepared by / Checked by / Noted by / Approved by" block instead of a table.
- {"op":"image","target":ID,"path":"/full/path/logo.png","width":1.2,"align":"center","placement":"after|before"} inserts a picture
  from the teacher's folders in its own paragraph after (default) or before the target, so it never breaks other parts.
  width in inches (keeps proportions). A letterhead logo goes "before" the first paragraph.
  Add "side":"left|right" to float the picture at that side of the target paragraph with the text wrapping around it
  (good for a small photo beside a paragraph); then placement is ignored.
- {"op":"table","target":ID,"rows":[["Header 1","Header 2"],["a","b"]],"styleId":"<style for header cells, optional>"}
  inserts a table AFTER the paragraph. First row is the header.
- {"op":"delete","target":ID,"to":ID2} deletes paragraphs from target through to (to is optional).
- {"op":"pageSetup","paper":"A4|Letter|Legal","orientation":"portrait|landscape","margins":{"top":1,"bottom":1,"left":1,"right":1}} inches.
- {"op":"pageBreak","target":ID} page break after the paragraph.
Prefer styles over manual formatting: turn fake headings (bold Normal text) into Heading styles.
Images in the document show as [IMAGE] inside their paragraph; align or move them by working with that paragraph.`,
  xlsx: `The document is an Excel workbook. Each sheet is listed row by row as ADDRESS=value pairs; formulas show as
ADDRESS={formula}→result. Sheet index starts at 0.
TEXT EDITS ("edits"): target = "SheetIndex!A1", find = the cell's current display text ("" if empty), replace = what a user
would type (formulas start with "="). Never overwrite a formula with a plain number unless asked.
OPS ("ops"):
- {"op":"cells","target":"0!B2","rows":[["1","2"],["=SUM(B2:C2)","x"]]} fills a block starting at target (reviewed in the sheet).
- {"op":"style","target":"0!A1:G1","bold":true,"italic":..,"fontSize":11,"fontFamily":"Calibri","color":"#000000","fill":"#DDEBF7",
  "align":"left|center|right","valign":"top|middle|bottom","wrap":true,"border":"all|outer|inner|bottom|none"}
- {"op":"numberFormat","target":"0!F2:G9","numberFormat":"0.00"} (or "number","percent","currency","date", or a pattern).
- {"op":"columnWidth","target":"0!B:D","size":14} width in characters (names ~24-30, scores ~8-10). Widen columns whose text is cut off.
- {"op":"rowHeight","target":"0!1","size":30} height in points.
- {"op":"merge","target":"0!A1:G1"} merge a title across the table; {"op":"unmerge","target":"0!A1:G1"}.
- {"op":"insertRows","target":"0!5","count":2} inserts 2 empty rows ABOVE row 5; {"op":"deleteRows","target":"0!5:6"}.
- {"op":"insertColumns","target":"0!C","count":1} inserts before column C; {"op":"deleteColumns","target":"0!C:D"}.
  Formulas that refer to moved cells are updated automatically.
- {"op":"addSheet","text":"Quarter 2"}  - {"op":"renameSheet","target":"0","text":"Written Works"}
COLUMN WIDTHS and MERGED under each sheet show the current layout.
When a turn inserts or deletes rows or columns, everything in it is applied in the listed order after approval: put the
insert/delete first, then fill the new cells with "cells" ops using addresses as they will be AFTER the insert. Use no text edits then.`,
  pptx: `The document is a PowerPoint deck. Each text box is "[ID] (shape name, size at position, font, fits ~N chars) text" under its slide.
Lines inside a box are separated by " / ". Slide notes are shown as NOTES.
TEXT EDITS ("edits"): target = box ID, find = exact substring within ONE line, replace = new text (no line breaks).
OPS ("ops"):
- {"op":"bullets","target":ID,"lines":["line 1","line 2"]} replaces ALL lines of a box (use this to add, remove or reorder bullets).
- {"op":"format","target":ID,"find":"text","bold":true,"italic":..,"underline":..,"fontSize":24,"color":"#1F4E79","fontFamily":".."} (omit find for the whole box).
- {"op":"align","target":ID,"align":"left|center|right|justify"}
- {"op":"fill","target":ID,"fill":"#1F4E79"} shape background color.
- {"op":"notes","slide":3,"text":"speaker notes"} replaces the notes of slide 3.
- {"op":"duplicateSlide","slide":13,"rows":[["T6","Parts 2 and 3 · Reason and Evidence"],["T8","line 1","line 2"]]} inserts a copy of
  slide 13 right after it, then sets text in the COPY: each row is a box number from the original slide followed by its new lines.
  Boxes you do not list keep the original text, so list every box that must change.
- {"op":"deleteSlide","slide":5}  - {"op":"moveSlide","slide":5,"position":2}
- {"op":"resize","target":ID,"width":3.2,"height":0.5,"left":0.6,"top":1.4} inches; give only what changes. Widen a box instead of
  shrinking text below 18 pt when there is free space beside it (check other boxes' positions first).
- {"op":"image","slide":3,"path":"/full/path/flower.jpg","width":3,"left":6.5,"top":1.8} places a picture from the teacher's folders
  (keeps proportions; without left/top it is centered). Put it in empty space, never over text.
- {"op":"textBox","slide":3,"lines":["line 1","line 2"],"left":0.6,"top":5.2,"width":5,"height":0.8,"fontSize":20,"bold":true,
   "color":"#1F2937","align":"left","fill":"#FEF3C7"} adds a NEW text box (use "text" for one line). Place it in empty space.
- {"op":"shape","slide":3,"geometry":"rect|roundRect|ellipse|triangle|rightArrow|leftArrow|chevron|homePlate|star5|line",
   "left":1,"top":1,"width":2,"height":1,"fill":"#1F4E79"} adds a plain shape (accent bar, arrow, divider).
- {"op":"newSlide","position":4,"layout":"Title and Content","text":"Slide title","lines":["bullet 1","bullet 2"]} inserts a new
  slide so it becomes slide 4, using a layout from LAYOUTS, and fills its title and body.
- {"op":"deleteShape","target":ID} removes a box or picture.
All IDs and slide numbers always refer to the deck as shown (before any slide is added, moved or deleted).
Respect "fits ~N chars": never exceed it. Keep labels short.`,
};
