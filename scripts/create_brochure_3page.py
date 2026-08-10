"""Generate the concise three-page GLOGIFT 27 conference brochure."""

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import mm
from reportlab.platypus import (
    BaseDocTemplate, Frame, HRFlowable, NextPageTemplate, PageBreak,
    PageTemplate, Paragraph, Spacer, Table, TableStyle,
)

from create_brochure import (
    ROOT, PUBLIC, PAGE_W, PAGE_H, MARGIN, NAVY, BLUE, GOLD, CORAL,
    INK, MUTED, PALE, BODY, BOLD, DISPLAY, header_footer, img,
)


OUT = ROOT / "output" / "pdf" / "glogift-2027-conference-brochure.pdf"


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


def content_header_footer(canvas, doc):
    canvas.saveState()
    canvas.setFillColor(NAVY)
    canvas.rect(0, PAGE_H - 12 * mm, PAGE_W, 12 * mm, fill=1, stroke=0)
    canvas.setFillColor(colors.white)
    canvas.setFont(BOLD, 8)
    canvas.drawString(MARGIN, PAGE_H - 7.6 * mm, "GLOGIFT 27 | IIM SAMBALPUR")
    canvas.drawRightString(PAGE_W - MARGIN, PAGE_H - 7.6 * mm, "glogift2027.in")
    canvas.setFillColor(MUTED)
    canvas.setFont(BODY, 7.5)
    canvas.drawCentredString(PAGE_W / 2, 7 * mm,
                             f"Conference Brochure  |  {doc.page}")
    canvas.setFillColor(GOLD)
    canvas.rect(0, 0, PAGE_W, 3 * mm, fill=1, stroke=0)
    canvas.restoreState()


def para(text, size=10, leading=12.2, after=1.6 * mm, color=INK, align=0, font_name=BODY):
    return Paragraph(text, ParagraphStyle(
        "body", fontName=font_name, fontSize=size, leading=leading,
        textColor=color, spaceAfter=after, alignment=align))


def page_title(text, kicker):
    return [
        Paragraph(kicker.upper(), ParagraphStyle(
            "kicker", fontName=BOLD, fontSize=9.5, leading=11,
            textColor=CORAL, spaceAfter=1.4 * mm)),
        Paragraph(text, ParagraphStyle(
            "page-title", fontName=DISPLAY, fontSize=23, leading=26,
            textColor=NAVY, spaceAfter=2.2 * mm)),
        HRFlowable(width="100%", thickness=1.2, color=GOLD, spaceAfter=2.6 * mm),
    ]


def section(text, before=1.4 * mm, after=1.2 * mm):
    return Paragraph(text, ParagraphStyle(
        "section", fontName=BOLD, fontSize=12, leading=13.5,
        textColor=BLUE, spaceBefore=before, spaceAfter=after))


def theme_box(title_text, body):
    table = Table([
        [Paragraph(title_text, ParagraphStyle(
            "theme-head", fontName=BOLD, fontSize=10, leading=11.5, textColor=NAVY))],
        [Paragraph(body, ParagraphStyle(
            "theme-body", fontName=BODY, fontSize=9.2, leading=11, textColor=INK))],
    ], colWidths=[50 * mm], rowHeights=[7 * mm, 13 * mm])
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), PALE),
        ("BOX", (0, 0), (-1, -1), .6, colors.HexColor("#C7D2E1")),
        ("LINEBEFORE", (0, 0), (0, -1), 2.5, GOLD),
        ("LEFTPADDING", (0, 0), (-1, -1), 3 * mm),
        ("RIGHTPADDING", (0, 0), (-1, -1), 2.5 * mm),
        ("TOPPADDING", (0, 0), (-1, -1), 1 * mm),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 1 * mm),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
    ]))
    return table


def pathway_box(title_text, body, background=PALE):
    table = Table([
        [Paragraph(title_text, ParagraphStyle(
            "path-head", fontName=BOLD, fontSize=10.5, leading=12, textColor=NAVY))],
        [Paragraph(body, ParagraphStyle(
            "path-body", fontName=BODY, fontSize=9.4, leading=11.2, textColor=INK))],
    ], colWidths=[77 * mm], rowHeights=[7 * mm, 14.5 * mm])
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), background),
        ("BOX", (0, 0), (-1, -1), .6, colors.HexColor("#C7D2E1")),
        ("LINEBEFORE", (0, 0), (0, -1), 2.5, GOLD),
        ("LEFTPADDING", (0, 0), (-1, -1), 3 * mm),
        ("RIGHTPADDING", (0, 0), (-1, -1), 3 * mm),
        ("TOPPADDING", (0, 0), (-1, -1), 1.2 * mm),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 1.2 * mm),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
    ]))
    return table


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
        Paragraph("GLOGIFT 27", ParagraphStyle(
            "cover-name", fontName=DISPLAY, fontSize=39, leading=44,
            textColor=colors.white, alignment=TA_CENTER, spaceAfter=2.5 * mm)),
        Paragraph("TWENTY SEVENTH GLOBAL CONFERENCE ON FLEXIBLE SYSTEMS MANAGEMENT",
                  ParagraphStyle("cover-series", fontName=BOLD, fontSize=8.5,
                                 leading=10.5, tracking=.5, textColor=colors.HexColor("#D7E2F4"),
                                 alignment=TA_CENTER, spaceAfter=5 * mm)),
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
        Paragraph("CALL FOR PAPERS", ParagraphStyle(
            "cover-call", fontName=BOLD, fontSize=11.5, leading=14,
            tracking=1.5, textColor=GOLD, alignment=TA_CENTER, spaceAfter=4 * mm)),
        Paragraph("www.glogift2027.in", ParagraphStyle(
            "cover-web", fontName=BOLD, fontSize=13.5, leading=16,
            textColor=colors.white, alignment=TA_CENTER)),
    ]


def overview_page():
    story = page_title("Conference overview", "AI, adaptability and sustainability")
    story.append(para(
        "GLOGIFT 27 brings academicians, researchers, practitioners, policymakers, "
        "entrepreneurs and students together to explore how AI can strengthen flexible, "
        "competitive and sustainable management.", 10.2, 12.6))
    story.append(Table([[theme_box("FLEXIBILITY", "Adapt and reconfigure amid uncertainty"),
                         theme_box("DIGITALISATION", "Embed intelligence in core operations"),
                         theme_box("DECARBONIZATION", "Align growth with climate responsibility")]],
                       colWidths=[55 * mm] * 3,
                       style=[("VALIGN", (0, 0), (-1, -1), "TOP"),
                              ("LEFTPADDING", (0, 0), (-1, -1), 2.5 * mm),
                              ("RIGHTPADDING", (0, 0), (-1, -1), 2.5 * mm)]))
    story += [Spacer(1, 2.3 * mm), section("TEN CONFERENCE TRACKS")]
    tracks = [
        ("01", "AI in Finance, Accounting, FinTech &amp; Digital Assets"),
        ("02", "AI for Operations, Supply Chain &amp; Industry 5.0"),
        ("03", "Digital Transformation &amp; Intelligent Business"),
        ("04", "Sustainable Finance &amp; Decarbonization"),
        ("05", "AI in Marketing: Consumer Insights, Branding &amp; Customer Engagement"),
        ("06", "Governance, Ethics &amp; Responsible AI"),
        ("07", "Analytics, Big Data &amp; Intelligent Systems"),
        ("08", "Human Capital &amp; Leadership"),
        ("09", "Strategy, Innovation &amp; Emerging Business Models"),
        ("10", "Inclusive Growth &amp; Global Transformation"),
    ]
    track_rows = []
    for index in range(0, 10, 2):
        row = []
        for number, name in tracks[index:index + 2]:
            row.extend([
                Paragraph(number, ParagraphStyle(
                    "track-num", fontName=BOLD, fontSize=10.5,
                    textColor=CORAL, alignment=TA_CENTER)),
                Paragraph(name, ParagraphStyle(
                    "track-name", fontName=BODY, fontSize=9.7,
                    leading=10.8, textColor=INK)),
            ])
        track_rows.append(row)
    tracks_table = Table(track_rows, colWidths=[10 * mm, 71 * mm, 10 * mm, 71 * mm],
                         rowHeights=[18 * mm] * 5)
    tracks_table.setStyle(TableStyle([
        ("ROWBACKGROUNDS", (0, 0), (-1, -1), [colors.white, PALE]),
        ("GRID", (0, 0), (-1, -1), .5, colors.HexColor("#CBD6E5")),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("LEFTPADDING", (0, 0), (-1, -1), 2.5 * mm),
        ("RIGHTPADDING", (0, 0), (-1, -1), 2.5 * mm),
    ]))
    story += [tracks_table, Spacer(1, 2.2 * mm), section("PUBLICATION OPPORTUNITIES")]
    story.append(para(
        "<b>Selected best papers may be fast-tracked after further peer review and revision</b> "
        "for the two Springer journals or the Scopus-indexed book series. All accepted and "
        "presented papers appear in the Conference Proceedings with ISBN.", 9.5, 11.5, 1.4 * mm))
    publications = [
        ("gjfsm.jpg", "Global Journal of Flexible Systems Management", "Springer | ABDC-A"),
        ("ijgbc.jpg", "International Journal of Global Business &amp; Competitiveness", "Springer | ABDC-C"),
        ("book-series.jpg", "Book Series on Flexible Systems Management", "Springer | Scopus-indexed"),
    ]
    pub_cells = []
    for filename, name, status in publications:
        card = Table([[img(PUBLIC / "journals" / filename, 16 * mm, 20 * mm),
                       Paragraph(f"<b>{name}</b><br/><font color='#5E718D'>{status}</font>",
                                 ParagraphStyle("pub", fontName=BODY, fontSize=8.6,
                                                leading=10.2, textColor=INK))]],
                     colWidths=[19 * mm, 33 * mm], rowHeights=[24 * mm])
        card.setStyle(TableStyle([
            ("BOX", (0, 0), (-1, -1), .5, colors.HexColor("#CBD6E5")),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ("LEFTPADDING", (0, 0), (-1, -1), 2 * mm),
            ("RIGHTPADDING", (0, 0), (-1, -1), 2 * mm),
        ]))
        pub_cells.append(card)
    story.append(Table([pub_cells], colWidths=[55 * mm] * 3,
                       style=[("LEFTPADDING", (0, 0), (-1, -1), 1.5 * mm),
                              ("RIGHTPADDING", (0, 0), (-1, -1), 1.5 * mm)]))
    story += [Spacer(1, 2.2 * mm), section("CONFERENCE LEADERSHIP")]
    people = [
        ("mp-jaiswal.jpg", "Conference Patron", "Prof (Dr) Mahadeo Jaiswal", "Director, IIM Sambalpur"),
        ("sushil.jpg", "GIFT Founder President", "Prof (Dr) Sushil", "GIFT Society | Emeritus Professor, IIT Delhi"),
        ("seema-gupta.jpg", "Conference Convenor", "Prof (Dr) Seema Gupta", "IIM Sambalpur"),
        ("saumyaranjan-sahoo.jpg", "Conference Co-Convenor", "Prof (Dr) Saumyaranjan Sahoo", "IIM Sambalpur"),
    ]
    cards = []
    for filename, role, name, affiliation in people:
        card = Table([[img(PUBLIC / "people" / filename, 18 * mm, 18 * mm),
                       Paragraph(f"<font color='#E96745'><b>{role}</b></font><br/>"
                                 f"<b>{name}</b><br/><font color='#5E718D'>{affiliation}</font>",
                                 ParagraphStyle("person", fontName=BODY, fontSize=8.4,
                                                leading=9.8, textColor=INK))]],
                     colWidths=[21 * mm, 58 * mm], rowHeights=[21.5 * mm])
        card.setStyle(TableStyle([
            ("BOX", (0, 0), (-1, -1), .5, colors.HexColor("#C9D5E3")),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ("LEFTPADDING", (0, 0), (-1, -1), 1.8 * mm),
            ("RIGHTPADDING", (0, 0), (-1, -1), 2 * mm),
        ]))
        cards.append(card)
    story.append(Table([[cards[0], cards[1]], [cards[2], cards[3]]],
                       colWidths=[82.5 * mm] * 2, rowHeights=[23.5 * mm] * 2,
                       style=[("VALIGN", (0, 0), (-1, -1), "TOP"),
                              ("LEFTPADDING", (0, 0), (-1, -1), 1.5 * mm),
                              ("RIGHTPADDING", (0, 0), (-1, -1), 1.5 * mm)]))
    return story


def date_card(date, event):
    table = Table([
        [Paragraph(date, ParagraphStyle(
            "date", fontName=BOLD, fontSize=8.5, leading=9.5,
            textColor=colors.white, alignment=TA_CENTER))],
        [Paragraph(event, ParagraphStyle(
            "event", fontName=BODY, fontSize=8.4, leading=9.6,
            textColor=INK, alignment=TA_CENTER))],
    ], colWidths=[52 * mm], rowHeights=[6 * mm, 9.5 * mm])
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (0, 0), NAVY),
        ("BACKGROUND", (0, 1), (0, 1), PALE),
        ("BOX", (0, 0), (-1, -1), .5, colors.HexColor("#C7D2E1")),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("LEFTPADDING", (0, 0), (-1, -1), 2 * mm),
        ("RIGHTPADDING", (0, 0), (-1, -1), 2 * mm),
    ]))
    return table


def merged_fee_table():
    headers = [
        "CATEGORY", "INDIAN<br/>EARLY BIRD", "INDIAN<br/>REGULAR",
        "FOREIGN<br/>EARLY BIRD", "FOREIGN<br/>REGULAR",
    ]
    data = [
        ["Academicians (Faculty)", "Rs 10,000", "Rs 11,000", "$300", "$350"],
        ["Industry Professionals", "Rs 14,000", "Rs 16,000", "$425", "$450"],
        ["PhD / Research Scholars", "Rs 5,000", "Rs 6,000", "$150", "$200"],
        ["Students (UG/PG, full-time)", "Rs 3,000", "Rs 3,500", "$90", "$100"],
    ]
    head_style = ParagraphStyle(
        "fee-head", fontName=BOLD, fontSize=8.3, leading=9.5,
        textColor=colors.white, alignment=TA_CENTER)
    body_style = ParagraphStyle(
        "fee-body", fontName=BODY, fontSize=8.8, leading=10.2, textColor=INK)
    money_style = ParagraphStyle(
        "fee-money", parent=body_style, alignment=TA_CENTER)
    rows = [[Paragraph(value, head_style) for value in headers]]
    for row in data:
        rows.append([Paragraph(row[0], body_style)] +
                    [Paragraph(value, money_style) for value in row[1:]])
    table = Table(rows, colWidths=[54 * mm, 27 * mm, 27 * mm, 27 * mm, 27 * mm],
                  rowHeights=[9.5 * mm] + [8.4 * mm] * 4)
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), NAVY),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, PALE]),
        ("GRID", (0, 0), (-1, -1), .5, colors.HexColor("#BBC8DA")),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("LEFTPADDING", (0, 0), (-1, -1), 2 * mm),
        ("RIGHTPADDING", (0, 0), (-1, -1), 2 * mm),
    ]))
    return table


def submission_page():
    story = page_title("Submit, register and connect", "Two pathways, one conference")
    story.append(para(
        "Every submission begins with a <b>500-word abstract</b> naming one conference track.",
        10.2, 12.5, 1.4 * mm))
    story.append(Table([[pathway_box(
        "PATHWAY A - PRESENTATION",
        "Accepted abstract, registration and presentation; no full paper required."),
                         pathway_box(
        "PATHWAY B - FULL PAPER",
        "After abstract acceptance, prepare a double-anonymous manuscript using the published guidelines and templates.",
        colors.HexColor("#FFF7E5"))]],
                       colWidths=[82.5 * mm] * 2,
                       style=[("VALIGN", (0, 0), (-1, -1), "TOP"),
                              ("LEFTPADDING", (0, 0), (-1, -1), 2 * mm),
                              ("RIGHTPADDING", (0, 0), (-1, -1), 2 * mm)]))
    story += [Spacer(1, .8 * mm), section("NINE KEY DATES")]
    dates = [
        ("07 AUG 2026", "Open for abstract submission"),
        ("21 SEP 2026", "Registration opens"),
        ("23 NOV 2026", "Abstract submission closes"),
        ("30 NOV 2026", "Abstract decisions announced"),
        ("08 DEC 2026", "Full paper submission closes - Pathway B"),
        ("15 DEC 2026", "Target full paper decisions - Pathway B"),
        ("20 DEC 2026", "Early bird registration closes"),
        ("24 JAN 2027", "Regular registration closes"),
        ("25-27 FEB 2027", "GLOGIFT 27 at IIM Sambalpur"),
    ]
    date_rows = [[date_card(*dates[index + offset]) for offset in range(3)]
                 for index in range(0, 9, 3)]
    story.append(Table(date_rows, colWidths=[54 * mm] * 3, rowHeights=[16 * mm] * 3,
                       style=[("VALIGN", (0, 0), (-1, -1), "TOP"),
                              ("LEFTPADDING", (0, 0), (-1, -1), 1 * mm),
                              ("RIGHTPADDING", (0, 0), (-1, -1), 1 * mm)]))
    story.append(para(
        "Timing note: 15 December is the target. Review timing may extend by around 30 days or more; "
        "Pathway B authors should submit as early as possible.",
        8.3, 9.6, .8 * mm, MUTED, TA_CENTER))
    story += [Spacer(1, .6 * mm), section("REGISTRATION FEES (PER DELEGATE)")]
    story.append(merged_fee_table())
    story.append(para(
        "<b>Early bird:</b> on or before 20 Dec 2026 &nbsp; | &nbsp; "
        "<b>Regular:</b> on or before 24 Jan 2027 &nbsp; | &nbsp; GST extra.<br/>"
        "<b>GIFT SOCIETY MEMBER DISCOUNT:</b> Members receive <b>20% off registration fees only</b> "
        "with the coupon code shared by the conference organisers or the GIFT Society.",
        8.8, 10.4, .8 * mm, MUTED, TA_CENTER))
    attendance_style = ParagraphStyle(
        "attendance-note", fontName=BODY, fontSize=8.7, leading=10.2,
        textColor=INK)
    declaration_style = ParagraphStyle(
        "attendance-declaration", fontName=BODY, fontSize=8.8, leading=10.4,
        textColor=NAVY, alignment=TA_CENTER)
    attendance_note = Table([
        [Paragraph(
            "<b>ATTENDANCE DECLARATION:</b> During registration, every delegate must "
            "declare <b>In-Person</b> or <b>Virtual</b> attendance. Benefits are provided "
            "according to the declared mode.", declaration_style), ""],
        [Paragraph(
            "<b>IN-PERSON:</b> Fees include the conference kit, printed certificate, "
            "working lunches, refreshments and conference dinner. Travel and "
            "accommodation are not included.", attendance_style),
         Paragraph(
            "<b>VIRTUAL:</b> Delegates receive e-certificates of attendance; physical "
            "kits, printed certificates and meals are available only on site. The Book "
            "of Abstracts and Conference Proceedings with ISBN are supplied digitally.",
            attendance_style)],
    ], colWidths=[81 * mm, 81 * mm])
    attendance_note.setStyle(TableStyle([
        ("SPAN", (0, 0), (1, 0)),
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#FFF7E5")),
        ("BACKGROUND", (0, 1), (-1, 1), PALE),
        ("BOX", (0, 0), (-1, -1), .6, colors.HexColor("#C7D2E1")),
        ("INNERGRID", (0, 1), (-1, 1), .5, colors.HexColor("#C7D2E1")),
        ("LEFTPADDING", (0, 0), (-1, -1), 2.5 * mm),
        ("RIGHTPADDING", (0, 0), (-1, -1), 2.5 * mm),
        ("TOPPADDING", (0, 0), (-1, -1), 1.5 * mm),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 1.5 * mm),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
    ]))
    story.append(attendance_note)
    certificate_note = Table([[Paragraph(
        "<b>CERTIFICATE ELIGIBILITY:</b> Certificates are issued individually to registered, "
        "fee-paid participants. A registered author who attends and presents receives the "
        "attendance/participation and presentation certificates. Every co-author who requires "
        "certificates must register and pay separately; an unregistered co-author receives none.",
        ParagraphStyle("certificate-note", fontName=BODY, fontSize=8.8,
                       leading=10.5, textColor=INK))]], colWidths=[162 * mm])
    certificate_note.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#FFF7E5")),
        ("BOX", (0, 0), (-1, -1), .6, GOLD),
        ("LEFTPADDING", (0, 0), (-1, -1), 2.5 * mm),
        ("RIGHTPADDING", (0, 0), (-1, -1), 2.5 * mm),
        ("TOPPADDING", (0, 0), (-1, -1), 1.5 * mm),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 1.5 * mm),
    ]))
    story += [Spacer(1, .8 * mm), certificate_note]
    story.append(para(
        "<b>On-campus stay:</b> Twin-sharing Rs 1,800 / $19 per night &nbsp; | &nbsp; "
        "Single room Rs 3,600 / $38 per night &nbsp; | &nbsp; Meals and Wi-Fi included; 18% GST extra.<br/>"
        "The same rates apply to accompanying spouses, relatives and guests. Rooms are limited and "
        "allotted first-come, first-served; off-campus hotel options will be shared on the conference website.",
        8.1, 9.3, 0, INK, TA_CENTER))
    story += [Spacer(1, .8 * mm)]
    contact = Table([
        [Paragraph("SUBMIT AND REGISTER", ParagraphStyle(
            "contact-title", fontName=DISPLAY, fontSize=16.5, leading=19,
            textColor=colors.white, alignment=TA_CENTER))],
        [Paragraph("www.glogift2027.in/login", ParagraphStyle(
            "contact-web", fontName=BOLD, fontSize=12.5, leading=14,
            textColor=GOLD, alignment=TA_CENTER))],
        [Paragraph(
            "glogift27.chair@iimsambalpur.ac.in &nbsp; | &nbsp; "
            "glogift27.coordinator@iimsambalpur.ac.in<br/>"
            "Jointly organised by IIM Sambalpur and the GIFT Society",
            ParagraphStyle("contact-mail", fontName=BODY, fontSize=8.5,
                           leading=10, textColor=colors.white, alignment=TA_CENTER))],
    ], colWidths=[162 * mm])
    contact.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), NAVY),
        ("BOX", (0, 0), (-1, -1), 1, GOLD),
        ("TOPPADDING", (0, 0), (-1, -1), .8 * mm),
        ("BOTTOMPADDING", (0, 0), (-1, -1), .8 * mm),
        ("TOPPADDING", (0, 0), (0, 0), 1.6 * mm),
        ("BOTTOMPADDING", (0, -1), (0, -1), 1.6 * mm),
    ]))
    story.append(contact)
    return story


def story():
    return (cover_story() + [NextPageTemplate("content"), PageBreak()] +
            overview_page() + [PageBreak()] + submission_page())


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
        title="GLOGIFT 27 Three-Page Conference Brochure",
        author="Indian Institute of Management Sambalpur and GIFT Society",
    )
    doc.addPageTemplates([
        PageTemplate(id="cover", frames=[cover_frame], onPage=cover_background),
        PageTemplate(id="content", frames=[content_frame], onPageEnd=content_header_footer),
    ])
    doc.build(story())
    print(OUT)


if __name__ == "__main__":
    main()
