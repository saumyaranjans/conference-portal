"""Update the approved GLOGIFT flyer design while preserving its visual style."""

import argparse
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont
from reportlab.lib.pagesizes import A4
from reportlab.lib.utils import ImageReader
from reportlab.pdfgen import canvas


ROOT = Path(__file__).resolve().parents[1]
OUT_PNG = ROOT / "output" / "marketing" / "glogift-2027-reference-design-flyer.png"
OUT_PDF = ROOT / "output" / "pdf" / "glogift-2027-reference-design-flyer.pdf"

FONT_REG = "C:/Windows/Fonts/arial.ttf"
FONT_BOLD = "C:/Windows/Fonts/arialbd.ttf"
FONT_NARROW = "C:/Windows/Fonts/arialn.ttf"

NAVY = (5, 42, 101)
BLUE = (13, 58, 143)
ORANGE = (234, 99, 58)
GOLD = (225, 159, 18)
INK = (16, 30, 61)
PAPER = (255, 253, 249)
SCALE = 2


def _scaled_points(points):
    if isinstance(points[0], (tuple, list)):
        return [(round(x * SCALE), round(y * SCALE)) for x, y in points]
    return tuple(round(value * SCALE) for value in points)


class HiResDraw:
    """Draw with logical 1024x1536 coordinates on a high-resolution canvas."""

    def __init__(self, image):
        self.draw = ImageDraw.Draw(image)

    def rounded_rectangle(self, xy, radius=0, width=1, **kwargs):
        return self.draw.rounded_rectangle(
            _scaled_points(xy), radius=round(radius * SCALE),
            width=max(1, round(width * SCALE)), **kwargs
        )

    def rectangle(self, xy, width=1, **kwargs):
        return self.draw.rectangle(
            _scaled_points(xy), width=max(1, round(width * SCALE)), **kwargs
        )

    def line(self, xy, width=1, **kwargs):
        return self.draw.line(
            _scaled_points(xy), width=max(1, round(width * SCALE)), **kwargs
        )

    def ellipse(self, xy, width=1, **kwargs):
        return self.draw.ellipse(
            _scaled_points(xy), width=max(1, round(width * SCALE)), **kwargs
        )

    def polygon(self, xy, **kwargs):
        return self.draw.polygon(_scaled_points(xy), **kwargs)

    def text(self, xy, text, **kwargs):
        return self.draw.text(_scaled_points(xy), text, **kwargs)

    def textbbox(self, xy, text, **kwargs):
        box = self.draw.textbbox(_scaled_points(xy), text, **kwargs)
        return tuple(value / SCALE for value in box)


def font(path, size):
    return ImageFont.truetype(path, round(size * SCALE))


def fit_font(draw, text, path, max_size, max_width, min_size=11):
    for size in range(max_size, min_size - 1, -1):
        candidate = font(path, size)
        if draw.textbbox((0, 0), text, font=candidate)[2] <= max_width:
            return candidate
    return font(path, min_size)


def centre(draw, box, text, face, fill):
    x0, y0, x1, y1 = box
    bounds = draw.textbbox((0, 0), text, font=face)
    width = bounds[2] - bounds[0]
    height = bounds[3] - bounds[1]
    draw.text((x0 + (x1 - x0 - width) / 2,
               y0 + (y1 - y0 - height) / 2 - bounds[1]),
              text, font=face, fill=fill)


def wrap_lines(draw, text, face, max_width):
    words = text.split()
    lines, current = [], ""
    for word in words:
        candidate = f"{current} {word}".strip()
        if current and draw.textbbox((0, 0), candidate, font=face)[2] > max_width:
            lines.append(current)
            current = word
        else:
            current = candidate
    if current:
        lines.append(current)
    return lines


def calendar_icon(draw, x, y):
    draw.ellipse((x - 4, y - 3, x + 34, y + 35), fill=(255, 241, 232))
    draw.rounded_rectangle((x, y + 3, x + 29, y + 31), radius=4,
                           fill=PAPER, outline=ORANGE, width=3)
    draw.line((x + 3, y + 11, x + 26, y + 11), fill=ORANGE, width=3)
    draw.line((x + 8, y, x + 8, y + 8), fill=ORANGE, width=3)
    draw.line((x + 21, y, x + 21, y + 8), fill=ORANGE, width=3)
    for dx in (8, 15, 22):
        draw.ellipse((x + dx - 2, y + 17, x + dx + 2, y + 21), fill=ORANGE)


def publication_icon(draw, x, y, kind):
    draw.ellipse((x, y, x + 42, y + 42), fill=BLUE)
    if kind == "book":
        draw.rectangle((x + 9, y + 10, x + 19, y + 31), outline="white", width=3)
        draw.rectangle((x + 22, y + 10, x + 32, y + 31), outline="white", width=3)
        draw.line((x + 21, y + 10, x + 21, y + 32), fill="white", width=3)
    else:
        for offset in (0, 7, 14):
            draw.line((x + 9, y + 10 + offset, x + 21, y + 17 + offset,
                       x + 33, y + 10 + offset), fill="white", width=3)


def build(source):
    image = Image.open(source).convert("RGB")
    if image.size != (1024 * SCALE, 1536 * SCALE):
        image = image.resize((1024 * SCALE, 1536 * SCALE), Image.Resampling.LANCZOS)
    draw = HiResDraw(image)

    # Replace the abstract/tracks line with the direct submission link.
    draw.rounded_rectangle((76, 1026, 458, 1074), radius=8,
                           fill=(255, 255, 255), outline=GOLD, width=1)
    centre(draw, (76, 1028, 458, 1070), "www.glogift2027.in/login",
           font(FONT_BOLD, 21), NAVY)

    # Replace abbreviated keywords with the ten complete conference-track names.
    draw.rectangle((72, 1098, 463, 1331), fill=PAPER)
    centre(draw, (72, 1099, 463, 1123), "10 CONFERENCE TRACKS",
           font(FONT_BOLD, 15), NAVY)
    tracks = [
        "AI in Finance, Accounting, FinTech & Digital Assets",
        "AI for Operations, Supply Chain & Industry 5.0",
        "Digital Transformation & Intelligent Business",
        "Sustainable Finance & Decarbonization",
        "AI in Marketing: Consumer Insights, Branding & Customer Engagement",
        "Governance, Ethics & Responsible AI",
        "Analytics, Big Data & Intelligent Systems",
        "Human Capital & Leadership",
        "Strategy, Innovation & Emerging Business Models",
        "Inclusive Growth & Global Transformation",
    ]
    cell_w, cell_h = 194, 41
    for index, track in enumerate(tracks):
        col, row = index % 2, index // 2
        x = 74 + col * cell_w
        y = 1124 + row * cell_h
        if row % 2 == 0:
            draw.rectangle((x, y, x + cell_w - 3, y + cell_h - 2),
                           fill=(249, 251, 254))
        draw.text((x + 5, y + 3), f"{index + 1:02d}",
                  font=font(FONT_BOLD, 12), fill=ORANGE)
        face = font(FONT_NARROW, 13)
        lines = wrap_lines(draw, track, face, cell_w - 34)
        for line_index, line in enumerate(lines[:3]):
            draw.text((x + 29, y + line_index * 13), line,
                      font=face, fill=INK)
        if col == 0:
            draw.line((x + cell_w - 2, y + 3, x + cell_w - 2, y + cell_h - 5),
                      fill=(213, 220, 232), width=1)
        if row < 4:
            draw.line((x + 4, y + cell_h - 2, x + cell_w - 5, y + cell_h - 2),
                      fill=(225, 230, 238), width=1)

    # Refresh the key dates while retaining the original gold header and frame.
    draw.rectangle((540, 892, 948, 1153), fill=PAPER)
    dates = [
        ("7 AUG 2026", "Open for abstract submission"),
        ("21 SEP 2026", "Registration opens"),
        ("23 NOV 2026", "Abstract submission closes"),
        ("30 NOV 2026", "Abstract decisions announced"),
        ("8 DEC 2026", "Full paper submission closes"),
        ("20 DEC 2026", "Early bird registration closes"),
    ]
    row_top = 902
    for index, (date, label) in enumerate(dates):
        y = row_top + index * 41
        calendar_icon(draw, 554, y + 1)
        draw.text((596, y), label, font=font(FONT_REG, 15), fill=INK)
        draw.text((596, y + 18), date, font=font(FONT_BOLD, 15), fill=NAVY)
        if index < len(dates) - 1:
            draw.line((596, y + 38, 928, y + 38), fill=GOLD, width=1)

    # Expand publication opportunities to include the Scopus-indexed book series.
    draw.rectangle((540, 1211, 948, 1346), fill=PAPER)
    publications = [
        ("Conference Proceedings with ISBN", "book"),
        ("Springer Journals (ABDC Listed)", "stack"),
        ("Springer Scopus-Indexed Book Series", "stack"),
    ]
    for index, (label, kind) in enumerate(publications):
        y = 1217 + index * 39
        publication_icon(draw, 548, y - 2, kind)
        face = fit_font(draw, label, FONT_REG, 16, 330)
        draw.text((603, y + 9), label, font=face, fill=INK)
    # Clear remnants from the older, lower publication row and restore a
    # crisp lower rule inside the card.
    draw.rectangle((540, 1337, 948, 1365), fill=PAPER)
    draw.line((555, 1352, 933, 1352), fill=GOLD, width=1)

    # Update the general website address in the footer.
    footer_colour = image.getpixel((380 * SCALE, 1432 * SCALE))
    draw.rectangle((255, 1425, 481, 1471), fill=footer_colour)
    centre(draw, (255, 1426, 481, 1469), "www.glogift2027.in",
           font(FONT_REG, 18), "white")

    OUT_PNG.parent.mkdir(parents=True, exist_ok=True)
    OUT_PDF.parent.mkdir(parents=True, exist_ok=True)
    image = image.filter(ImageFilter.UnsharpMask(radius=1.1 * SCALE, percent=125, threshold=2))
    image.save(OUT_PNG, quality=98, dpi=(300, 300), optimize=True)

    pdf = canvas.Canvas(str(OUT_PDF), pagesize=A4)
    page_w, page_h = A4
    pdf.drawImage(ImageReader(image), 0, 0, width=page_w, height=page_h)
    pdf.showPage()
    pdf.save()
    return OUT_PNG, OUT_PDF


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("source", type=Path)
    args = parser.parse_args()
    print(*build(args.source), sep="\n")
