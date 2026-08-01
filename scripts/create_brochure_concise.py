"""Generate the compact, six-page GLOGIFT 2027 brochure."""

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import mm
from reportlab.platypus import (
    BaseDocTemplate, Frame, PageTemplate, Paragraph, Spacer, Image, Table,
    TableStyle, PageBreak, KeepTogether, HRFlowable,
)

from create_brochure import (
    ROOT, OUT, FLYER, PUBLIC, PAGE_W, PAGE_H, MARGIN,
    NAVY, BLUE, GOLD, CORAL, IVORY, INK, MUTED, PALE,
    BODY, BOLD, DISPLAY, styles, header_footer, img, card,
)


def title(text, kicker):
    return [
        Paragraph(kicker.upper(), ParagraphStyle(
            "compact-kicker", fontName=BOLD, fontSize=7.7, leading=9,
            textColor=CORAL, spaceAfter=1.5 * mm)),
        Paragraph(text, ParagraphStyle(
            "compact-title", fontName=DISPLAY, fontSize=22, leading=25,
            textColor=NAVY, spaceAfter=2.5 * mm)),
        HRFlowable(width="100%", thickness=1.1, color=GOLD, spaceAfter=3.5 * mm),
    ]


def p(text, size=8.8, leading=12, after=2 * mm, color=INK):
    return Paragraph(text, ParagraphStyle(
        "compact-p", fontName=BODY, fontSize=size, leading=leading,
        textColor=color, spaceAfter=after))


def section(text):
    return Paragraph(text, ParagraphStyle(
        "compact-section", fontName=BOLD, fontSize=11.2, leading=13,
        textColor=BLUE, spaceBefore=1.5 * mm, spaceAfter=1.5 * mm))


def compact_box(heading, body, width=52 * mm, bg=PALE):
    box = Table([
        [Paragraph(heading, ParagraphStyle("box-h", fontName=BOLD, fontSize=8.5,
                                           leading=10, textColor=NAVY))],
        [Paragraph(body, ParagraphStyle("box-p", fontName=BODY, fontSize=7.3,
                                        leading=9.5, textColor=INK))],
    ], colWidths=[width])
    box.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), bg),
        ("BOX", (0, 0), (-1, -1), .6, colors.HexColor("#C9D5E6")),
        ("LINEBEFORE", (0, 0), (0, -1), 2.5, GOLD),
        ("LEFTPADDING", (0, 0), (-1, -1), 3 * mm),
        ("RIGHTPADDING", (0, 0), (-1, -1), 3 * mm),
        ("TOPPADDING", (0, 0), (-1, -1), 2.3 * mm),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 2.3 * mm),
    ]))
    return box


def fee_table(title_text, data):
    hs = ParagraphStyle("fee-h", fontName=BOLD, fontSize=7.2, leading=8.5, textColor=colors.white)
    cs = ParagraphStyle("fee-c", fontName=BODY, fontSize=7.2, leading=8.8, textColor=INK)
    cooked = [[Paragraph(str(c).replace("\n", "<br/>"), hs if r == 0 else cs)
               for c in row] for r, row in enumerate(data)]
    tbl = Table(cooked, colWidths=[60 * mm, 34 * mm, 34 * mm, 34 * mm],
                rowHeights=[13 * mm] + [11.5 * mm] * 4)
    tbl.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), NAVY),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, PALE]),
        ("GRID", (0, 0), (-1, -1), .55, colors.HexColor("#BBC9DB")),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("ALIGN", (1, 0), (-1, -1), "CENTER"),
        ("LEFTPADDING", (0, 0), (-1, -1), 3 * mm),
    ]))
    return KeepTogether([section(title_text), tbl])


def story():
    s = [img(FLYER, 174 * mm, 261 * mm), PageBreak()]

    # 2 - overview, purpose and publication value
    s += title("Conference at a glance", "GLOGIFT 2027")
    logos = Table([[img(PUBLIC / "glogift-logo.png", 25 * mm, 17 * mm),
                    img(PUBLIC / "iim-sambalpur.png", 108 * mm, 18 * mm)]],
                  colWidths=[34 * mm, 125 * mm], hAlign="LEFT")
    logos.setStyle(TableStyle([("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                               ("LEFTPADDING", (0, 0), (-1, -1), 0)]))
    s += [logos, Spacer(1, 2 * mm)]
    s.append(p("The <b>International Conference on AI-Driven Solutions in Management: Flexibility, "
               "Digitalisation &amp; Decarbonization</b> brings researchers, practitioners, policymakers, "
               "entrepreneurs and students together to examine how AI can strengthen adaptability, "
               "competitiveness and sustainability."))
    s.append(Table([[compact_box("25-27 FEBRUARY 2027", "IIM Sambalpur, Odisha, India", 52 * mm),
                     compact_box("FORMAT", "In-person and hybrid participation", 52 * mm),
                     compact_box("SUBMISSIONS", "500-word abstract across 10 tracks", 52 * mm)]],
                   colWidths=[55 * mm] * 3,
                   style=[("VALIGN", (0, 0), (-1, -1), "TOP"),
                          ("LEFTPADDING", (0, 0), (-1, -1), 1.5 * mm),
                          ("RIGHTPADDING", (0, 0), (-1, -1), 1.5 * mm)]))
    s += [Spacer(1, 3 * mm), section("WHAT THE CONFERENCE SEEKS TO ACHIEVE")]
    objectives = [
        "Advance AI-driven management research",
        "Connect academic insight with industry practice",
        "Support sustainability and decarbonisation",
        "Strengthen responsible AI governance",
        "Publish and disseminate quality scholarship",
    ]
    obj_cells = [Paragraph(f"<font color='#E96745'>&#9679;</font>&nbsp; {x}",
                           ParagraphStyle("obj", fontName=BODY, fontSize=8, leading=10.5, textColor=INK))
                 for x in objectives]
    s.append(Table([[obj_cells[0], obj_cells[1]], [obj_cells[2], obj_cells[3]],
                    [obj_cells[4], Paragraph("", styles["Small"])]],
                   colWidths=[82.5 * mm] * 2,
                   style=[("VALIGN", (0, 0), (-1, -1), "TOP"),
                          ("BOTTOMPADDING", (0, 0), (-1, -1), 2 * mm)]))
    s += [Spacer(1, 2 * mm), section("PUBLICATION OPPORTUNITIES")]
    s.append(p("<b>Selected papers considered for ABDC Listed Journals and Scopus Indexed Book Series.</b> "
               "All accepted and presented papers are included in the GLOGIFT 2027 Conference Proceedings with ISBN.",
               after=2.5 * mm))
    pubs = [
        [img(PUBLIC / "journals" / "gjfsm.jpg", 18 * mm, 23 * mm),
         p("<b>Global Journal of Flexible Systems Management</b><br/>Springer | ABDC-A", 7.5, 9.5, 0)],
        [img(PUBLIC / "journals" / "ijgbc.jpg", 18 * mm, 23 * mm),
         p("<b>International Journal of Global Business &amp; Competitiveness</b><br/>Springer | ABDC-C", 7.5, 9.5, 0)],
        [img(PUBLIC / "journals" / "book-series.jpg", 18 * mm, 23 * mm),
         p("<b>Book Series on Flexible Systems Management</b><br/>Springer | Scopus-indexed", 7.5, 9.5, 0)],
    ]
    pub_cards = []
    for image_item, text_item in pubs:
        t = Table([[image_item, text_item]], colWidths=[21 * mm, 31 * mm])
        t.setStyle(TableStyle([("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                               ("BOX", (0, 0), (-1, -1), .5, colors.HexColor("#CDD7E5")),
                               ("LEFTPADDING", (0, 0), (-1, -1), 2 * mm),
                               ("RIGHTPADDING", (0, 0), (-1, -1), 2 * mm),
                               ("TOPPADDING", (0, 0), (-1, -1), 2 * mm),
                               ("BOTTOMPADDING", (0, 0), (-1, -1), 2 * mm)]))
        pub_cards.append(t)
    s.append(Table([pub_cards], colWidths=[55 * mm] * 3,
                   style=[("VALIGN", (0, 0), (-1, -1), "TOP"),
                          ("LEFTPADDING", (0, 0), (-1, -1), 1.5 * mm),
                          ("RIGHTPADDING", (0, 0), (-1, -1), 1.5 * mm)]))
    s += [Spacer(1, 3 * mm), section("SPECIAL SESSIONS")]
    s.append(p("AI and Sustainability Leadership Forum | Digital Finance Conclave | Policy Roundtable | "
               "Startup Showcase | Doctoral Colloquium | Directors' Panel", 8, 10.5, 0))
    s += [Spacer(1, 4 * mm)]
    theme_images = [
        ("finance.jpg", "AI AND FINANCE"),
        ("operations.jpg", "INDUSTRY 5.0"),
        ("sustainability.jpg", "SUSTAINABILITY"),
    ]
    visual_cells = []
    for filename, label in theme_images:
        visual_cells.append(Table([
            [img(PUBLIC / "tracks" / filename, 50 * mm, 31 * mm)],
            [Paragraph(label, ParagraphStyle("visual-label", fontName=BOLD, fontSize=7.5,
                                             textColor=colors.white, alignment=TA_CENTER))],
        ], colWidths=[50 * mm], rowHeights=[31 * mm, 9 * mm],
            style=[("BACKGROUND", (0, 1), (0, 1), NAVY),
                   ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                   ("BOX", (0, 0), (-1, -1), .6, GOLD)]))
    s.append(Table([visual_cells], colWidths=[55 * mm] * 3,
                   style=[("VALIGN", (0, 0), (-1, -1), "TOP"),
                          ("LEFTPADDING", (0, 0), (-1, -1), 2.5 * mm),
                          ("RIGHTPADDING", (0, 0), (-1, -1), 2.5 * mm)]))
    s.append(PageBreak())

    # 3 - tracks and submission pathways
    s += title("Tracks and submission pathways", "Call for original, unpublished research")
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
            row.extend([
                Paragraph(n, ParagraphStyle("track-n", fontName=BOLD, fontSize=11,
                                             leading=12, textColor=CORAL, alignment=TA_CENTER)),
                Paragraph(name, ParagraphStyle("track-t", fontName=BODY, fontSize=7.7,
                                                leading=9.5, textColor=INK)),
            ])
        rows.append(row)
    track_table = Table(rows, colWidths=[11 * mm, 70 * mm, 11 * mm, 70 * mm],
                        rowHeights=[22 * mm] * 5)
    track_table.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("BACKGROUND", (0, 0), (-1, -1), colors.white),
        ("GRID", (0, 0), (-1, -1), .5, colors.HexColor("#CBD6E5")),
        ("LEFTPADDING", (0, 0), (-1, -1), 3 * mm),
        ("RIGHTPADDING", (0, 0), (-1, -1), 3 * mm),
    ]))
    s.append(track_table)
    s += [Spacer(1, 4 * mm), section("TWO PATHWAYS")]
    s.append(Table([[compact_box("PATHWAY A - PRESENTATION", "Accepted abstract, registration and presentation. No full paper required.", 78 * mm),
                     compact_box("PATHWAY B - FULL PAPER", "After abstract acceptance, submit a paper of up to 10,000 words for double-blind review.", 78 * mm, colors.HexColor("#FFF7E5"))]],
                   colWidths=[82.5 * mm] * 2,
                   style=[("VALIGN", (0, 0), (-1, -1), "TOP"),
                          ("LEFTPADDING", (0, 0), (-1, -1), 2 * mm),
                          ("RIGHTPADDING", (0, 0), (-1, -1), 2 * mm)]))
    s += [Spacer(1, 4 * mm), section("SUBMISSION PROCESS")]
    steps = [
        ("1", "Submit", "Upload a 500-word abstract; choose a track and pathway."),
        ("2", "Review", "Track Editors assess abstracts; full papers receive double-blind review."),
        ("3", "Decision", "Authors receive acceptance, rejection or revision feedback."),
        ("4", "Register", "Accepted authors register and submit final paper or presentation materials."),
    ]
    step_cells = []
    for n, head, body in steps:
        step_cells.append(Table([
            [Paragraph(n, ParagraphStyle("step-n", fontName=BOLD, fontSize=12,
                                         textColor=colors.white, alignment=TA_CENTER))],
            [Paragraph(f"<b>{head}</b><br/>{body}", ParagraphStyle(
                "step-p", fontName=BODY, fontSize=7.4, leading=9.4, textColor=INK))],
        ], colWidths=[39 * mm], rowHeights=[10 * mm, 29 * mm],
            style=[("BACKGROUND", (0, 0), (0, 0), BLUE),
                   ("BACKGROUND", (0, 1), (0, 1), PALE),
                   ("BOX", (0, 0), (-1, -1), .6, colors.HexColor("#C6D2E2")),
                   ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                   ("LEFTPADDING", (0, 1), (0, 1), 3 * mm),
                   ("RIGHTPADDING", (0, 1), (0, 1), 3 * mm)]))
    s.append(Table([step_cells], colWidths=[41.25 * mm] * 4,
                   style=[("VALIGN", (0, 0), (-1, -1), "TOP"),
                          ("LEFTPADDING", (0, 0), (-1, -1), 1 * mm),
                          ("RIGHTPADDING", (0, 0), (-1, -1), 1 * mm)]))
    s += [Spacer(1, 4 * mm), card("IMPORTANT", "An accepted abstract secures eligibility to register and present even if a Pathway B full paper is not accepted.", colors.HexColor("#FFF7E5"), 162 * mm), PageBreak()]

    # 4 - fees and accommodation
    s += title("Registration and stay", "Clear options for every delegate")
    s.append(p("Fees are per delegate and include the conference kit, certificates, working lunches, "
               "refreshments and conference dinner. GST is extra; travel and accommodation are excluded. "
               "Virtual delegates receive e-certificates and digital publications."))
    indian = [
        ["Category", "GLOGIFT\nmembers", "Early bird\nby 20 Dec", "Regular\nby 24 Jan"],
        ["Academicians (Faculty)", "Rs 9,000", "Rs 10,000", "Rs 11,500"],
        ["Industry Professionals", "Rs 12,000", "Rs 14,000", "Rs 16,000"],
        ["Research Scholars / PhD", "Rs 4,000", "Rs 5,000", "Rs 6,000"],
        ["Students (UG/PG)", "Rs 2,500", "Rs 3,000", "Rs 3,500"],
    ]
    foreign = [
        ["Category", "GLOGIFT\nmembers", "Early bird\nby 20 Dec", "Regular\nby 24 Jan"],
        ["Academicians (Faculty)", "$300", "$350", "$375"],
        ["Industry Professionals", "$400", "$425", "$450"],
        ["Research Scholars / PhD", "$200", "$250", "$300"],
        ["Students (UG/PG)", "$80", "$90", "$100"],
    ]
    s += [fee_table("INDIAN PARTICIPANTS (INR)", indian), Spacer(1, 3 * mm),
          fee_table("FOREIGN DELEGATES (USD)", foreign), Spacer(1, 4 * mm)]
    s.append(Table([[compact_box("TWIN-SHARING", "Rs 1,800 / $19 per night", 50 * mm, colors.HexColor("#FFF7E5")),
                     compact_box("SINGLE ROOM", "Rs 3,600 / $38 per night", 50 * mm, colors.HexColor("#FFF7E5")),
                     compact_box("INCLUDED", "Meals and Wi-Fi; 18% GST extra", 50 * mm, colors.HexColor("#FFF7E5"))]],
                   colWidths=[55 * mm] * 3,
                   style=[("VALIGN", (0, 0), (-1, -1), "TOP"),
                          ("LEFTPADDING", (0, 0), (-1, -1), 2.5 * mm),
                          ("RIGHTPADDING", (0, 0), (-1, -1), 2.5 * mm)]))
    s += [Spacer(1, 2 * mm), p("Rooms are limited and allotted first-come, first-served.", 7.8, 9.5, 0, MUTED),
          Spacer(1, 5 * mm)]
    register_note = Table([
        [Paragraph("REGISTER EARLY", ParagraphStyle(
            "reg-note-h", fontName=DISPLAY, fontSize=13.5, leading=15, textColor=colors.white,
            alignment=TA_CENTER)),
         Paragraph("WHAT YOUR FEE COVERS", ParagraphStyle(
            "reg-note-h2", fontName=BOLD, fontSize=10, textColor=NAVY,
            alignment=TA_CENTER))],
        [Paragraph("Early bird closes<br/><b>20 December 2026</b>", ParagraphStyle(
            "reg-note-p", fontName=BODY, fontSize=8.5, leading=12,
            textColor=colors.white, alignment=TA_CENTER)),
         Paragraph("Conference kit | Certificate | Working lunches | Refreshments | Conference dinner",
                   ParagraphStyle("reg-note-p2", fontName=BODY, fontSize=8,
                                  leading=11, textColor=INK, alignment=TA_CENTER))],
    ], colWidths=[58 * mm, 104 * mm], rowHeights=[14 * mm, 25 * mm])
    register_note.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (0, -1), NAVY),
        ("BACKGROUND", (1, 0), (1, -1), PALE),
        ("BOX", (0, 0), (-1, -1), .8, GOLD),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("LEFTPADDING", (0, 0), (-1, -1), 4 * mm),
        ("RIGHTPADDING", (0, 0), (-1, -1), 4 * mm),
    ]))
    s += [register_note, PageBreak()]

    # 5 - timeline, CTA, highlights
    s += title("Key dates", "Plan your submission")
    dates = [
        ("21 SEP 2026", "Registration opens"),
        ("23 NOV 2026", "Abstract submission closes"),
        ("30 NOV 2026", "Abstract decisions announced"),
        ("08 DEC 2026", "Full paper submission closes - Pathway B"),
        ("15 DEC 2026", "Full paper decisions announced - Pathway B"),
        ("20 DEC 2026", "Early bird registration closes"),
        ("24 JAN 2027", "Regular registration closes"),
        ("25-27 FEB 2027", "GLOGIFT 2027 at IIM Sambalpur"),
    ]
    rows = [[Paragraph(d, ParagraphStyle("date", fontName=BOLD, fontSize=8,
                                         textColor=colors.white, alignment=TA_CENTER)),
             p(event, 8.2, 10, 0)] for d, event in dates]
    dt = Table(rows, colWidths=[42 * mm, 120 * mm], rowHeights=[20 * mm] * 8)
    dt.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (0, -1), NAVY),
        ("ROWBACKGROUNDS", (1, 0), (1, -1), [colors.white, PALE]),
        ("GRID", (0, 0), (-1, -1), .5, colors.HexColor("#CBD5E4")),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("LEFTPADDING", (1, 0), (1, -1), 5 * mm),
    ]))
    s += [dt, Spacer(1, 5 * mm)]
    cta = Table([
        [Paragraph("SUBMIT AND REGISTER", ParagraphStyle(
            "cta-h", fontName=DISPLAY, fontSize=18, leading=21,
            textColor=colors.white, alignment=TA_CENTER))],
        [Paragraph("glogift2027.in", ParagraphStyle(
            "cta-p", fontName=BOLD, fontSize=12, leading=15,
            textColor=GOLD, alignment=TA_CENTER))],
        [Paragraph("Abstract deadline: 23 November 2026", ParagraphStyle(
            "cta-s", fontName=BODY, fontSize=8, leading=10,
            textColor=colors.white, alignment=TA_CENTER))],
    ], colWidths=[162 * mm])
    cta.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), NAVY),
        ("BOX", (0, 0), (-1, -1), 1.1, GOLD),
        ("TOPPADDING", (0, 0), (-1, -1), 3 * mm),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 3 * mm),
    ]))
    s += [cta, Spacer(1, 4 * mm), section("WHO SHOULD ATTEND")]
    s.append(p("Academicians | Doctoral scholars | Students | Industry professionals | Policymakers | "
               "Entrepreneurs | Researchers", 8.3, 10.5, 0, MUTED))
    s.append(PageBreak())

    # 6 - leadership and contacts
    s += title("Leadership and contact", "We look forward to welcoming you")
    people = [
        ("mp-jaiswal.jpg", "Conference Patron", "Prof (Dr) M. P. Jaiswal", "Director, IIM Sambalpur"),
        ("sushil.jpg", "GLOGIFT President", "Prof (Dr) Sushil", "Founder, GLOGIFT Society; Emeritus Professor, IIT Delhi"),
        ("seema-gupta.jpg", "Conference Convenor", "Prof (Dr) Seema Gupta", "IIM Sambalpur"),
        ("saumyaranjan-sahoo.jpg", "Conference Co-Convenor", "Prof (Dr) Saumyaranjan Sahoo", "IIM Sambalpur"),
    ]
    cards = []
    for filename, role, name, affiliation in people:
        item = Table([[img(PUBLIC / "people" / filename, 26 * mm, 26 * mm),
                       Paragraph(f"<font color='#E96745'><b>{role}</b></font><br/><b>{name}</b><br/>"
                                 f"<font size='7'>{affiliation}</font>",
                                 ParagraphStyle("person", fontName=BODY, fontSize=8,
                                                leading=10, textColor=INK))]],
                     colWidths=[30 * mm, 49 * mm], rowHeights=[32 * mm])
        item.setStyle(TableStyle([
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ("BOX", (0, 0), (-1, -1), .55, colors.HexColor("#CDD7E5")),
            ("LEFTPADDING", (0, 0), (-1, -1), 2.5 * mm),
            ("RIGHTPADDING", (0, 0), (-1, -1), 2.5 * mm),
        ]))
        cards.append(item)
    s.append(Table([[cards[0], cards[1]], [cards[2], cards[3]]],
                   colWidths=[82.5 * mm] * 2, rowHeights=[35 * mm] * 2,
                   style=[("VALIGN", (0, 0), (-1, -1), "TOP"),
                          ("LEFTPADDING", (0, 0), (-1, -1), 1.5 * mm),
                          ("RIGHTPADDING", (0, 0), (-1, -1), 1.5 * mm)]))
    s += [Spacer(1, 4 * mm), section("ORGANISERS")]
    s.append(Table([
        [Paragraph("INDIAN INSTITUTE OF MANAGEMENT SAMBALPUR", ParagraphStyle(
            "org-h", fontName=BOLD, fontSize=8.5, textColor=NAVY)),
         Paragraph("GLOGIFT SOCIETY", ParagraphStyle(
            "org-h2", fontName=BOLD, fontSize=8.5, textColor=NAVY))],
        [p("Basantpur, Sambalpur, Odisha, India", 7.8, 10, 0),
         p("Global Institute of Flexible Systems Management<br/>B-51 (Basement), Sarvodaya Enclave, New Delhi 110017", 7.8, 10, 0)],
    ], colWidths=[82.5 * mm] * 2,
        style=[("BACKGROUND", (0, 0), (-1, -1), PALE),
               ("BOX", (0, 0), (-1, -1), .6, colors.HexColor("#C6D2E2")),
               ("INNERGRID", (0, 0), (-1, -1), .6, colors.HexColor("#C6D2E2")),
               ("LEFTPADDING", (0, 0), (-1, -1), 4 * mm),
               ("RIGHTPADDING", (0, 0), (-1, -1), 4 * mm),
               ("TOPPADDING", (0, 0), (-1, -1), 3 * mm),
               ("BOTTOMPADDING", (0, 0), (-1, -1), 3 * mm),
               ("VALIGN", (0, 0), (-1, -1), "TOP")]))
    s += [Spacer(1, 5 * mm)]
    contact = Table([
        [Paragraph("glogift2027.in", ParagraphStyle(
            "web", fontName=DISPLAY, fontSize=18, textColor=colors.white,
            alignment=TA_CENTER))],
        [Paragraph("glogift27.chair@iimsambalpur.ac.in  |  glogift27.coordinator@iimsambalpur.ac.in",
                   ParagraphStyle("mail", fontName=BODY, fontSize=8.5,
                                  textColor=colors.white, alignment=TA_CENTER))],
    ], colWidths=[162 * mm])
    contact.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), NAVY),
        ("BOX", (0, 0), (-1, -1), 1.1, GOLD),
        ("TOPPADDING", (0, 0), (-1, -1), 4 * mm),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4 * mm),
    ]))
    s.append(contact)
    s += [Spacer(1, 4 * mm), p("Jointly organised by the Indian Institute of Management Sambalpur and the GLOGIFT Society.",
                               8.5, 11, 0, MUTED), Spacer(1, 4 * mm),
          section("EXPERIENCE SAMBALPUR")]
    destination_images = [
        ("sambalpur.jpg", "SAMBALPUR"),
        ("hirakud-dam.jpg", "HIRAKUD DAM"),
        ("art-gallery.jpg", "ART AND CULTURE"),
    ]
    destination_cells = []
    for filename, label in destination_images:
        destination_cells.append(Table([
            [img(PUBLIC / "travelogue" / filename, 50 * mm, 29 * mm)],
            [Paragraph(label, ParagraphStyle("destination-label", fontName=BOLD,
                                             fontSize=7.2, textColor=colors.white,
                                             alignment=TA_CENTER))],
        ], colWidths=[50 * mm], rowHeights=[29 * mm, 8 * mm],
            style=[("BACKGROUND", (0, 1), (0, 1), NAVY),
                   ("BOX", (0, 0), (-1, -1), .6, GOLD),
                   ("VALIGN", (0, 0), (-1, -1), "MIDDLE")]))
    s.append(Table([destination_cells], colWidths=[55 * mm] * 3,
                   style=[("VALIGN", (0, 0), (-1, -1), "TOP"),
                          ("LEFTPADDING", (0, 0), (-1, -1), 2.5 * mm),
                          ("RIGHTPADDING", (0, 0), (-1, -1), 2.5 * mm)]))
    return s


def main():
    OUT.parent.mkdir(parents=True, exist_ok=True)
    frame = Frame(MARGIN, 13 * mm, PAGE_W - 2 * MARGIN, PAGE_H - 30 * mm, id="content")
    doc = BaseDocTemplate(
        str(OUT), pagesize=A4, leftMargin=MARGIN, rightMargin=MARGIN,
        topMargin=17 * mm, bottomMargin=13 * mm,
        title="GLOGIFT 2027 Conference Brochure",
        author="Indian Institute of Management Sambalpur and GLOGIFT Society",
    )
    doc.addPageTemplates([PageTemplate(id="compact", frames=[frame], onPageEnd=header_footer)])
    doc.build(story())
    print(OUT)


if __name__ == "__main__":
    main()
