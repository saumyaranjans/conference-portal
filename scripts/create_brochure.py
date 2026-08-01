from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfbase import pdfmetrics
from reportlab.platypus import (
    BaseDocTemplate, Frame, PageTemplate, Paragraph, Spacer, Image, Table,
    TableStyle, PageBreak, KeepTogether, HRFlowable,
)

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "output" / "pdf" / "glogift-2027-conference-brochure.pdf"
FLYER = ROOT / "output" / "glogift-2027-one-page-flyer.png"
PUBLIC = ROOT / "public"

NAVY = colors.HexColor("#082B66")
BLUE = colors.HexColor("#1545A0")
GOLD = colors.HexColor("#E3A722")
CORAL = colors.HexColor("#E96745")
IVORY = colors.HexColor("#FBF8F0")
INK = colors.HexColor("#17223B")
MUTED = colors.HexColor("#5A6478")
PALE = colors.HexColor("#EEF3FA")

PAGE_W, PAGE_H = A4
MARGIN = 15 * mm


def register_fonts():
    candidates = [
        ("Body", "C:/Windows/Fonts/arial.ttf"),
        ("BodyBold", "C:/Windows/Fonts/arialbd.ttf"),
        ("Display", "C:/Windows/Fonts/georgia.ttf"),
        ("DisplayBold", "C:/Windows/Fonts/georgiab.ttf"),
    ]
    for name, path in candidates:
        if Path(path).exists():
            pdfmetrics.registerFont(TTFont(name, path))


register_fonts()
BODY = "Body" if "Body" in pdfmetrics.getRegisteredFontNames() else "Helvetica"
BOLD = "BodyBold" if "BodyBold" in pdfmetrics.getRegisteredFontNames() else "Helvetica-Bold"
DISPLAY = "DisplayBold" if "DisplayBold" in pdfmetrics.getRegisteredFontNames() else "Times-Bold"

styles = getSampleStyleSheet()
styles.add(ParagraphStyle(name="BrochureTitle", fontName=DISPLAY, fontSize=25, leading=29,
                          textColor=NAVY, spaceAfter=5 * mm))
styles.add(ParagraphStyle(name="Section", fontName=DISPLAY, fontSize=18, leading=22,
                          textColor=NAVY, spaceAfter=3.5 * mm))
styles.add(ParagraphStyle(name="Subsection", fontName=BOLD, fontSize=11.5, leading=14,
                          textColor=BLUE, spaceBefore=2 * mm, spaceAfter=1.5 * mm))
styles.add(ParagraphStyle(name="BodyX", fontName=BODY, fontSize=9.2, leading=13,
                          textColor=INK, spaceAfter=2.4 * mm))
styles.add(ParagraphStyle(name="Small", fontName=BODY, fontSize=7.7, leading=10.2,
                          textColor=MUTED))
styles.add(ParagraphStyle(name="CardTitle", fontName=BOLD, fontSize=9.5, leading=11.5,
                          textColor=NAVY, spaceAfter=1 * mm))
styles.add(ParagraphStyle(name="CardBody", fontName=BODY, fontSize=7.7, leading=10,
                          textColor=INK))
styles.add(ParagraphStyle(name="WhiteTitle", fontName=DISPLAY, fontSize=22, leading=26,
                          textColor=colors.white, alignment=TA_CENTER))
styles.add(ParagraphStyle(name="WhiteBody", fontName=BODY, fontSize=10, leading=14,
                          textColor=colors.white, alignment=TA_CENTER))


def header_footer(canvas, doc):
    if doc.page == 1:
        return
    canvas.saveState()
    canvas.setFillColor(NAVY)
    canvas.rect(0, PAGE_H - 12 * mm, PAGE_W, 12 * mm, fill=1, stroke=0)
    canvas.setFont(BOLD, 8.3)
    canvas.setFillColor(colors.white)
    canvas.drawString(MARGIN, PAGE_H - 7.6 * mm, "GLOGIFT 2027 | IIM SAMBALPUR")
    canvas.drawRightString(PAGE_W - MARGIN, PAGE_H - 7.6 * mm, "glogift2027.in")
    canvas.setFillColor(GOLD)
    canvas.rect(0, 0, PAGE_W, 3 * mm, fill=1, stroke=0)
    canvas.setFillColor(MUTED)
    canvas.setFont(BODY, 7.8)
    canvas.drawCentredString(PAGE_W / 2, 7 * mm, f"Conference Brochure  |  {doc.page}")
    canvas.restoreState()


class BrochureDoc(BaseDocTemplate):
    pass


def img(path, width, height=None):
    im = Image(str(path), width=width, height=height)
    im.hAlign = "CENTER"
    return im


def page_title(title, kicker=None):
    out = []
    if kicker:
        out.append(Paragraph(kicker.upper(), ParagraphStyle(
            "k", parent=styles["Small"], fontName=BOLD, textColor=CORAL, tracking=1.2,
            spaceAfter=1.5 * mm)))
    out.append(Paragraph(title, styles["BrochureTitle"]))
    out.append(HRFlowable(width="100%", thickness=1.2, color=GOLD, spaceAfter=4 * mm))
    return out


def bullet(text):
    return Paragraph(f"<font color='#E96745'>&#9679;</font>&nbsp;&nbsp;{text}", styles["BodyX"])


def card(title, body, bg=colors.white, width=82 * mm):
    t = Table([[Paragraph(title, styles["CardTitle"])], [Paragraph(body, styles["CardBody"]) ]],
              colWidths=[width])
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), bg),
        ("BOX", (0, 0), (-1, -1), 0.7, colors.HexColor("#C9D5E6")),
        ("LINEBEFORE", (0, 0), (0, -1), 3, GOLD),
        ("LEFTPADDING", (0, 0), (-1, -1), 4 * mm),
        ("RIGHTPADDING", (0, 0), (-1, -1), 4 * mm),
        ("TOPPADDING", (0, 0), (-1, -1), 3 * mm),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 3 * mm),
    ]))
    return t


def build_story():
    S = []

    # 1 - flyer cover
    S.append(img(FLYER, 174 * mm, 261 * mm))
    S.append(PageBreak())

    # 2 - overview
    S += page_title("About GLOGIFT 2027", "A meeting point for ideas and action")
    logo_row = Table([
        [img(PUBLIC / "glogift-logo.png", 31 * mm, 21 * mm),
         img(PUBLIC / "iim-sambalpur.png", 116 * mm, 20 * mm)]
    ], colWidths=[40 * mm, 125 * mm], hAlign="LEFT")
    logo_row.setStyle(TableStyle([("VALIGN", (0,0), (-1,-1), "MIDDLE"), ("LEFTPADDING", (0,0), (-1,-1), 0)]))
    S += [logo_row, Spacer(1, 4 * mm)]
    S.append(Paragraph(
        "The <b>International Conference on AI-Driven Solutions in Management: Flexibility, "
        "Digitalisation &amp; Decarbonization</b> is jointly organised by the Indian Institute of "
        "Management Sambalpur and the GLOGIFT Society at IIM Sambalpur, Odisha, from "
        "<b>25 to 27 February 2027</b>.", styles["BodyX"]))
    S.append(Paragraph(
        "The conference asks how artificial intelligence can make enterprises more adaptable and "
        "more sustainable at the same time. It brings together academicians, researchers, "
        "practitioners, policymakers, entrepreneurs and students across finance, operations, "
        "marketing, governance and public policy, in the context of Industry 5.0 and the Sustainable "
        "Development Goals.", styles["BodyX"]))
    concepts = [
        ("FLEXIBILITY", "The capacity to absorb shocks, reconfigure quickly and thrive amid uncertainty."),
        ("DIGITALISATION", "Intelligence moving into the operating core, from algorithmic finance to digital twins."),
        ("DECARBONIZATION", "The obligation reshaping investment, supply chains, strategy and public policy."),
    ]
    S.append(Spacer(1, 2 * mm))
    S.append(Table([[card(a,b,PALE, 52 * mm) for a,b in concepts]], colWidths=[55 * mm] * 3,
                   style=[("VALIGN", (0,0), (-1,-1), "TOP"), ("LEFTPADDING", (0,0), (-1,-1), 1.5*mm), ("RIGHTPADDING", (0,0), (-1,-1), 1.5*mm)]))
    S.append(Spacer(1, 7 * mm))
    venue = Table([[Paragraph("25-27 FEBRUARY 2027", styles["WhiteTitle"])],
                   [Paragraph("IIM Sambalpur, Odisha, India  |  In-Person and Hybrid", styles["WhiteBody"]) ]],
                  colWidths=[165 * mm])
    venue.setStyle(TableStyle([("BACKGROUND", (0,0), (-1,-1), NAVY), ("BOX", (0,0), (-1,-1), 1.2, GOLD),
                               ("TOPPADDING", (0,0), (-1,-1), 5*mm), ("BOTTOMPADDING", (0,0), (-1,-1), 5*mm)]))
    S.append(venue)
    S.append(PageBreak())

    # 3 - objectives and attractions
    S += page_title("Why participate?", "Conference objectives and attractions")
    objs = [
        "Advance rigorous AI-driven management research",
        "Bridge academia and industry through shared problems and evidence",
        "Accelerate decarbonisation and sustainability initiatives",
        "Shape responsible AI governance and policy",
        "Publish and disseminate high-quality scholarship",
    ]
    S.append(Paragraph("CONFERENCE OBJECTIVES", styles["Subsection"]))
    for x in objs:
        S.append(bullet(x))
    S.append(Spacer(1, 2 * mm))
    S.append(Paragraph("PUBLICATION OPPORTUNITIES", styles["Subsection"]))
    S.append(Paragraph("<b>Selected papers considered for ABDC Listed Journals and Scopus Indexed Book Series</b>", styles["BodyX"]))
    pub_rows = [
        [img(PUBLIC / "iim-crest.png", 25*mm, 29*mm), Paragraph("<b>GLOGIFT 2027 Conference Proceedings</b><br/>All accepted and presented papers appear in a dedicated proceedings volume with ISBN.", styles["BodyX"])],
        [img(PUBLIC / "journals" / "gjfsm.jpg", 22*mm, 29*mm), Paragraph("<b>Global Journal of Flexible Systems Management</b><br/>Selected best papers may be fast-tracked after further peer review and revision. Springer, ABDC-A.", styles["BodyX"])],
        [img(PUBLIC / "journals" / "ijgbc.jpg", 22*mm, 29*mm), Paragraph("<b>International Journal of Global Business &amp; Competitiveness</b><br/>Selected best papers may be fast-tracked after further peer review and revision. Springer, ABDC-C.", styles["BodyX"])],
        [img(PUBLIC / "journals" / "book-series.jpg", 22*mm, 29*mm), Paragraph("<b>Book Series on Flexible Systems Management</b><br/>Selected best papers may be considered as book chapters. Springer, Scopus-indexed.", styles["BodyX"])],
    ]
    pt = Table(pub_rows, colWidths=[34*mm, 128*mm], rowHeights=[35*mm]*4)
    pt.setStyle(TableStyle([("VALIGN", (0,0), (-1,-1), "MIDDLE"), ("GRID", (0,0), (-1,-1), .5, colors.HexColor("#D6DEEA")),
                            ("BACKGROUND", (0,0), (-1,-1), colors.white), ("LEFTPADDING", (0,0), (-1,-1), 4*mm),
                            ("RIGHTPADDING", (0,0), (-1,-1), 4*mm)]))
    S.append(pt)
    S.append(Spacer(1, 3*mm))
    S.append(Paragraph("SPECIAL SESSIONS AND PANELS", styles["Subsection"]))
    S.append(Paragraph("AI and Sustainability Leadership Forum  |  Industry-Academia Conclave on Digital Finance  |  Policy Roundtable on Decarbonization and Inclusive Growth  |  Startup Showcase  |  Doctoral Colloquium  |  Directors' Panel", styles["BodyX"]))
    S.append(PageBreak())

    # 4 - tracks
    S += page_title("Ten conference tracks", "Call for original, unpublished research")
    tracks = [
        ("01", "AI in Finance, Accounting, FinTech & Digital Assets", "Risk, trading, fraud detection, digital banking, blockchain, CBDCs and tokenisation."),
        ("02", "AI for Operations, Supply Chain & Industry 5.0", "Smart factories, predictive maintenance, digital twins, automation and forecasting."),
        ("03", "Digital Transformation & Intelligent Business", "Digital business models, cloud, IoT, process automation and digital governance."),
        ("04", "Sustainable Finance & Decarbonization", "Green finance, ESG, carbon accounting, climate finance, circular economy and SDGs."),
        ("05", "AI in Marketing", "Consumer insights, branding, personalisation, generative advertising and analytics."),
        ("06", "Governance, Ethics & Responsible AI", "Ethical AI, data privacy, regulation and corporate governance."),
        ("07", "Analytics, Big Data & Intelligent Systems", "Predictive analytics, deep learning, NLP, BI and real-time decision systems."),
        ("08", "Human Capital & Leadership", "AI in HRM, future of work, talent analytics and knowledge management."),
        ("09", "Strategy, Innovation & Emerging Business Models", "AI startups, platforms, digital entrepreneurship, technology management and VC."),
        ("10", "Inclusive Growth & Global Transformation", "Financial inclusion, smart cities, public policy, healthcare analytics and resilience."),
    ]
    rows = []
    for i in range(0, 10, 2):
        row=[]
        for n,title,desc in tracks[i:i+2]:
            row.extend([
                Paragraph(n, ParagraphStyle("num", parent=styles["CardTitle"], fontSize=14, textColor=CORAL, alignment=TA_CENTER)),
                Paragraph(f"<b>{title}</b><br/><font size='7.6'>{desc}</font>", styles["CardBody"]),
            ])
        rows.append(row)
    tt = Table(rows, colWidths=[12*mm, 68.5*mm, 12*mm, 68.5*mm], rowHeights=[37*mm]*5)
    tt.setStyle(TableStyle([
        ("VALIGN", (0,0), (-1,-1), "TOP"), ("BACKGROUND", (0,0), (-1,-1), colors.white),
        ("BOX", (0,0), (1,-1), .6, colors.HexColor("#CED8E7")),
        ("BOX", (2,0), (3,-1), .6, colors.HexColor("#CED8E7")),
        ("LINEABOVE", (0,1), (1,-1), .6, colors.HexColor("#CED8E7")),
        ("LINEABOVE", (2,1), (3,-1), .6, colors.HexColor("#CED8E7")),
        ("LEFTPADDING", (0,0), (-1,-1), 3*mm), ("RIGHTPADDING", (0,0), (-1,-1), 3*mm),
        ("TOPPADDING", (0,0), (-1,-1), 3*mm), ("BOTTOMPADDING", (0,0), (-1,-1), 3*mm),
    ]))
    S.append(tt)
    S.append(PageBreak())

    # 5 - submission
    S += page_title("How to submit", "Two pathways, one conference")
    S.append(Paragraph("Every submission begins with a <b>500-word abstract</b> naming one of the ten tracks. Interdisciplinary work, industry case studies and policy-oriented research are welcome.", styles["BodyX"]))
    path_a = card("PATHWAY A - ABSTRACT AND PRESENTATION", "Submit the mandatory abstract. Once accepted, register and present without submitting a full paper.", PALE)
    path_b = card("PATHWAY B - ABSTRACT, FULL PAPER AND PRESENTATION", "After abstract acceptance, prepare the manuscript according to the guidelines sent with the decision email. Maximum 10,000 words including references, tables, figures and appendices.", colors.HexColor("#FFF7E5"))
    S.append(Table([[path_a, path_b]], colWidths=[82.5*mm,82.5*mm], style=[("VALIGN",(0,0),(-1,-1),"TOP"), ("LEFTPADDING",(0,0),(-1,-1),1.5*mm), ("RIGHTPADDING",(0,0),(-1,-1),1.5*mm)]))
    S.append(Spacer(1, 5*mm))
    steps = [
        ("1", "ABSTRACT", "Submit a 500-word abstract and identify your track and intended pathway."),
        ("2", "PATHWAY", "Continue with presentation only, or prepare a full paper after abstract acceptance."),
        ("3", "REVIEW", "Abstracts are reviewed by the Track Editor. Full papers undergo double-blind peer review."),
        ("4", "NOTIFICATION", "Authors receive acceptance, rejection or revision decisions with feedback."),
        ("5", "PLACE SECURED", "An accepted abstract still enables registration and presentation if a full paper is not accepted."),
        ("6", "REGISTER", "Accepted authors register; full-paper authors submit final formatting and others submit presentation materials."),
    ]
    step_rows=[]
    for n,t,d in steps:
        step_rows.append([Paragraph(n, ParagraphStyle("sn", parent=styles["CardTitle"], fontSize=15, textColor=colors.white, alignment=TA_CENTER)),
                          Paragraph(f"<b>{t}</b><br/>{d}", styles["BodyX"])])
    st = Table(step_rows, colWidths=[13*mm, 149*mm], rowHeights=[25*mm]*6)
    st.setStyle(TableStyle([("VALIGN", (0,0), (-1,-1), "MIDDLE"), ("BACKGROUND", (0,0), (0,-1), BLUE),
                            ("GRID", (0,0), (-1,-1), .5, colors.HexColor("#D1DAE8")),
                            ("LEFTPADDING", (1,0), (1,-1), 5*mm), ("RIGHTPADDING", (1,0), (1,-1), 4*mm)]))
    S.append(st)
    S.append(PageBreak())

    # 6 - fees
    S += page_title("Registration fees", "Per delegate; GST extra")
    S.append(Paragraph("Fees include the conference kit, certificates, working lunches, refreshments and conference dinner. Travel and accommodation are not included. Virtual delegates receive e-certificates; the digital Book of Abstracts and Conference Proceedings reach every participant.", styles["BodyX"]))
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
    def fee_table(title, data):
        head_style = ParagraphStyle("feehead", parent=styles["CardBody"], fontName=BOLD, textColor=colors.white)
        cooked = [[Paragraph(str(c).replace("\n", "<br/>"), head_style if r == 0 else styles["CardBody"])
                   for c in row] for r, row in enumerate(data)]
        tbl = Table(cooked, colWidths=[61*mm, 33.5*mm, 33.5*mm, 33.5*mm], rowHeights=[15*mm]+[13*mm]*4)
        tbl.setStyle(TableStyle([("BACKGROUND", (0,0), (-1,0), NAVY), ("TEXTCOLOR", (0,0), (-1,0), colors.white),
                                 ("FONTNAME", (0,0), (-1,0), BOLD), ("ALIGN", (1,0), (-1,-1), "CENTER"),
                                 ("VALIGN", (0,0), (-1,-1), "MIDDLE"), ("ROWBACKGROUNDS", (0,1), (-1,-1), [colors.white, PALE]),
                                 ("GRID", (0,0), (-1,-1), .6, colors.HexColor("#BBC9DB")), ("LEFTPADDING", (0,0), (-1,-1), 3*mm)]))
        return KeepTogether([Paragraph(title, styles["Subsection"]), tbl])
    S += [fee_table("INDIAN PARTICIPANTS (INR)", indian), Spacer(1, 5*mm), fee_table("FOREIGN DELEGATES (USD)", foreign), Spacer(1, 6*mm)]
    S.append(card("ON-CAMPUS ACCOMMODATION", "Twin-sharing: Rs 1,800 / $19 per night. Single room: Rs 3,600 / $38 per night. Meals and Wi-Fi included; 18% GST extra. Limited rooms are allotted first-come, first-served.", colors.HexColor("#FFF7E5")))
    S.append(PageBreak())

    # 7 - timeline
    S += page_title("Conference timeline", "Plan your submission")
    dates = [
        ("21 SEP 2026", "Registration opens", "All participants"),
        ("23 NOV 2026", "Abstract submission closes", "All authors"),
        ("30 NOV 2026", "Abstract decisions announced", "All authors"),
        ("08 DEC 2026", "Full paper submission closes", "Pathway B"),
        ("15 DEC 2026", "Full paper decisions announced", "Pathway B"),
        ("20 DEC 2026", "Early bird registration closes", "All participants"),
        ("24 JAN 2027", "Regular registration closes", "All participants"),
        ("25-27 FEB 2027", "GLOGIFT 2027", "IIM Sambalpur"),
    ]
    dr=[]
    for i,(d,e,w) in enumerate(dates):
        dr.append([Paragraph(d, ParagraphStyle("date", parent=styles["CardTitle"], textColor=colors.white, alignment=TA_CENTER)),
                   Paragraph(f"<b>{e}</b><br/><font color='#5A6478'>{w}</font>", styles["BodyX"])])
    dt=Table(dr, colWidths=[42*mm,120*mm], rowHeights=[24*mm]*8)
    dt.setStyle(TableStyle([("VALIGN",(0,0),(-1,-1),"MIDDLE"), ("BACKGROUND",(0,0),(0,-1),NAVY),
                            ("ROWBACKGROUNDS",(1,0),(1,-1),[colors.white,PALE]), ("GRID",(0,0),(-1,-1),.5,colors.HexColor("#CBD5E4")),
                            ("LEFTPADDING",(1,0),(1,-1),6*mm)]))
    S.append(dt)
    S.append(Spacer(1, 8*mm))
    cta = Table([[Paragraph("READY TO SHARE YOUR WORK?", styles["WhiteTitle"])],
                 [Paragraph("Submit through the conference portal at <b>glogift2027.in</b>", styles["WhiteBody"]) ]], colWidths=[162*mm])
    cta.setStyle(TableStyle([("BACKGROUND",(0,0),(-1,-1),NAVY), ("BOX",(0,0),(-1,-1),1.2,GOLD),
                             ("TOPPADDING",(0,0),(-1,-1),5*mm), ("BOTTOMPADDING",(0,0),(-1,-1),5*mm)]))
    S.append(cta)
    S.append(PageBreak())

    # 8 - leadership/contact
    S += page_title("Leadership and contact", "We look forward to welcoming you")
    people = [
        ("mp-jaiswal.jpg", "Conference Patron", "Prof (Dr) M. P. Jaiswal", "Director, IIM Sambalpur"),
        ("sushil.jpg", "GLOGIFT President", "Prof (Dr) Sushil", "Founder, GLOGIFT Society; Emeritus Professor, IIT Delhi"),
        ("seema-gupta.jpg", "Conference Convenor", "Prof (Dr) Seema Gupta", "IIM Sambalpur"),
        ("saumyaranjan-sahoo.jpg", "Conference Co-Convenor", "Prof (Dr) Saumyaranjan Sahoo", "IIM Sambalpur"),
    ]
    cells=[]
    for fn,role,name,aff in people:
        cells.append([img(PUBLIC/"people"/fn, 31*mm,31*mm), Paragraph(f"<font color='#E96745'><b>{role}</b></font><br/><b>{name}</b><br/><font size='7.5'>{aff}</font>", styles["CardBody"])])
    pr=Table(cells, colWidths=[35*mm,47.5*mm], rowHeights=[39*mm]*4)
    pr.setStyle(TableStyle([("VALIGN",(0,0),(-1,-1),"MIDDLE"), ("GRID",(0,0),(-1,-1),.5,colors.HexColor("#D2DBE8")),
                            ("BACKGROUND",(0,0),(-1,-1),colors.white), ("LEFTPADDING",(0,0),(-1,-1),3*mm), ("RIGHTPADDING",(0,0),(-1,-1),3*mm)]))
    S.append(pr)
    S.append(Spacer(1, 7*mm))
    contact = Table([
        [Paragraph("ORGANISING INSTITUTION", styles["CardTitle"]), Paragraph("CO-ORGANISED WITH", styles["CardTitle"])],
        [Paragraph("Indian Institute of Management Sambalpur<br/>Basantpur, Sambalpur, Odisha, India", styles["BodyX"]),
         Paragraph("GLOGIFT Society - Global Institute of Flexible Systems Management<br/>B-51 (Basement), Sarvodaya Enclave, New Delhi 110017", styles["BodyX"])],
    ], colWidths=[82.5*mm,82.5*mm])
    contact.setStyle(TableStyle([("VALIGN",(0,0),(-1,-1),"TOP"), ("BACKGROUND",(0,0),(-1,-1),PALE),
                                 ("BOX",(0,0),(-1,-1),.7,colors.HexColor("#C6D2E2")), ("INNERGRID",(0,0),(-1,-1),.7,colors.HexColor("#C6D2E2")),
                                 ("LEFTPADDING",(0,0),(-1,-1),4*mm), ("RIGHTPADDING",(0,0),(-1,-1),4*mm),
                                 ("TOPPADDING",(0,0),(-1,-1),3*mm), ("BOTTOMPADDING",(0,0),(-1,-1),3*mm)]))
    S.append(contact)
    S.append(Spacer(1, 6*mm))
    S.append(Paragraph("<b>Conference Chair:</b> glogift27.chair@iimsambalpur.ac.in<br/><b>Conference Coordinator:</b> glogift27.coordinator@iimsambalpur.ac.in<br/><b>Website:</b> glogift2027.in", ParagraphStyle("contact", parent=styles["BodyX"], fontSize=11, leading=17, textColor=NAVY, alignment=TA_CENTER)))
    return S


def main():
    OUT.parent.mkdir(parents=True, exist_ok=True)
    frame = Frame(MARGIN, 13*mm, PAGE_W-2*MARGIN, PAGE_H-30*mm, id="content")
    doc = BrochureDoc(str(OUT), pagesize=A4, leftMargin=MARGIN, rightMargin=MARGIN,
                      topMargin=17*mm, bottomMargin=13*mm, title="GLOGIFT 2027 Conference Brochure",
                      author="Indian Institute of Management Sambalpur and GLOGIFT Society")
    # Draw navigation furniture after flowables so dense feature pages cannot obscure it.
    doc.addPageTemplates([PageTemplate(id="brochure", frames=[frame], onPageEnd=header_footer)])
    doc.build(build_story())
    print(OUT)


if __name__ == "__main__":
    main()
