"""Create coordinated GLOGIFT 2027 flyer and external website banner."""

from pathlib import Path
from textwrap import wrap

from PIL import Image, ImageDraw, ImageFont
from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas
from reportlab.lib.utils import ImageReader


ROOT = Path(__file__).resolve().parents[1]
PUBLIC = ROOT / "public"
OUT = ROOT / "output" / "marketing"
PDF_OUT = ROOT / "output" / "pdf"

NAVY = "#082B66"
BLUE = "#1248A0"
DEEP = "#041C43"
GOLD = "#E7A91F"
CORAL = "#E96745"
IVORY = "#FBF8F0"
INK = "#17223B"
MUTED = "#5D6D87"
PALE = "#EEF3FA"
WHITE = "#FFFFFF"

FONT_REG = "C:/Windows/Fonts/arial.ttf"
FONT_BOLD = "C:/Windows/Fonts/arialbd.ttf"
FONT_DISPLAY = "C:/Windows/Fonts/georgiab.ttf"
FONT_ITALIC = "C:/Windows/Fonts/georgiai.ttf"


def font(path, size):
    return ImageFont.truetype(path, size)


def fit_font(draw, text, path, max_size, max_width, min_size=16):
    for size in range(max_size, min_size - 1, -1):
        f = font(path, size)
        if draw.textbbox((0, 0), text, font=f)[2] <= max_width:
            return f
    return font(path, min_size)


def paste_contain(base, path, box, padding=0):
    x0, y0, x1, y1 = box
    im = Image.open(path).convert("RGBA")
    limit = (max(1, x1 - x0 - 2 * padding), max(1, y1 - y0 - 2 * padding))
    im.thumbnail(limit, Image.Resampling.LANCZOS)
    x = x0 + (x1 - x0 - im.width) // 2
    y = y0 + (y1 - y0 - im.height) // 2
    base.alpha_composite(im, (x, y))


def centered(draw, y, text, f, fill, width, x0=0):
    box = draw.textbbox((0, 0), text, font=f)
    draw.text((x0 + (width - (box[2] - box[0])) / 2, y), text, font=f, fill=fill)


def wrapped(draw, box, text, f, fill, line_gap=5, align="left"):
    x0, y0, x1, _ = box
    words = text.split()
    lines, current = [], ""
    for word in words:
        trial = f"{current} {word}".strip()
        if current and draw.textbbox((0, 0), trial, font=f)[2] > x1 - x0:
            lines.append(current)
            current = word
        else:
            current = trial
    if current:
        lines.append(current)
    y = y0
    line_h = draw.textbbox((0, 0), "Ag", font=f)[3]
    for line in lines:
        line_w = draw.textbbox((0, 0), line, font=f)[2]
        x = x0 if align == "left" else x0 + (x1 - x0 - line_w) / 2
        draw.text((x, y), line, font=f, fill=fill)
        y += line_h + line_gap
    return y


def motif(draw, width, height, colour=GOLD):
    for side in (0, width - 28):
        draw.rectangle((side, 0, side + 28, height), fill=NAVY)
        for y in range(30, height, 72):
            cx = side + 14
            draw.polygon([(cx, y), (cx + 9, y + 12), (cx, y + 24), (cx - 9, y + 12)], fill=colour)
            draw.ellipse((cx - 4, y + 8, cx + 4, y + 16), fill=CORAL)


def flyer():
    w, h = 1240, 1754
    im = Image.new("RGBA", (w, h), IVORY)
    d = ImageDraw.Draw(im)
    motif(d, w, h)
    d.rectangle((28, 0, w - 28, 7), fill=BLUE)

    # Institution band
    d.rounded_rectangle((64, 34, w - 64, 192), radius=18, fill=WHITE, outline=GOLD, width=2)
    paste_contain(im, PUBLIC / "glogift-logo.png", (82, 48, 320, 178), 4)
    d.line((337, 58, 337, 168), fill=MUTED, width=2)
    paste_contain(im, PUBLIC / "iim-sambalpur.png", (360, 48, 1155, 178), 4)

    # Hero
    d.rounded_rectangle((64, 220, w - 64, 700), radius=28, fill=NAVY)
    d.ellipse((930, 180, 1290, 540), fill=BLUE)
    d.ellipse((-100, 530, 260, 890), fill=DEEP)
    centered(d, 252, "GLOGIFT 2027", font(FONT_DISPLAY, 80), GOLD, w)
    centered(d, 350, "INTERNATIONAL CONFERENCE ON", font(FONT_BOLD, 24), WHITE, w)
    title_f = fit_font(d, "AI-Driven Solutions in Management", FONT_BOLD, 51, 1030)
    centered(d, 397, "AI-Driven Solutions in Management", title_f, WHITE, w)
    d.rounded_rectangle((178, 470, w - 178, 530), radius=10, fill=GOLD)
    centered(d, 480, "Flexibility, Digitalisation & Decarbonization", font(FONT_ITALIC, 30), NAVY, w)
    centered(d, 565, "25-27 FEBRUARY 2027", font(FONT_DISPLAY, 38), WHITE, w)
    centered(d, 620, "IIM Sambalpur, Odisha, India  |  In-Person + Hybrid", font(FONT_BOLD, 24), WHITE, w)

    # Callout band
    d.rounded_rectangle((64, 727, w - 64, 820), radius=18, fill=GOLD)
    centered(d, 745, "CALL FOR SUBMISSIONS", font(FONT_BOLD, 42), NAVY, w)
    centered(d, 793, "glogift2027.in/login", font(FONT_BOLD, 24), NAVY, w)

    # Two-column information area
    left = (64, 850, 602, 1458)
    right = (624, 850, w - 64, 1458)
    for box in (left, right):
        d.rounded_rectangle(box, radius=20, fill=WHITE, outline=GOLD, width=3)
    d.rounded_rectangle((64, 850, 602, 920), radius=20, fill=BLUE)
    d.rectangle((64, 900, 602, 920), fill=BLUE)
    centered(d, 868, "RESEARCH THEMES", font(FONT_BOLD, 26), WHITE, left[2] - left[0], left[0])
    themes = [
        "AI in Finance, Accounting & FinTech",
        "Operations, Supply Chain & Industry 5.0",
        "Digital Transformation & Intelligent Business",
        "Sustainable Finance & Decarbonization",
        "AI in Marketing & Consumer Insights",
        "Governance, Ethics & Responsible AI",
        "Analytics, Big Data & Intelligent Systems",
        "Human Capital, Leadership & Future of Work",
        "Strategy, Innovation & Emerging Models",
        "Inclusive Growth & Global Transformation",
    ]
    yy = 950
    for i, item in enumerate(themes, 1):
        d.ellipse((90, yy + 7, 104, yy + 21), fill=CORAL)
        wrapped(d, (120, yy, 570, yy + 45), f"{i:02d}  {item}", font(FONT_REG, 20), INK, 2)
        yy += 46

    d.rounded_rectangle((624, 850, w - 64, 920), radius=20, fill=GOLD)
    d.rectangle((624, 900, w - 64, 920), fill=GOLD)
    centered(d, 868, "KEY DATES", font(FONT_BOLD, 27), NAVY, right[2] - right[0], right[0])
    dates = [
        ("7 AUG 2026", "Open for abstract submission"),
        ("21 SEP 2026", "Registration opens"),
        ("23 NOV 2026", "Abstract submission closes"),
        ("30 NOV 2026", "Abstract decisions announced"),
        ("8 DEC 2026", "Full paper submission closes"),
        ("15 DEC 2026", "Full paper decisions announced"),
        ("20 DEC 2026", "Early bird registration closes"),
        ("24 JAN 2027", "Regular registration closes"),
    ]
    yy = 944
    for date, event in dates:
        d.text((650, yy), date, font=font(FONT_BOLD, 18), fill=BLUE)
        d.text((820, yy), event, font=font(FONT_REG, 17), fill=INK)
        d.line((650, yy + 29, 1124, yy + 29), fill="#D5DDEA", width=2)
        yy += 48

    d.rounded_rectangle((650, 1340, 1128, 1440), radius=14, fill=PALE, outline=BLUE, width=2)
    d.text((676, 1353), "PUBLICATION OPPORTUNITIES", font=font(FONT_BOLD, 19), fill=NAVY)
    d.text((676, 1381), "Conference Proceedings with ISBN", font=font(FONT_REG, 14), fill=INK)
    d.text((676, 1402), "Selected papers considered for Springer journals (ABDC listed)", font=font(FONT_REG, 13), fill=INK)
    d.text((676, 1422), "and Springer Scopus-indexed Book Series", font=font(FONT_REG, 13), fill=INK)

    # CTA footer
    d.rectangle((28, 1490, w - 28, h), fill=NAVY)
    d.rectangle((28, 1490, w - 28, 1500), fill=GOLD)
    centered(d, 1530, "SUBMIT YOUR ABSTRACT", font(FONT_DISPLAY, 38), GOLD, w)
    centered(d, 1584, "www.glogift2027.in", font(FONT_BOLD, 34), WHITE, w)
    centered(d, 1634, "glogift27.chair@iimsambalpur.ac.in", font(FONT_REG, 23), WHITE, w)
    centered(d, 1682, "Jointly organised by IIM Sambalpur and the GLOGIFT Society", font(FONT_REG, 20), "#D8E5FA", w)

    OUT.mkdir(parents=True, exist_ok=True)
    path = OUT / "glogift-2027-call-for-submissions-flyer.png"
    im.convert("RGB").save(path, quality=96, dpi=(300, 300))

    PDF_OUT.mkdir(parents=True, exist_ok=True)
    pdf_path = PDF_OUT / "glogift-2027-call-for-submissions-flyer.pdf"
    c = canvas.Canvas(str(pdf_path), pagesize=A4)
    pw, ph = A4
    c.drawImage(ImageReader(im.convert("RGB")), 0, 0, width=pw, height=ph)
    c.showPage()
    c.save()
    return path, pdf_path


def banner():
    w, h = 1920, 673
    im = Image.new("RGBA", (w, h), DEEP)
    d = ImageDraw.Draw(im)
    d.rectangle((0, 0, 1250, h), fill=NAVY)
    d.polygon([(1210, 0), (1510, 0), (1240, h), (940, h)], fill=BLUE)
    d.ellipse((1470, -180, 2050, 400), fill=BLUE)
    d.ellipse((1570, 310, 2050, 790), fill=NAVY)
    for x in range(1460, 1940, 70):
        d.line((x, 390, x - 190, 670), fill="#2A5EAF", width=2)
    d.rectangle((0, 0, w, 10), fill=GOLD)
    d.rectangle((0, h - 10, w, h), fill=GOLD)

    d.rounded_rectangle((62, 38, 875, 145), radius=18, fill=WHITE, outline=GOLD, width=2)
    paste_contain(im, PUBLIC / "glogift-logo.png", (76, 46, 245, 137), 3)
    d.line((260, 57, 260, 126), fill=MUTED, width=2)
    paste_contain(im, PUBLIC / "iim-sambalpur.png", (280, 48, 852, 136), 3)

    d.text((66, 176), "GLOGIFT 2027", font=font(FONT_DISPLAY, 70), fill=GOLD)
    d.rounded_rectangle((66, 266, 450, 318), radius=24, fill=CORAL)
    centered(d, 276, "CALL FOR SUBMISSIONS", font(FONT_BOLD, 24), WHITE, 384, 66)
    d.text((66, 342), "AI-Driven Solutions in Management", font=font(FONT_BOLD, 44), fill=WHITE)
    d.text((66, 402), "Flexibility, Digitalisation & Decarbonization", font=font(FONT_ITALIC, 29), fill=GOLD)
    d.text((66, 474), "25-27 February 2027  |  IIM Sambalpur, Odisha", font=font(FONT_BOLD, 26), fill=WHITE)
    d.text((66, 522), "500-word abstract  |  10 conference tracks  |  In-Person + Hybrid", font=font(FONT_REG, 22), fill="#D9E6FB")
    d.text((66, 582), "Open: 7 Aug 2026   |   Abstract deadline: 23 Nov 2026", font=font(FONT_BOLD, 22), fill=GOLD)

    d.rounded_rectangle((1390, 120, 1840, 550), radius=30, fill=WHITE, outline=GOLD, width=4)
    centered(d, 162, "SHARE YOUR WORK", font(FONT_BOLD, 29), NAVY, 450, 1390)
    d.line((1450, 220, 1780, 220), fill=GOLD, width=3)
    centered(d, 258, "Selected papers considered for", font(FONT_REG, 20), INK, 450, 1390)
    centered(d, 294, "ABDC-listed Springer journals", font(FONT_BOLD, 22), BLUE, 450, 1390)
    centered(d, 338, "and a Springer Scopus-indexed", font(FONT_REG, 20), INK, 450, 1390)
    centered(d, 374, "Book Series", font(FONT_BOLD, 22), BLUE, 450, 1390)
    d.rounded_rectangle((1450, 438, 1780, 505), radius=12, fill=GOLD)
    centered(d, 450, "glogift2027.in", font(FONT_BOLD, 28), NAVY, 330, 1450)
    d.text((1398, 575), "IIM SAMBALPUR  x  GLOGIFT SOCIETY", font=font(FONT_BOLD, 18), fill=WHITE)

    OUT.mkdir(parents=True, exist_ok=True)
    path = OUT / "glogift-2027-call-for-submissions-banner-1920x673.png"
    im.convert("RGB").save(path, quality=96)
    return path


if __name__ == "__main__":
    print(*flyer(), sep="\n")
    print(banner())
