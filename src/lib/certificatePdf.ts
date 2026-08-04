import fontkit from "@pdf-lib/fontkit";
import { readFile } from "node:fs/promises";
import path from "node:path";
import {
  PDFDocument,
  type PDFFont,
  type PDFImage,
  rgb,
} from "pdf-lib";

import {
  CERTIFICATE_SIGNATORIES,
  formatCoauthorList,
  formatCertificateDate,
  type CertificateSnapshot,
} from "@/lib/certificates";

const PAGE_WIDTH = 841.89;
const PAGE_HEIGHT = 595.28;
const CONTENT_SHIFT = 42;

const COLOURS = {
  ivory: rgb(0.984, 0.973, 0.941),
  navy: rgb(0.031, 0.169, 0.4),
  blue: rgb(0.082, 0.271, 0.627),
  gold: rgb(0.89, 0.655, 0.133),
  coral: rgb(0.914, 0.404, 0.271),
  ink: rgb(0.09, 0.133, 0.231),
  muted: rgb(0.36, 0.42, 0.52),
  white: rgb(1, 1, 1),
};

type SignatureAsset = {
  bytes: Uint8Array;
  mimeType: "image/png" | "image/jpeg";
};

type CertificateRecord = {
  certificate_number: string;
  certificate_type: "participant" | "reviewer" | "track_editor";
  issued_at: string;
  display_name: string;
  data_snapshot: CertificateSnapshot;
};

function wrapText(text: string, font: PDFFont, size: number, maxWidth: number) {
  const words = text.trim().split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, size) <= maxWidth) {
      current = candidate;
      continue;
    }
    if (current) lines.push(current);
    current = word;
  }
  if (current) lines.push(current);
  return lines;
}

function drawCenteredText(
  page: ReturnType<PDFDocument["addPage"]>,
  text: string,
  font: PDFFont,
  size: number,
  y: number,
  color = COLOURS.ink
) {
  const width = font.widthOfTextAtSize(text, size);
  page.drawText(text, {
    x: (PAGE_WIDTH - width) / 2,
    y,
    size,
    font,
    color,
  });
}

function drawCenteredWrapped(
  page: ReturnType<PDFDocument["addPage"]>,
  text: string,
  font: PDFFont,
  size: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
  color = COLOURS.ink
) {
  const lines = wrapText(text, font, size, maxWidth);
  for (const line of lines) {
    drawCenteredText(page, line, font, size, y, color);
    y -= lineHeight;
  }
  return y;
}

function drawIkatBand(
  page: ReturnType<PDFDocument["addPage"]>,
  y: number,
  height: number
) {
  page.drawRectangle({ x: 18, y, width: PAGE_WIDTH - 36, height, color: COLOURS.navy });
  const colours = [COLOURS.gold, COLOURS.coral, COLOURS.white];
  for (let x = 32, index = 0; x < PAGE_WIDTH - 32; x += 22, index += 1) {
    const color = colours[index % colours.length];
    const centerY = y + height / 2;
    page.drawSvgPath("M 0 -5 L 5 0 L 0 5 L -5 0 Z", {
      x,
      y: centerY,
      color,
      scale: 1,
    });
    page.drawCircle({ x, y: centerY, size: 1.3, color: COLOURS.navy });
  }
}

async function embedSignature(
  pdf: PDFDocument,
  asset: SignatureAsset
): Promise<PDFImage> {
  return asset.mimeType === "image/png"
    ? pdf.embedPng(asset.bytes)
    : pdf.embedJpg(asset.bytes);
}

function fitImage(image: PDFImage, maxWidth: number, maxHeight: number) {
  const ratio = Math.min(maxWidth / image.width, maxHeight / image.height);
  return { width: image.width * ratio, height: image.height * ratio };
}

export async function generateCertificatePdf({
  certificate,
  signatures,
}: {
  certificate: CertificateRecord;
  signatures: Partial<Record<(typeof CERTIFICATE_SIGNATORIES)[number]["key"], SignatureAsset>>;
}) {
  const pdf = await PDFDocument.create();
  pdf.registerFontkit(fontkit);

  const fontDir = path.join(process.cwd(), "src", "assets", "fonts");
  const [sansBytes, sansBoldBytes, serifBytes, serifBoldBytes, glogiftBytes, iimBytes] =
    await Promise.all([
      readFile(path.join(fontDir, "NotoSans-Regular.ttf")),
      readFile(path.join(fontDir, "NotoSans-Bold.ttf")),
      readFile(path.join(fontDir, "NotoSerif-Regular.ttf")),
      readFile(path.join(fontDir, "NotoSerif-Bold.ttf")),
      readFile(path.join(process.cwd(), "public", "glogift-logo.png")),
      readFile(path.join(process.cwd(), "public", "iim-sambalpur.png")),
    ]);

  const [sans, sansBold, serif, serifBold] = await Promise.all([
    pdf.embedFont(sansBytes, { subset: true }),
    pdf.embedFont(sansBoldBytes, { subset: true }),
    pdf.embedFont(serifBytes, { subset: true }),
    pdf.embedFont(serifBoldBytes, { subset: true }),
  ]);
  const [glogiftLogo, iimLogo] = await Promise.all([
    pdf.embedPng(glogiftBytes),
    pdf.embedPng(iimBytes),
  ]);

  const page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  page.drawRectangle({ x: 0, y: 0, width: PAGE_WIDTH, height: PAGE_HEIGHT, color: COLOURS.ivory });
  page.drawRectangle({
    x: 12,
    y: 12,
    width: PAGE_WIDTH - 24,
    height: PAGE_HEIGHT - 24,
    borderColor: COLOURS.navy,
    borderWidth: 4,
  });
  page.drawRectangle({
    x: 20,
    y: 20,
    width: PAGE_WIDTH - 40,
    height: PAGE_HEIGHT - 40,
    borderColor: COLOURS.gold,
    borderWidth: 1.5,
  });
  drawIkatBand(page, PAGE_HEIGHT - 38, 18);
  drawIkatBand(page, 20, 18);

  // Larger GLOGIFT 27 logo at the top-left (no conference-name text up here).
  const glogiftSize = fitImage(glogiftLogo, 120, 90);
  page.drawImage(glogiftLogo, {
    x: 48,
    y: PAGE_HEIGHT - 128,
    ...glogiftSize,
  });
  const iimSize = fitImage(iimLogo, 220, 34);
  page.drawImage(iimLogo, {
    x: PAGE_WIDTH - 48 - iimSize.width,
    y: PAGE_HEIGHT - 91,
    ...iimSize,
  });

  const snapshot = certificate.data_snapshot;
  // Full label for the certificate body: "GLOGIFT 27 - International Conference
  // on AI-Driven Solutions in Management: Flexibility, Digitalisation & Decarbonization".
  const confLabel = `${snapshot.conferenceAcronym} - ${snapshot.conferenceName.replace(
    / and Decarbonization\b/,
    " & Decarbonization"
  )}`;
  drawCenteredText(
    page,
    certificate.certificate_type === "participant"
      ? "CERTIFICATE OF PARTICIPATION AND PRESENTATION"
      : "CERTIFICATE OF APPRECIATION",
    serifBold,
    certificate.certificate_type === "participant" ? 25 : 28,
    PAGE_HEIGHT - 128 - CONTENT_SHIFT,
    COLOURS.navy
  );
  page.drawLine({
    start: { x: 270, y: PAGE_HEIGHT - 141 - CONTENT_SHIFT },
    end: { x: PAGE_WIDTH - 270, y: PAGE_HEIGHT - 141 - CONTENT_SHIFT },
    thickness: 1.5,
    color: COLOURS.gold,
  });

  drawCenteredText(
    page,
    certificate.certificate_type === "participant"
      ? "This is to certify that"
      : "This certificate is presented to",
    serif,
    14,
    PAGE_HEIGHT - 172 - CONTENT_SHIFT,
    COLOURS.muted
  );
  drawCenteredWrapped(
    page,
    certificate.display_name,
    serifBold,
    27,
    PAGE_HEIGHT - 210 - CONTENT_SHIFT,
    690,
    31,
    COLOURS.blue
  );

  let y = PAGE_HEIGHT - 250 - CONTENT_SHIFT;
  if (snapshot.certificateType === "participant") {
    y = drawCenteredWrapped(
      page,
      "has, as a registered participant, presented the paper entitled",
      serif,
      13,
      y,
      650,
      18,
      COLOURS.ink
    );
    y -= 2;
    y = drawCenteredWrapped(
      page,
      `"${snapshot.paperTitle}"`,
      serifBold,
      16,
      y,
      660,
      21,
      COLOURS.navy
    );
    if (snapshot.coauthors.length) {
      const coauthorList = formatCoauthorList(snapshot.coauthors);
      y -= 3;
      y = drawCenteredWrapped(
        page,
        `co-authored with ${coauthorList},`,
        serif,
        11.5,
        y,
        680,
        16,
        COLOURS.muted
      );
    }
    y -= 3;
    drawCenteredWrapped(
      page,
      `under the track "${snapshot.trackName}" at ${confLabel} on ${formatCertificateDate(snapshot.presentationDate)}.`,
      serif,
      12.5,
      y,
      670,
      18,
      COLOURS.ink
    );
  } else if (snapshot.certificateType === "reviewer") {
    drawCenteredWrapped(
      page,
      `in appreciation of valuable service as a Reviewer for ${confLabel} and contribution to the conference peer-review process.`,
      serif,
      14,
      y,
      650,
      21,
      COLOURS.ink
    );
  } else {
    y = drawCenteredWrapped(
      page,
      "in appreciation of service as Track Editor for",
      serif,
      14,
      y,
      650,
      21,
      COLOURS.ink
    );
    y -= 2;
    y = drawCenteredWrapped(
      page,
      `"${snapshot.trackName}"`,
      serifBold,
      17,
      y,
      650,
      22,
      COLOURS.navy
    );
    y -= 3;
    drawCenteredWrapped(
      page,
      `and contribution to managing the editorial and peer-review process of ${confLabel}.`,
      serif,
      13,
      y,
      650,
      19,
      COLOURS.ink
    );
  }

  const signatureTop = 130;
  const columnWidth = 230;
  const startX = (PAGE_WIDTH - columnWidth * 3) / 2;
  for (const [index, signatory] of CERTIFICATE_SIGNATORIES.entries()) {
    const centerX = startX + columnWidth * index + columnWidth / 2;
    const asset = signatures[signatory.key];
    if (asset) {
      const image = await embedSignature(pdf, asset);
      const size = fitImage(image, 110, 48);
      page.drawImage(image, {
        x: centerX - size.width / 2,
        y: signatureTop,
        ...size,
      });
    }
    page.drawLine({
      start: { x: centerX - 72, y: signatureTop - 4 },
      end: { x: centerX + 72, y: signatureTop - 4 },
      thickness: 0.8,
      color: COLOURS.muted,
    });
    drawCenteredTextAt(page, signatory.name, sansBold, 9.2, signatureTop - 19, centerX, COLOURS.ink);
    drawCenteredTextAt(page, signatory.role, sans, 8.2, signatureTop - 32, centerX, COLOURS.muted);
    drawCenteredTextAt(page, signatory.organisation, sans, 7.5, signatureTop - 43, centerX, COLOURS.muted);
  }

  page.drawText(`Certificate No. ${certificate.certificate_number}`, {
    x: 34,
    y: 44,
    size: 7.5,
    font: sans,
    color: COLOURS.muted,
  });
  const issued = `Issued ${formatCertificateDate(certificate.issued_at.slice(0, 10))}`;
  page.drawText(issued, {
    x: PAGE_WIDTH - 34 - sans.widthOfTextAtSize(issued, 7.5),
    y: 44,
    size: 7.5,
    font: sans,
    color: COLOURS.muted,
  });
  drawCenteredText(page, "www.glogift2027.in", sansBold, 8, 44, COLOURS.blue);

  if (snapshot.certificateType === "participant") {
    drawCenteredText(
      page,
      "This certificate is issued solely to the named registered participant.",
      sans,
      7.5,
      57,
      COLOURS.muted
    );
  }

  pdf.setTitle(`${certificate.certificate_number} - ${certificate.display_name}`);
  pdf.setAuthor("GLOGIFT 27 Editorial Office");
  pdf.setSubject("Conference certificate");
  pdf.setCreator("GLOGIFT 27 Conference Portal");
  return pdf.save();
}

function drawCenteredTextAt(
  page: ReturnType<PDFDocument["addPage"]>,
  text: string,
  font: PDFFont,
  size: number,
  y: number,
  centerX: number,
  color = COLOURS.ink
) {
  const width = font.widthOfTextAtSize(text, size);
  page.drawText(text, { x: centerX - width / 2, y, size, font, color });
}
