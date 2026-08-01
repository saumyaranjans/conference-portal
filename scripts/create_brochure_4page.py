"""Generate the four-page GLOGIFT 2027 brochure with a pure cover."""

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import mm
from reportlab.platypus import (
    BaseDocTemplate, Frame, PageTemplate, Paragraph, Spacer, Table, TableStyle,
    PageBreak, NextPageTemplate, HRFlowable, KeepTogether,
)

from create_brochure import (
    ROOT, PUBLIC, PAGE_W, PAGE_H, MARGIN, NAVY, BLUE, GOLD, CORAL,
    INK, MUTED, PALE, BODY, BOLD, DISPLAY, header_footer, img,
)

OUT = ROOT / "output" / "pdf" / "glogift-2027-call-for-submissions-brochure.pdf"


def cover_background(canvas, doc):
    canvas.saveState()
    canvas.setFillColor(NAVY)
    canvas.rect(0, 0, PAGE_W, PAGE_H, fill=1, stroke=0)
    canvas.setFillColor(colors.HexColor("#0F3E82"))
    canvas.circle(PAGE_W + 15 * mm, PAGE_H - 45 * mm, 58 * mm, fill=1, stroke=0)
    canvas.circle(-12 * mm, 52 * mm, 45 * mm, fill=1, stroke=0)
    canvas.setStrokeColor(GOLD)
    canvas.setLineWidth(1)
    for offset in range(0, 60, 10):
        canvas.line(0, (28 + offset) * mm, (52 + offset) * mm, 0)
        canvas.line(PAGE_W, PAGE_H - (18 + offset) * mm,
                    PAGE_W - (48 + offset) * mm, PAGE_H)
    canvas.setFillColor(GOLD)
    canvas.rect(0, 0, PAGE_W, 5 * mm, fill=1, stroke=0)
    canvas.restoreState()


def title(text, kicker):
    return [
        Paragraph(kicker.upper(), ParagraphStyle(
            "kicker", fontName=BOLD, fontSize=8.5, leading=10,
            textColor=CORAL, spaceAfter=1.5 * mm)),
        Paragraph(text, ParagraphStyle(
            "title", fontName=DISPLAY, fontSize=21, leading=24,
            textColor=NAVY, spaceAfter=2.5 * mm)),
        HRFlowable(width="100%", thickness=1.1, color=GOLD, spaceAfter=3 * mm),
    ]


def p(text, size=9, leading=11.5, after=1.8 * mm, color=INK, align=0):
    return Paragraph(text, ParagraphStyle(
        "p", fontName=BODY, fontSize=size, leading=leading,
        textColor=color, spaceAfter=after, alignment=align))


def section(text):
    return Paragraph(text, ParagraphStyle(
        "section", fontName=BOLD, fontSize=11, leading=12.5,
        textColor=BLUE, spaceBefore=1.5 * mm, spaceAfter=1.5 * mm))


def box(title_text, body, width=50 * mm, bg=PALE):
    t = Table([
        [Paragraph(title_text, ParagraphStyle(
            "box-h", fontName=BOLD, fontSize=8.8, leading=10.2, textColor=NAVY))],
        [Paragraph(body, ParagraphStyle(
            "box-p", fontName=BODY, fontSize=8, leading=10, textColor=INK))],
    ], colWidths=[width])
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), bg),
        ("BOX", (0, 0), (-1, -1), .6, colors.HexColor("#C7D2E1")),
        ("LINEBEFORE", (0, 0), (0, -1), 2.5, GOLD),
        ("LEFTPADDING", (0, 0), (-1, -1), 3 * mm),
        ("RIGHTPADDING", (0, 0), (-1, -1), 3 * mm),
        ("TOPPADDING", (0, 0), (-1, -1), 2.2 * mm),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 2.2 * mm),
    ]))
    return t


def fee_table(title_text, data):
    hs = ParagraphStyle("fh", fontName=BOLD, fontSize=7.5, leading=9, textColor=colors.white)
    cs = ParagraphStyle("fc", fontName=BODY, fontSize=7.5, leading=9, textColor=INK)
    rows = [[Paragraph(str(v).replace("\n", "<br/>"), hs if r == 0 else cs)
             for v in row] for r, row in enumerate(data)]
    t = Table(rows, colWidths=[57 * mm, 35 * mm, 35 * mm, 35 * mm],
              rowHeights=[11 * mm] + [9.5 * mm] * 4)
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), NAVY),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, PALE]),
        ("GRID", (0, 0), (-1, -1), .5, colors.HexColor("#BBC8DA")),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("ALIGN", (1, 0), (-1, -1), "CENTER"),
        ("LEFTPADDING", (0, 0), (-1, -1), 2.5 * mm),
    ]))
    return KeepTogether([section(title_text), t])


def cover_story():
    logo_band = Table([[img(PUBLIC / "glogift-logo.png", 31 * mm, 21 * mm),
                        img(PUBLIC / "iim-sambalpur.png", 112 * mm, 19 * mm)]],
                      colWidths=[38 * mm, 120 * mm])
    logo_band.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), colors.white),
        ("BOX", (0, 0), (-1, -1), .8, GOLD),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("LEFTPADDING", (0, 0), (-1, -1), 4 * mm),
        ("RIGHTPADDING", (0, 0), (-1, -1), 4 * mm),
        ("TOPPADDING", (0, 0), (-1, -1), 3 * mm),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 3 * mm),
    ]))
    return [
        Spacer(1, 9 * mm), logo_band, Spacer(1, 25 * mm),
        Paragraph("GLOGIFT 2027", ParagraphStyle(
            "cover-name", fontName=DISPLAY, fontSize=39, leading=44,
            textColor=colors.white, alignment=TA_CENTER, spaceAfter=5 * mm)),
        Paragraph("INTERNATIONAL CONFERENCE ON", ParagraphStyle(
            "cover-k", fontName=BOLD, fontSize=10.5, leading=13,
            tracking=2, textColor=GOLD, alignment=TA_CENTER, spaceAfter=5 * mm)),
        Paragraph("AI-Driven Solutions<br/>in Management", ParagraphStyle(
            "cover-title", fontName=DISPLAY, fontSize=31, leading=36,
            textColor=colors.white, alignment=TA_CENTER, spaceAfter=7 * mm)),
        Table([[Paragraph("Flexibility, Digitalisation &amp; Decarbonization",
                          ParagraphStyle("cover-theme", fontName=DISPLAY, fontSize=15,
                                         leading=18, textColor=NAVY,
                                         alignment=TA_CENTER))]], colWidths=[145 * mm],
              style=[("BACKGROUND", (0, 0), (-1, -1), GOLD),
                     ("BOX", (0, 0), (-1, -1), .8, colors.white),
                     ("TOPPADDING", (0, 0), (-1, -1), 4 * mm),
                     ("BOTTOMPADDING", (0, 0), (-1, -1), 4 * mm)],
              hAlign="CENTER"),
        Spacer(1, 18 * mm),
        Paragraph("25-27 FEBRUARY 2027", ParagraphStyle(
            "cover-date", fontName=DISPLAY, fontSize=23, leading=27,
            textColor=colors.white, alignment=TA_CENTER, spaceAfter=4 * mm)),
        Paragraph("IIM Sambalpur, Odisha, India", ParagraphStyle(
            "cover-place", fontName=BOLD, fontSize=13, leading=16,
            textColor=colors.white, alignment=TA_CENTER, spaceAfter=2 * mm)),
        Paragraph("In-Person | Hybrid", ParagraphStyle(
            "cover-format", fontName=BODY, fontSize=10.5, leading=13,
            textColor=GOLD, alignment=TA_CENTER)),
        Spacer(1, 17 * mm),
        Paragraph("CALL FOR SUBMISSIONS", ParagraphStyle(
            "cover-call", fontName=BOLD, fontSize=10.5, leading=13,
            tracking=1.5, textColor=GOLD, alignment=TA_CENTER,
            spaceAfter=5 * mm)),
        Paragraph("glogift2027.in", ParagraphStyle(
            "cover-web", fontName=BOLD, fontSize=12, leading=14,
            textColor=colors.white, alignment=TA_CENTER)),
    ]


def story():
    s = cover_story() + [NextPageTemplate("content"), PageBreak()]

    # Page 2 - overview, tracks and publication value
    s += title("Conference overview", "AI, adaptability and sustainability")
    s.append(p("GLOGIFT 2027 brings academicians, researchers, practitioners, policymakers, "
               "entrepreneurs and students together to explore how AI can strengthen flexible, "
               "competitive and sustainable management."))
    s.append(Table([[box("FLEXIBILITY", "Adapt and reconfigure amid uncertainty", 50 * mm),
                     box("DIGITALISATION", "Embed intelligence in core operations", 50 * mm),
                     box("DECARBONIZATION", "Align growth with climate responsibility", 50 * mm)]],
                   colWidths=[55 * mm] * 3,
                   style=[("VALIGN", (0, 0), (-1, -1), "TOP"),
                          ("LEFTPADDING", (0, 0), (-1, -1), 2.5 * mm),
                          ("RIGHTPADDING", (0, 0), (-1, -1), 2.5 * mm)]))
    s += [Spacer(1, 3 * mm), section("TEN CONFERENCE TRACKS")]
    tracks = [
        ("01", "AI in Finance, Accounting, FinTech & Digital Assets"),
        ("02", "AI for Operations, Supply Chain & Industry 5.0"),
        ("03", "Digital Transformation & Intelligent Business"),
        ("04", "Sustainable Finance & Decarbonization"),
        ("05", "AI in Marketing"),
        ("06", "Governance, Ethics & Responsible AI"),
        ("07", "Analytics, Big Data & Intelligent Systems"),
        ("08", "Human Capital & Leadership"),
        ("09", "Strategy, Innovation & Emerging Business Models"),
        ("10", "Inclusive Growth & Global Transformation"),
    ]
    rows = []
    for i in range(0, 10, 2):
        row = []
        for n, name in tracks[i:i + 2]:
            row += [Paragraph(n, ParagraphStyle("tn", fontName=BOLD, fontSize=9.5,
                                                 textColor=CORAL, alignment=TA_CENTER)),
                    p(name, 8.2, 10, 0)]
        rows.append(row)
    tt = Table(rows, colWidths=[10 * mm, 71 * mm, 10 * mm, 71 * mm],
               rowHeights=[18 * mm] * 5)
    tt.setStyle(TableStyle([
        ("GRID", (0, 0), (-1, -1), .5, colors.HexColor("#CBD6E5")),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("LEFTPADDING", (0, 0), (-1, -1), 2.5 * mm),
        ("RIGHTPADDING", (0, 0), (-1, -1), 2.5 * mm),
    ]))
    s += [tt, Spacer(1, 3 * mm), section("PUBLICATION OPPORTUNITIES")]
    s.append(p("<b>Selected papers considered for Springer journals (ABDC listed) and the Springer Scopus-indexed Book Series.</b> "
               "All accepted and presented papers appear in the Conference Proceedings with ISBN."))
    pubs = [
        [img(PUBLIC / "journals" / "gjfsm.jpg", 16 * mm, 20 * mm),
         p("<b>Global Journal of Flexible Systems Management</b><br/>Springer | ABDC-A", 7.6, 9, 0)],
        [img(PUBLIC / "journals" / "ijgbc.jpg", 16 * mm, 20 * mm),
         p("<b>International Journal of Global Business &amp; Competitiveness</b><br/>Springer | ABDC-C", 7.6, 9, 0)],
        [img(PUBLIC / "journals" / "book-series.jpg", 16 * mm, 20 * mm),
         p("<b>Book Series on Flexible Systems Management</b><br/>Springer | Scopus-indexed", 7.6, 9, 0)],
    ]
    pub_cells = []
    for image_item, text_item in pubs:
        pub_cells.append(Table([[image_item, text_item]], colWidths=[19 * mm, 33 * mm],
                               style=[("BOX", (0, 0), (-1, -1), .5, colors.HexColor("#CBD6E5")),
                                      ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                                      ("LEFTPADDING", (0, 0), (-1, -1), 2 * mm),
                                      ("RIGHTPADDING", (0, 0), (-1, -1), 2 * mm),
                                      ("TOPPADDING", (0, 0), (-1, -1), 2 * mm),
                                      ("BOTTOMPADDING", (0, 0), (-1, -1), 2 * mm)]))
    s.append(Table([pub_cells], colWidths=[55 * mm] * 3,
                   style=[("LEFTPADDING", (0, 0), (-1, -1), 1.5 * mm),
                          ("RIGHTPADDING", (0, 0), (-1, -1), 1.5 * mm)]))
    s += [Spacer(1, 3 * mm), section("WHO SHOULD PARTICIPATE")]
    s.append(p("Academicians | Doctoral scholars | Students | Industry professionals | "
               "Policymakers | Entrepreneurs | Researchers", 8.6, 10.2, 1.5 * mm, MUTED))
    s += [section("CONFERENCE OBJECTIVES")]
    objectives = [
        "Advance AI-driven management research",
        "Bridge academia and industry",
        "Accelerate sustainability and decarbonisation",
        "Shape responsible AI governance",
        "Publish and disseminate quality scholarship",
    ]
    objective_cells = [
        Paragraph(f"<font color='#E96745'>&#9679;</font>&nbsp; {item}",
                  ParagraphStyle("objective", fontName=BODY, fontSize=8.1,
                                 leading=10, textColor=INK))
        for item in objectives
    ]
    s.append(Table([[objective_cells[0], objective_cells[1]],
                    [objective_cells[2], objective_cells[3]],
                    [objective_cells[4], Paragraph("")]],
                   colWidths=[82.5 * mm] * 2,
                   style=[("VALIGN", (0, 0), (-1, -1), "TOP"),
                          ("BOTTOMPADDING", (0, 0), (-1, -1), 1.5 * mm)]))
    s.append(PageBreak())

    # Page 3 - submissions, dates and fees
    s += title("Submit and register", "Two pathways, one conference")
    s.append(p("Every submission begins with a <b>500-word abstract</b> naming one conference track."))
    s.append(Table([[box("PATHWAY A - PRESENTATION", "Accepted abstract, registration and presentation; no full paper required.", 77 * mm),
                     box("PATHWAY B - FULL PAPER", "After abstract acceptance, submit up to 10,000 words for double-blind review.", 77 * mm, colors.HexColor("#FFF7E5"))]],
                   colWidths=[82.5 * mm] * 2,
                   style=[("VALIGN", (0, 0), (-1, -1), "TOP"),
                          ("LEFTPADDING", (0, 0), (-1, -1), 2 * mm),
                          ("RIGHTPADDING", (0, 0), (-1, -1), 2 * mm)]))
    s += [Spacer(1, 3 * mm), section("KEY DATES")]
    dates = [
        ("07 AUG 2026", "Open for abstract submission"),
        ("21 SEP 2026", "Registration opens"),
        ("23 NOV 2026", "Abstract submission closes"),
        ("30 NOV 2026", "Abstract decisions announced"),
        ("08 DEC 2026", "Full paper submission closes - Pathway B"),
        ("15 DEC 2026", "Full paper decisions announced - Pathway B"),
        ("20 DEC 2026", "Early bird registration closes"),
        ("24 JAN 2027", "Regular registration closes"),
        ("25-27 FEB", "GLOGIFT 2027 at IIM Sambalpur"),
    ]
    date_rows = []
    for i in range(0, 9, 3):
        row = []
        for date, event in dates[i:i + 3]:
            row.append(Table([
                [Paragraph(date, ParagraphStyle(
                    "dh", fontName=BOLD, fontSize=7.8, textColor=colors.white,
                    alignment=TA_CENTER))],
                [p(event, 7.5, 9, 0, align=TA_CENTER)],
            ], colWidths=[52 * mm], rowHeights=[7 * mm, 13 * mm],
                style=[("BACKGROUND", (0, 0), (0, 0), NAVY),
                       ("BACKGROUND", (0, 1), (0, 1), PALE),
                       ("BOX", (0, 0), (-1, -1), .5, colors.HexColor("#C7D2E1")),
                       ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                       ("LEFTPADDING", (0, 0), (-1, -1), 2 * mm),
                       ("RIGHTPADDING", (0, 0), (-1, -1), 2 * mm)]))
        date_rows.append(row)
    dt = Table(date_rows, colWidths=[54 * mm] * 3, rowHeights=[22 * mm] * 3)
    dt.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 1 * mm),
        ("RIGHTPADDING", (0, 0), (-1, -1), 1 * mm),
    ]))
    s += [dt, Spacer(1, 3 * mm)]
    indian = [
        ["Category", "GLOGIFT\nmembers", "Early bird", "Regular"],
        ["Academicians", "Rs 9,000", "Rs 10,000", "Rs 11,500"],
        ["Industry", "Rs 12,000", "Rs 14,000", "Rs 16,000"],
        ["Research Scholars / PhD", "Rs 4,000", "Rs 5,000", "Rs 6,000"],
        ["Students (UG/PG)", "Rs 2,500", "Rs 3,000", "Rs 3,500"],
    ]
    foreign = [
        ["Category", "GLOGIFT\nmembers", "Early bird", "Regular"],
        ["Academicians", "$300", "$350", "$375"],
        ["Industry", "$400", "$425", "$450"],
        ["Research Scholars / PhD", "$200", "$250", "$300"],
        ["Students (UG/PG)", "$80", "$90", "$100"],
    ]
    s += [fee_table("INDIAN PARTICIPANTS (INR)", indian), Spacer(1, 2 * mm),
          fee_table("FOREIGN DELEGATES (USD)", foreign), Spacer(1, 2 * mm)]
    s.append(p("Fees are per delegate; GST extra. Includes kit, certificates, working lunches, "
               "refreshments and conference dinner. Travel and accommodation excluded.", 8, 9.7, 1.5 * mm, MUTED))
    s.append(p("<b>On-campus stay:</b> Twin-sharing Rs 1,800 / $19 per night | "
               "Single room Rs 3,600 / $38 per night | Meals and Wi-Fi included; "
               "18% GST extra.", 7.9, 9.5, 0, INK))
    s.append(PageBreak())

    # Page 4 - attractions, leadership and contact
    s += title("Leadership and contact", "Welcome to IIM Sambalpur")
    people = [
        ("mp-jaiswal.jpg", "Conference Patron", "Prof (Dr) M. P. Jaiswal", "Director, IIM Sambalpur"),
        ("sushil.jpg", "GLOGIFT President", "Prof (Dr) Sushil", "Founder, GLOGIFT Society; Emeritus Professor, IIT Delhi"),
        ("seema-gupta.jpg", "Conference Convenor", "Prof (Dr) Seema Gupta", "IIM Sambalpur"),
        ("saumyaranjan-sahoo.jpg", "Conference Co-Convenor", "Prof (Dr) Saumyaranjan Sahoo", "IIM Sambalpur"),
    ]
    cards = []
    for filename, role, name, affiliation in people:
        card = Table([[img(PUBLIC / "people" / filename, 24 * mm, 24 * mm),
                       Paragraph(f"<font color='#E96745'><b>{role}</b></font><br/><b>{name}</b><br/>"
                                 f"<font size='7.5'>{affiliation}</font>",
                                 ParagraphStyle("person", fontName=BODY, fontSize=8.2,
                                                leading=10, textColor=INK))]],
                     colWidths=[28 * mm, 51 * mm], rowHeights=[29 * mm])
        card.setStyle(TableStyle([
            ("BOX", (0, 0), (-1, -1), .5, colors.HexColor("#C9D5E3")),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ("LEFTPADDING", (0, 0), (-1, -1), 2.5 * mm),
            ("RIGHTPADDING", (0, 0), (-1, -1), 2.5 * mm),
        ]))
        cards.append(card)
    s.append(Table([[cards[0], cards[1]], [cards[2], cards[3]]],
                   colWidths=[82.5 * mm] * 2, rowHeights=[32 * mm] * 2,
                   style=[("VALIGN", (0, 0), (-1, -1), "TOP"),
                          ("LEFTPADDING", (0, 0), (-1, -1), 1.5 * mm),
                          ("RIGHTPADDING", (0, 0), (-1, -1), 1.5 * mm)]))
    s += [Spacer(1, 3 * mm), section("CONFERENCE ATTRACTIONS")]
    attractions = [
        "AI and Sustainability Leadership Forum",
        "Industry-Academia Conclave on Digital Finance",
        "Policy Roundtable on Decarbonization and Inclusive Growth",
        "Startup Showcase on FinTech and Smart Operations",
        "Doctoral Colloquium for Emerging Researchers",
        "Directors' Panel on Leadership in an AI-Driven Economy",
    ]
    a_cells = [Paragraph(f"<font color='#E96745'>&#9679;</font>&nbsp; {x}",
                         ParagraphStyle("att", fontName=BODY, fontSize=8.1,
                                        leading=10, textColor=INK)) for x in attractions]
    s.append(Table([[a_cells[0], a_cells[1]], [a_cells[2], a_cells[3]],
                    [a_cells[4], a_cells[5]]], colWidths=[82.5 * mm] * 2,
                   style=[("VALIGN", (0, 0), (-1, -1), "TOP"),
                          ("BOTTOMPADDING", (0, 0), (-1, -1), 2 * mm)]))
    s += [Spacer(1, 2 * mm), section("ORGANISERS")]
    s.append(Table([
        [Paragraph("INDIAN INSTITUTE OF MANAGEMENT SAMBALPUR",
                   ParagraphStyle("oh", fontName=BOLD, fontSize=8, textColor=NAVY)),
         Paragraph("GLOGIFT SOCIETY",
                   ParagraphStyle("oh2", fontName=BOLD, fontSize=8, textColor=NAVY))],
        [p("Basantpur, Sambalpur, Odisha, India", 8, 9.7, 0),
         p("Global Institute of Flexible Systems Management<br/>B-51 (Basement), Sarvodaya Enclave, New Delhi 110017", 8, 9.7, 0)],
    ], colWidths=[82.5 * mm] * 2,
        style=[("BACKGROUND", (0, 0), (-1, -1), PALE),
               ("BOX", (0, 0), (-1, -1), .6, colors.HexColor("#C7D2E1")),
               ("INNERGRID", (0, 0), (-1, -1), .6, colors.HexColor("#C7D2E1")),
               ("LEFTPADDING", (0, 0), (-1, -1), 3.5 * mm),
               ("RIGHTPADDING", (0, 0), (-1, -1), 3.5 * mm),
               ("TOPPADDING", (0, 0), (-1, -1), 2.5 * mm),
               ("BOTTOMPADDING", (0, 0), (-1, -1), 2.5 * mm),
               ("VALIGN", (0, 0), (-1, -1), "TOP")]))
    s += [Spacer(1, 3 * mm)]
    contact = Table([
        [Paragraph("SUBMIT AND REGISTER", ParagraphStyle(
            "ch", fontName=DISPLAY, fontSize=16, textColor=colors.white,
            alignment=TA_CENTER))],
        [Paragraph("glogift2027.in", ParagraphStyle(
            "cw", fontName=BOLD, fontSize=12, textColor=GOLD,
            alignment=TA_CENTER))],
        [Paragraph("glogift27.chair@iimsambalpur.ac.in  |  glogift27.coordinator@iimsambalpur.ac.in",
                   ParagraphStyle("cm", fontName=BODY, fontSize=8.4,
                                  textColor=colors.white, alignment=TA_CENTER))],
    ], colWidths=[162 * mm])
    contact.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), NAVY),
        ("BOX", (0, 0), (-1, -1), 1, GOLD),
        ("TOPPADDING", (0, 0), (-1, -1), 2.7 * mm),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 2.7 * mm),
    ]))
    s += [contact, Spacer(1, 3 * mm), section("EXPERIENCE SAMBALPUR")]
    destinations = [
        ("sambalpur.jpg", "SAMBALPUR"),
        ("hirakud-dam.jpg", "HIRAKUD DAM"),
        ("art-gallery.jpg", "ART AND CULTURE"),
    ]
    d_cells = []
    for filename, label in destinations:
        d_cells.append(Table([
            [img(PUBLIC / "travelogue" / filename, 50 * mm, 26 * mm)],
            [Paragraph(label, ParagraphStyle("dl", fontName=BOLD, fontSize=8,
                                             textColor=colors.white, alignment=TA_CENTER))],
        ], colWidths=[50 * mm], rowHeights=[26 * mm, 8 * mm],
            style=[("BACKGROUND", (0, 1), (0, 1), NAVY),
                   ("BOX", (0, 0), (-1, -1), .5, GOLD)]))
    s.append(Table([d_cells], colWidths=[55 * mm] * 3,
                   style=[("LEFTPADDING", (0, 0), (-1, -1), 2.5 * mm),
                          ("RIGHTPADDING", (0, 0), (-1, -1), 2.5 * mm)]))
    return s


def main():
    OUT.parent.mkdir(parents=True, exist_ok=True)
    cover_frame = Frame(18 * mm, 12 * mm, PAGE_W - 36 * mm, PAGE_H - 24 * mm,
                        id="cover", leftPadding=0, rightPadding=0,
                        topPadding=0, bottomPadding=0)
    content_frame = Frame(MARGIN, 13 * mm, PAGE_W - 2 * MARGIN,
                          PAGE_H - 30 * mm, id="content")
    doc = BaseDocTemplate(
        str(OUT), pagesize=A4, leftMargin=MARGIN, rightMargin=MARGIN,
        topMargin=17 * mm, bottomMargin=13 * mm,
        title="GLOGIFT 2027 Four-Page Conference Brochure",
        author="Indian Institute of Management Sambalpur and GLOGIFT Society",
    )
    doc.addPageTemplates([
        PageTemplate(id="cover", frames=[cover_frame], onPage=cover_background),
        PageTemplate(id="content", frames=[content_frame], onPageEnd=header_footer),
    ])
    doc.build(story())
    print(OUT)


if __name__ == "__main__":
    main()
