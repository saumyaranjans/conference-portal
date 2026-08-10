"""Replace the Sambalpur travelogue cover with the current GLOGIFT 27 identity."""

from pathlib import Path

from pypdf import PdfReader, PdfWriter
from reportlab.lib import colors
from reportlab.lib.utils import ImageReader
from reportlab.pdfgen import canvas

from create_brochure import ROOT, PUBLIC, NAVY, BLUE, GOLD, INK, MUTED, BODY, BOLD, DISPLAY


OUTPUT = PUBLIC / "travelogue" / "sambalpur-travelogue-glogift-2027.pdf"
TEMP_DIR = ROOT / "tmp" / "pdfs" / "travelogue-cover"
TEMP_COVER = TEMP_DIR / "cover.pdf"
TEMP_OUTPUT = TEMP_DIR / "travelogue-updated.pdf"
PAGE_W = 595.5
PAGE_H = 842.25009


def draw_contain(pdf, path: Path, x, y, width, height):
    image = ImageReader(str(path))
    image_width, image_height = image.getSize()
    scale = min(width / image_width, height / image_height)
    draw_width, draw_height = image_width * scale, image_height * scale
    pdf.drawImage(
        image,
        x + (width - draw_width) / 2,
        y + (height - draw_height) / 2,
        width=draw_width,
        height=draw_height,
        mask="auto",
    )


def make_cover():
    TEMP_DIR.mkdir(parents=True, exist_ok=True)
    pdf = canvas.Canvas(str(TEMP_COVER), pagesize=(PAGE_W, PAGE_H), pageCompression=1)
    pdf.setTitle("GLOGIFT 27 Sambalpur Travelogue")
    pdf.setAuthor("Indian Institute of Management Sambalpur and GIFT Society")
    pdf.setSubject("Sambalpur travel guide for GLOGIFT 27 delegates")

    pdf.drawImage(
        str(PUBLIC / "travelogue" / "cover-background.jpg"),
        0,
        0,
        width=PAGE_W,
        height=PAGE_H,
        mask="auto",
    )

    draw_contain(pdf, PUBLIC / "iim-sambalpur.png", 48, 760, 290, 40)
    draw_contain(pdf, PUBLIC / "glogift-logo.png", 463, 755, 82, 54)

    pdf.setFillColor(NAVY)
    pdf.setFont(DISPLAY, 35)
    pdf.drawCentredString(PAGE_W / 2, 707, "GLOGIFT 27")
    pdf.setFont(BOLD, 8.2)
    pdf.setFillColor(MUTED)
    pdf.drawCentredString(
        PAGE_W / 2,
        687,
        "TWENTY SEVENTH GLOBAL CONFERENCE ON FLEXIBLE SYSTEMS MANAGEMENT",
    )
    pdf.setFont(BOLD, 10)
    pdf.setFillColor(MUTED)
    pdf.drawCentredString(PAGE_W / 2, 661, "INTERNATIONAL CONFERENCE ON")
    pdf.setFont(BOLD, 16.5)
    pdf.setFillColor(NAVY)
    pdf.drawCentredString(PAGE_W / 2, 638, "AI-Driven Solutions in Management")
    pdf.setFont(BODY, 11)
    pdf.setFillColor(MUTED)
    pdf.drawCentredString(
        PAGE_W / 2, 619, "Flexibility, Digitalisation & Decarbonization"
    )

    draw_contain(
        pdf,
        PUBLIC / "travelogue" / "cover-wheel.png",
        120,
        232,
        PAGE_W - 240,
        360,
    )

    pdf.setFillColor(colors.HexColor("#8C1D24"))
    pdf.setFont(BOLD, 17)
    pdf.drawCentredString(PAGE_W / 2, 192, "SAMBALPUR TRAVELOGUE")
    pdf.setFillColor(INK)
    pdf.setFont(BODY, 10)
    pdf.drawCentredString(
        PAGE_W / 2,
        169,
        "25-27 February 2027  |  IIM Sambalpur, Odisha, India",
    )
    pdf.setFillColor(BLUE)
    pdf.setFont(BOLD, 10.5)
    pdf.drawCentredString(PAGE_W / 2, 148, "www.glogift2027.in")

    pdf.drawImage(
        str(PUBLIC / "travelogue" / "cover-ikat.png"),
        52,
        75,
        width=PAGE_W - 104,
        height=18,
        mask="auto",
    )
    pdf.showPage()
    pdf.save()


def replace_cover():
    make_cover()
    source = PdfReader(str(OUTPUT))
    cover = PdfReader(str(TEMP_COVER))
    writer = PdfWriter()
    writer.add_page(cover.pages[0])
    for page in source.pages[1:]:
        writer.add_page(page)
    metadata = dict(source.metadata or {})
    metadata.update({
        "/Title": "GLOGIFT 27 Sambalpur Travelogue",
        "/Author": "Indian Institute of Management Sambalpur and GIFT Society",
        "/Subject": "Sambalpur travel guide for GLOGIFT 27 delegates",
    })
    writer.add_metadata(metadata)
    with TEMP_OUTPUT.open("wb") as stream:
        writer.write(stream)
    TEMP_OUTPUT.replace(OUTPUT)
    print(OUTPUT)


if __name__ == "__main__":
    replace_cover()
