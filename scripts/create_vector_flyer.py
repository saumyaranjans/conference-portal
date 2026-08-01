"""Create the GLOGIFT 2027 flyer as a native vector/text PDF."""

from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib.utils import ImageReader
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfgen import canvas

from create_brochure import (
    ROOT, PUBLIC, NAVY, BLUE, GOLD, CORAL, INK, MUTED, PALE,
    BODY, BOLD, DISPLAY,
)


OUT = ROOT / "output" / "pdf" / "glogift-2027-reference-design-flyer.pdf"
PAGE_W, PAGE_H = A4
PAPER = colors.HexColor("#FFFDF8")
LIGHT_GOLD = colors.HexColor("#FFF6DD")
LINE = colors.HexColor("#CBD6E5")


def fit_size(text, font_name, max_size, max_width, min_size=6):
    size = max_size
    while size > min_size and pdfmetrics.stringWidth(text, font_name, size) > max_width:
        size -= .2
    return size


def wrap(text, font_name, size, max_width):
    words = text.split()
    lines, current = [], ""
    for word in words:
        candidate = f"{current} {word}".strip()
        if current and pdfmetrics.stringWidth(candidate, font_name, size) > max_width:
            lines.append(current)
            current = word
        else:
            current = candidate
    if current:
        lines.append(current)
    return lines


def draw_centred(c, text, y, font_name, size, colour, max_width=None):
    if max_width:
        size = fit_size(text, font_name, size, max_width)
    c.setFont(font_name, size)
    c.setFillColor(colour)
    c.drawCentredString(PAGE_W / 2, y, text)


def draw_contain(c, path, x, y, width, height):
    image = ImageReader(str(path))
    image_width, image_height = image.getSize()
    scale = min(width / image_width, height / image_height)
    draw_width, draw_height = image_width * scale, image_height * scale
    c.drawImage(image, x + (width - draw_width) / 2, y + (height - draw_height) / 2,
                width=draw_width, height=draw_height, mask="auto")


def network_pattern(c, x, y, mirror=False):
    points = [(0, 0), (14, 22), (34, 9), (46, 37), (68, 20), (82, 49), (98, 30)]
    if mirror:
        points = [(-px, py) for px, py in points]
    c.saveState()
    c.setStrokeColor(colors.HexColor("#D8DEE7"))
    c.setLineWidth(.45)
    for index in range(len(points) - 1):
        x1, y1 = points[index]
        x2, y2 = points[index + 1]
        c.line(x + x1, y + y1, x + x2, y + y2)
    for index in range(len(points) - 2):
        x1, y1 = points[index]
        x2, y2 = points[index + 2]
        c.line(x + x1, y + y1, x + x2, y + y2)
    c.setFillColor(colors.HexColor("#BFC7D2"))
    for px, py in points:
        c.circle(x + px, y + py, 1.8, fill=1, stroke=0)
    c.restoreState()


def panel(c, x, y, width, height, title, header_colour=NAVY):
    c.setFillColor(PAPER)
    c.setStrokeColor(GOLD)
    c.setLineWidth(1)
    c.roundRect(x, y, width, height, 8, fill=1, stroke=1)
    header_height = 29
    c.setFillColor(header_colour)
    c.roundRect(x, y + height - header_height, width, header_height, 8, fill=1, stroke=0)
    c.setFillColor(colors.white if header_colour != GOLD else NAVY)
    c.setFont(BOLD, 13.5)
    c.drawCentredString(x + width / 2, y + height - 20, title)
    return header_height


def calendar_icon(c, x, y, size=17, circle=False):
    c.saveState()
    if circle:
        c.setStrokeColor(GOLD)
        c.setLineWidth(1.2)
        c.circle(x, y, size * .95, fill=0, stroke=1)
    c.setStrokeColor(CORAL if not circle else GOLD)
    c.setLineWidth(1.4)
    left, bottom = x - size * .48, y - size * .42
    c.roundRect(left, bottom, size * .96, size * .82, 2, fill=0, stroke=1)
    c.line(left, bottom + size * .55, left + size * .96, bottom + size * .55)
    c.line(x - size * .25, bottom + size * .67, x - size * .25, bottom + size * .92)
    c.line(x + size * .25, bottom + size * .67, x + size * .25, bottom + size * .92)
    for dx in (-.24, 0, .24):
        for dy in (.13, .32):
            c.circle(x + dx * size, bottom + dy * size, .8, fill=1, stroke=0)
    c.restoreState()


def pin_icon(c, x, y, size=17):
    c.saveState()
    c.setStrokeColor(GOLD)
    c.setLineWidth(1.2)
    c.circle(x, y, size * .95, fill=0, stroke=1)
    p = c.beginPath()
    p.moveTo(x, y - size * .55)
    p.curveTo(x - size * .5, y, x - size * .35, y + size * .45, x, y + size * .45)
    p.curveTo(x + size * .35, y + size * .45, x + size * .5, y, x, y - size * .55)
    c.setFillColor(GOLD)
    c.drawPath(p, fill=1, stroke=0)
    c.setFillColor(NAVY)
    c.circle(x, y + size * .12, size * .12, fill=1, stroke=0)
    c.restoreState()


def people_icon(c, x, y, size=17):
    c.saveState()
    c.setStrokeColor(GOLD)
    c.setLineWidth(1.2)
    c.circle(x, y, size * .95, fill=0, stroke=1)
    c.setFillColor(GOLD)
    c.circle(x, y + size * .25, size * .18, fill=1, stroke=0)
    c.circle(x - size * .38, y + size * .15, size * .14, fill=1, stroke=0)
    c.circle(x + size * .38, y + size * .15, size * .14, fill=1, stroke=0)
    c.roundRect(x - size * .3, y - size * .45, size * .6, size * .46, 4, fill=1, stroke=0)
    c.roundRect(x - size * .7, y - size * .42, size * .35, size * .36, 4, fill=1, stroke=0)
    c.roundRect(x + size * .35, y - size * .42, size * .35, size * .36, 4, fill=1, stroke=0)
    c.restoreState()


def publication_icon(c, x, y, kind="book", radius=10):
    c.saveState()
    c.setFillColor(BLUE)
    c.circle(x, y, radius, fill=1, stroke=0)
    c.setStrokeColor(colors.white)
    c.setLineWidth(1.2)
    if kind == "book":
        c.rect(x - 6.5, y - 5.5, 5.3, 11, fill=0, stroke=1)
        c.rect(x + 1.2, y - 5.5, 5.3, 11, fill=0, stroke=1)
        c.line(x, y - 6, x, y + 6)
    else:
        for offset in (4, 0, -4):
            p = c.beginPath()
            p.moveTo(x - 6.5, y + offset + 2)
            p.lineTo(x, y + offset - 2)
            p.lineTo(x + 6.5, y + offset + 2)
            c.drawPath(p, fill=0, stroke=1)
    c.restoreState()


def globe_icon(c, x, y, radius=14):
    c.saveState()
    c.setStrokeColor(GOLD)
    c.setLineWidth(1.1)
    c.circle(x, y, radius, fill=0, stroke=1)
    c.ellipse(x - radius * .48, y - radius, x + radius * .48, y + radius, fill=0, stroke=1)
    c.line(x - radius, y, x + radius, y)
    c.ellipse(x - radius, y - radius * .48, x + radius, y + radius * .48, fill=0, stroke=1)
    c.restoreState()


def mail_icon(c, x, y, width=15):
    c.saveState()
    c.setStrokeColor(GOLD)
    c.setLineWidth(1.1)
    height = width * .68
    c.roundRect(x, y, width, height, 2, fill=0, stroke=1)
    c.line(x, y + height, x + width / 2, y + height * .43)
    c.line(x + width, y + height, x + width / 2, y + height * .43)
    c.restoreState()


def leaf(c, x, y, width, height, colour, angle=0):
    c.saveState()
    c.translate(x, y)
    c.rotate(angle)
    p = c.beginPath()
    p.moveTo(0, 0)
    p.curveTo(-width * .55, height * .32, -width * .45, height * .76, 0, height)
    p.curveTo(width * .45, height * .76, width * .55, height * .32, 0, 0)
    c.setFillColor(colour)
    c.drawPath(p, fill=1, stroke=0)
    c.setStrokeColor(colors.white)
    c.setLineWidth(.6)
    c.line(0, 4, 0, height - 7)
    for fraction in (.25, .43, .61, .79):
        yy = height * fraction
        c.line(0, yy, -width * .28, yy + height * .09)
        c.line(0, yy, width * .28, yy + height * .09)
    c.restoreState()


def draw_track(c, x, y, number, text, width, height):
    c.setFillColor(colors.HexColor("#F5F8FC") if number % 2 else colors.white)
    c.rect(x, y, width, height, fill=1, stroke=0)
    c.setStrokeColor(LINE)
    c.setLineWidth(.45)
    c.line(x, y, x + width, y)
    c.setFillColor(CORAL)
    c.setFont(BOLD, 8.6)
    c.drawString(x + 4, y + height - 12, f"{number:02d}")
    text_x = x + 20
    text_width = width - 24
    size = 8.5
    lines = wrap(text, BODY, size, text_width)
    while len(lines) > 3 and size > 7.6:
        size -= .2
        lines = wrap(text, BODY, size, text_width)
    leading = size + .9
    total_height = len(lines) * leading
    baseline = y + (height + total_height) / 2 - leading
    c.setFillColor(INK)
    c.setFont(BODY, size)
    for index, line in enumerate(lines[:3]):
        c.drawString(text_x, baseline - index * leading, line)


def build():
    OUT.parent.mkdir(parents=True, exist_ok=True)
    c = canvas.Canvas(str(OUT), pagesize=A4, pageCompression=1)
    c.setTitle("GLOGIFT 2027 Conference Flyer")
    c.setAuthor("Indian Institute of Management Sambalpur and GLOGIFT Society")
    c.setSubject("Call for submissions for GLOGIFT 2027")
    c.setKeywords("GLOGIFT 2027, IIM Sambalpur, conference, call for submissions")

    # Page and subtle technical background.
    c.setFillColor(PAPER)
    c.rect(0, 0, PAGE_W, PAGE_H, fill=1, stroke=0)
    c.setStrokeColor(BLUE)
    c.setLineWidth(2)
    c.rect(1, 1, PAGE_W - 2, PAGE_H - 2, fill=0, stroke=1)
    network_pattern(c, 3, 635)
    network_pattern(c, PAGE_W - 3, 635, mirror=True)
    c.setStrokeColor(colors.HexColor("#CBDDF2"))
    c.setLineWidth(.6)
    for offset in range(0, 55, 9):
        c.arc(-48 - offset, 416 - offset, 170 + offset, 615 + offset, 10, 76)
        c.arc(PAGE_W - 120, 374 - offset, PAGE_W + 60 + offset, 575 + offset, 95, 78)

    # Logos.
    draw_contain(c, PUBLIC / "glogift-logo.png", 34, 758, 78, 60)
    c.setStrokeColor(MUTED)
    c.setLineWidth(.7)
    c.line(122, 761, 122, 817)
    draw_contain(c, PUBLIC / "iim-sambalpur.png", 135, 765, 420, 48)

    # Conference identity.
    draw_centred(c, "GLOGIFT 2027", 703, DISPLAY, 43, NAVY, 500)
    draw_centred(c, "INTERNATIONAL CONFERENCE ON", 679, BOLD, 11.5, INK, 410)
    c.setStrokeColor(GOLD)
    c.setLineWidth(1)
    c.line(86, 684, 123, 684)
    c.line(PAGE_W - 123, 684, PAGE_W - 86, 684)
    draw_centred(c, "AI-Driven Solutions in Management", 642, BOLD, 25, BLUE, 530)
    c.setFillColor(NAVY)
    c.roundRect(73, 597, PAGE_W - 146, 30, 4, fill=1, stroke=0)
    draw_centred(c, "Flexibility, Digitalisation & Decarbonization", 606,
                 DISPLAY, 13.5, GOLD, PAGE_W - 170)

    # Date, venue and format panel.
    info_x, info_y, info_w, info_h = 27, 446, 430, 135
    c.setFillColor(NAVY)
    c.setStrokeColor(GOLD)
    c.setLineWidth(1.1)
    c.roundRect(info_x, info_y, info_w, info_h, 10, fill=1, stroke=1)
    icon_x = info_x + 42
    calendar_icon(c, icon_x, info_y + 101, 20, circle=True)
    pin_icon(c, icon_x, info_y + 66, 20)
    people_icon(c, icon_x, info_y + 31, 20)
    c.setStrokeColor(GOLD)
    c.setLineWidth(.7)
    c.line(info_x + 78, info_y + 86, info_x + info_w - 22, info_y + 86)
    c.line(info_x + 78, info_y + 51, info_x + info_w - 22, info_y + 51)
    c.setFillColor(GOLD)
    c.setFont(DISPLAY, 21)
    c.drawString(info_x + 86, info_y + 94, "25-27 February 2027")
    c.setFillColor(colors.white)
    c.setFont(BOLD, 15.5)
    c.drawString(info_x + 86, info_y + 59, "IIM Sambalpur, Odisha, India")
    c.setFont(BOLD, 14.5)
    c.drawString(info_x + 86, info_y + 24, "In-Person | Hybrid")

    # Complete vector leaf motif.
    c.setStrokeColor(GOLD)
    c.setLineWidth(1)
    c.line(475, 451, 536, 566)
    leaf(c, 500, 481, 29, 66, NAVY, -22)
    leaf(c, 521, 507, 29, 69, GOLD, 15)
    leaf(c, 535, 459, 33, 76, BLUE, 32)

    # Call for submissions and ten tracks.
    left_x, left_y, left_w, left_h = 27, 82, 265, 348
    panel(c, left_x, left_y, left_w, left_h, "CALL FOR SUBMISSIONS")
    c.setFillColor(INK)
    c.setFont(BODY, 10.2)
    c.drawCentredString(left_x + left_w / 2, left_y + left_h - 55,
                        "Original research from academicians,")
    c.drawCentredString(left_x + left_w / 2, left_y + left_h - 70,
                        "doctoral scholars and practitioners")
    c.setStrokeColor(GOLD)
    c.setDash(1.3, 2.4)
    c.line(left_x + 18, left_y + left_h - 84, left_x + left_w - 18, left_y + left_h - 84)
    c.setDash()
    c.setFillColor(colors.white)
    c.setStrokeColor(GOLD)
    c.roundRect(left_x + 18, left_y + left_h - 117, left_w - 36, 24, 5, fill=1, stroke=1)
    c.setFillColor(NAVY)
    c.setFont(BOLD, 10.6)
    c.drawCentredString(left_x + left_w / 2, left_y + left_h - 109,
                        "www.glogift2027.in/login")
    c.setFont(BOLD, 11)
    c.drawCentredString(left_x + left_w / 2, left_y + left_h - 139,
                        "10 CONFERENCE TRACKS")
    tracks = [
        "AI in Finance, Accounting, FinTech & Digital Assets",
        "AI for Operations, Supply Chain & Industry 5.0",
        "Digital Transformation & Intelligent Business",
        "Sustainable Finance & Decarbonization",
        "AI in Marketing",
        "Governance, Ethics & Responsible AI",
        "Analytics, Big Data & Intelligent Systems",
        "Human Capital & Leadership",
        "Strategy, Innovation & Emerging Business Models",
        "Inclusive Growth & Global Transformation",
    ]
    grid_x = left_x + 10
    grid_y = left_y + 12
    grid_w = left_w - 20
    cell_w = grid_w / 2
    cell_h = 37
    c.setStrokeColor(LINE)
    c.line(grid_x + cell_w, grid_y, grid_x + cell_w, grid_y + cell_h * 5)
    for index, track in enumerate(tracks):
        column = index % 2
        row = 4 - index // 2
        draw_track(c, grid_x + column * cell_w, grid_y + row * cell_h,
                   index + 1, track, cell_w, cell_h)

    # Key dates.
    right_x, dates_y, right_w, dates_h = 304, 222, 264, 208
    panel(c, right_x, dates_y, right_w, dates_h, "KEY DATES", GOLD)
    dates = [
        ("Open for abstract submission", "7 AUG 2026"),
        ("Registration opens", "21 SEP 2026"),
        ("Abstract submission closes", "23 NOV 2026"),
        ("Abstract decisions announced", "30 NOV 2026"),
        ("Full paper submission closes", "8 DEC 2026"),
        ("Early bird registration closes", "20 DEC 2026"),
    ]
    row_height = (dates_h - 34) / 6
    for index, (label, date) in enumerate(dates):
        row_top = dates_y + dates_h - 32 - index * row_height
        icon_y = row_top - row_height / 2
        calendar_icon(c, right_x + 23, icon_y, 13)
        c.setFillColor(INK)
        label_size = fit_size(label, BODY, 8.7, right_w - 62, 7.4)
        c.setFont(BODY, label_size)
        c.drawString(right_x + 42, row_top - 11, label)
        c.setFillColor(NAVY)
        c.setFont(BOLD, 8.9)
        c.drawString(right_x + 42, row_top - 21, date)
        if index < 5:
            c.setStrokeColor(GOLD)
            c.setLineWidth(.45)
            c.line(right_x + 42, row_top - row_height + 1,
                   right_x + right_w - 16, row_top - row_height + 1)

    # Publication opportunities.
    pubs_y, pubs_h = 82, 130
    panel(c, right_x, pubs_y, right_w, pubs_h, "PUBLICATION OPPORTUNITIES")
    publications = [
        ("Conference Proceedings with ISBN", "book"),
        ("Springer Journals (ABDC Listed)", "stack"),
        ("Springer Scopus-Indexed Book Series", "stack"),
    ]
    for index, (label, kind) in enumerate(publications):
        row_y = pubs_y + pubs_h - 49 - index * 29
        publication_icon(c, right_x + 27, row_y + 2, kind, 10.5)
        size = fit_size(label, BODY, 9.6, right_w - 62, 8.2)
        c.setFillColor(INK)
        c.setFont(BODY, size)
        c.drawString(right_x + 47, row_y - 1, label)

    # Footer with complete vector contact icons.
    c.setFillColor(NAVY)
    c.rect(0, 0, PAGE_W, 72, fill=1, stroke=0)
    c.setStrokeColor(GOLD)
    c.setLineWidth(.8)
    c.line(PAGE_W / 2, 11, PAGE_W / 2, 61)
    globe_icon(c, 76, 40, 15)
    c.setFillColor(GOLD)
    c.setFont(BOLD, 14)
    c.drawString(99, 49, "SUBMIT & REGISTER")
    c.setFillColor(colors.white)
    c.setFont(BODY, 9.5)
    c.drawString(100, 31, "www.glogift2027.in")
    mail_icon(c, 100, 12, 14)
    c.setFont(BODY, 8.7)
    c.drawString(121, 14, "glogift27.chair@iimsambalpur.ac.in")
    c.setFillColor(GOLD)
    c.setFont(DISPLAY, 18)
    c.drawString(325, 44, "Jointly organised by")
    c.setFillColor(colors.white)
    c.setFont(BOLD, 10.5)
    c.drawString(325, 27, "IIM Sambalpur and")
    c.drawString(325, 13, "the GLOGIFT Society")

    c.showPage()
    c.save()
    print(OUT)


if __name__ == "__main__":
    build()
