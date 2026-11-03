"""Builds realistic sample files in samples/ for demos and tests.

Run: python3 scripts/make_samples.py
Needs python-docx, openpyxl and python-pptx (dev only, never shipped).
"""
from pathlib import Path
from docx import Document
from docx.shared import Pt
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill
from pptx import Presentation

OUT = Path(__file__).resolve().parent.parent / "apps" / "web" / "public" / "samples"
OUT.mkdir(exist_ok=True)


def lesson_plan():
    d = Document()
    d.add_heading("Daily Lesson Log: Science 6", 0)
    t = d.add_table(rows=3, cols=2)
    t.style = "Table Grid"
    for row, (k, v) in zip(t.rows, [("School", "San Isidro Elementary School"),
                                     ("Teacher", "Juan dela Cruz"),
                                     ("Quarter / Week", "Q2 / Week 3")]):
        row.cells[0].text, row.cells[1].text = k, v
    d.add_heading("I. Objectives", 1)
    for o in ["Describe teh parts of a flower and their functions.",
              "Explain how pollination leads to fertilization.",
              "Show apreciation for plants in the community."]:
        d.add_paragraph(o, style="List Number")
    d.add_heading("II. Content", 1)
    d.add_paragraph("Reproductive parts of flowering plants. Pollination and fertilization.")
    d.add_heading("III. Learning Resources", 1)
    d.add_paragraph("Science 6 Learner's Material, pp. 45-52. Real gumamela flowers, hand lens.")
    d.add_heading("IV. Procedures", 1)
    d.add_heading("A. Motivation", 2)
    p = d.add_paragraph("Show a gumamela flower. Ask: ")
    p.add_run("What do you think is the job of each part?").bold = True
    d.add_heading("B. Lesson Proper", 2)
    d.add_paragraph("The learners will be divided in to groups of five. Each group will dissect "
                    "a flower and label its parts using the activity sheet. The teacher will "
                    "go around to check the work of the learners and to answer there questions.")
    d.add_heading("C. Evaluation", 2)
    d.add_paragraph("Five-item quiz on the parts of a flower and their functions.")
    d.add_heading("V. Remarks", 1)
    d.add_paragraph("")
    for s in d.styles:
        if s.name == "Normal":
            s.font.size = Pt(11)
    d.save(OUT / "lesson-plan.docx")


def class_record():
    wb = Workbook()
    ws = wb.active
    ws.title = "Written Works"
    ws.append(["Learner", "WW1 (20)", "WW2 (20)", "WW3 (20)", "Total (60)", "PS", "WS (20%)"])
    names = ["Abad, Maria", "Bautista, Jose", "Cruz, Ana", "Dela Cruz, Juan",
             "Garcia, Liza", "Mendoza, Paolo", "Reyes, Carla", "Santos, Mark"]
    scores = [(18, 17, None), (15, 19, None), (20, 18, None), (12, 14, None),
              (17, 16, None), (19, 20, None), (14, 15, None), (16, 13, None)]
    for i, (n, s) in enumerate(zip(names, scores), start=2):
        ws.append([n, s[0], s[1], s[2]])
        ws[f"E{i}"] = f"=SUM(B{i}:D{i})"
        ws[f"F{i}"] = f"=ROUND(E{i}/60*100,2)"
        ws[f"G{i}"] = f"=ROUND(F{i}*0.2,2)"
    for c in ws[1]:
        c.font = Font(bold=True)
        c.fill = PatternFill("solid", fgColor="DDEBF7")
    ws.column_dimensions["A"].width = 20
    s = wb.create_sheet("Summary")
    s.append(["Item", "Value"])
    s.append(["Class average PS", "='Written Works'!F10"])
    s["B2"] = "=ROUND(AVERAGE('Written Works'!F2:F9),2)"
    s.append(["Highest total", "=MAX('Written Works'!E2:E9)"])
    wb.save(OUT / "class-record.xlsx")


def deck():
    p = Presentation()
    s = p.slides.add_slide(p.slide_layouts[0])
    s.shapes.title.text = "Parts of a Flower"
    s.placeholders[1].text = "Science 6, Quarter 2, Week 3"
    for title, bullets in [
        ("Male Parts", ["Stamen: anther and filament", "Anther makes pollen"]),
        ("Female Parts", ["Pistil: stigma, style, ovary", "Ovary becomes the fruit"]),
        ("Pollination", ["Pollen moves from anther to stigma", "Helped by insects, wind and water"]),
    ]:
        sl = p.slides.add_slide(p.slide_layouts[1])
        sl.shapes.title.text = title
        tf = sl.placeholders[1].text_frame
        tf.text = bullets[0]
        for b in bullets[1:]:
            tf.add_paragraph().text = b
    p.save(OUT / "flower-lesson.pptx")


if __name__ == "__main__":
    lesson_plan(); class_record(); deck()
    print("wrote", sorted(x.name for x in OUT.iterdir()))
