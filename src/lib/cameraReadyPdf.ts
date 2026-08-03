import { readFile } from "node:fs/promises";
import path from "node:path";
import { PDFDocument, StandardFonts, rgb, type PDFFont } from "pdf-lib";

/**
 * Camera-ready builder for a Pathway B full paper. The corresponding author
 * uploads a blinded manuscript (a PDF with no author names). This compiles a
 * generated cover page — carrying the conference identity plus the manuscript
 * metadata AND the full author list — in front of every uploaded file except
 * the Title Page, producing one PDF the author previews and approves before the
 * manuscript can be submitted. The manuscript body itself stays anonymised; the
 * author names live only on this cover page.
 */

const A4_W = 595.28;
const A4_H = 841.89;
const MARGIN = 56;

const NAVY = rgb(0.031, 0.169, 0.4);
const BLUE = rgb(0.082, 0.271, 0.627);
const GOLD = rgb(0.89, 0.655, 0.133);
const INK = rgb(0.12, 0.16, 0.23);
const MUTED = rgb(0.42, 0.47, 0.55);

const CONFERENCE_FULL =
  "International Conference on AI-Driven Solutions in Management: Flexibility, Digitalisation & Decarbonization";
const CONFERENCE_WHEN = "25 - 27 February 2027  |  IIM Sambalpur";

export type CameraReadyAuthor = {
  full_name: string;
  affiliation?: string | null;
  is_corresponding?: boolean | null;
};

export type CameraReadyMeta = {
  paperId: string | null;
  title: string;
  track: string | null;
  option: "A" | "B" | null;
  compiledOn: string; // ISO
  authors: CameraReadyAuthor[];
};

export type CameraReadyPart = { bytes: Uint8Array; fileName: string };

function wrap(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const words = text.replace(/\s+/g, " ").trim().split(" ").filter(Boolean);
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    const cand = cur ? `${cur} ${w}` : w;
    if (font.widthOfTextAtSize(cand, size) <= maxWidth) {
      cur = cand;
    } else {
      if (cur) lines.push(cur);
      // A single word longer than the line: hard-break it.
      if (font.widthOfTextAtSize(w, size) > maxWidth) {
        let chunk = "";
        for (const ch of w) {
          if (font.widthOfTextAtSize(chunk + ch, size) > maxWidth) {
            lines.push(chunk);
            chunk = ch;
          } else chunk += ch;
        }
        cur = chunk;
      } else cur = w;
    }
  }
  if (cur) lines.push(cur);
  return lines;
}

/**
 * Build the camera-ready PDF. Returns the merged bytes plus which uploaded
 * files were folded in and which were skipped (a non-PDF file cannot be
 * merged — it is still submitted separately, just not compiled here).
 */
export async function buildCameraReadyPdf(
  meta: CameraReadyMeta,
  parts: CameraReadyPart[]
): Promise<{
  bytes: Uint8Array;
  blindedBytes: Uint8Array;
  merged: string[];
  skipped: string[];
  contentPages: number;
}> {
  // Two PDFs from the same files: the full camera-ready (cover WITH authors) and
  // a blinded review copy (identical cover WITHOUT the author list) for
  // double-blind reviewers.
  const full = await buildOne(meta, parts, true);
  const blinded = await buildOne(meta, parts, false);
  return {
    bytes: full.bytes,
    blindedBytes: blinded.bytes,
    merged: full.merged,
    skipped: full.skipped,
    contentPages: full.contentPages,
  };
}

async function buildOne(
  meta: CameraReadyMeta,
  parts: CameraReadyPart[],
  includeAuthors: boolean
): Promise<{ bytes: Uint8Array; merged: string[]; skipped: string[]; contentPages: number }> {
  const out = await PDFDocument.create();
  const reg = await out.embedFont(StandardFonts.Helvetica);
  const bold = await out.embedFont(StandardFonts.HelveticaBold);
  const obl = await out.embedFont(StandardFonts.HelveticaOblique);

  const page = out.addPage([A4_W, A4_H]);
  const contentW = A4_W - MARGIN * 2;
  const center = (t: string, y: number, size: number, font: PDFFont, color = INK) =>
    page.drawText(t, {
      x: (A4_W - font.widthOfTextAtSize(t, size)) / 2,
      y,
      size,
      font,
      color,
    });

  let y = A4_H - 60;

  // ---- Standardized letterhead (single image: logos + GLOGIFT 2027 +
  //      conference name + dates + gold/navy rule) ----
  try {
    const lhBytes = await readFile(
      path.join(process.cwd(), "public", "letterhead.png")
    );
    const lh = await out.embedPng(lhBytes);
    const w = contentW;
    const h = (lh.height / lh.width) * w;
    page.drawImage(lh, { x: MARGIN, y: y - h, width: w, height: h });
    y -= h + 24;
  } catch {
    // Fallback to a text header if the letterhead asset is unavailable.
    center("GLOGIFT 2027", y, 22, bold, NAVY);
    y -= 20;
    for (const line of wrap(CONFERENCE_FULL, reg, 10, contentW - 20)) {
      center(line, y, 10, reg, MUTED);
      y -= 13;
    }
    y -= 2;
    center(CONFERENCE_WHEN, y, 10, obl, MUTED);
    y -= 20;
    page.drawRectangle({ x: MARGIN, y, width: contentW, height: 2, color: GOLD });
    y -= 30;
  }

  // ---- Label ----
  center(
    includeAuthors ? "CAMERA-READY MANUSCRIPT" : "MANUSCRIPT FOR REVIEW",
    y,
    11,
    bold,
    BLUE
  );
  y -= 28;

  // ---- Title ----
  for (const line of wrap(meta.title || "Untitled manuscript", bold, 17, contentW)) {
    center(line, y, 17, bold, INK);
    y -= 22;
  }
  y -= 14;

  // ---- Metadata rows ----
  const row = (label: string, value: string) => {
    page.drawText(label.toUpperCase(), { x: MARGIN, y, size: 8, font: bold, color: MUTED });
    const vlines = wrap(value, reg, 11, contentW - 140);
    let vy = y;
    for (const l of vlines) {
      page.drawText(l, { x: MARGIN + 140, y: vy, size: 11, font: reg, color: INK });
      vy -= 15;
    }
    y = (vlines.length > 1 ? vy + 15 : y) - 20;
  };
  row("Manuscript ID", meta.paperId || "—");
  row("Track", meta.track || "—");
  row(
    "Packaging",
    meta.option === "A"
      ? "Option A — Separated files"
      : meta.option === "B"
        ? "Option B — Combined manuscript"
        : "—"
  );
  row(
    "Compiled on",
    new Date(meta.compiledOn).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "long",
      year: "numeric",
    })
  );

  // ---- Authors (full copy only; withheld on the blinded review copy) ----
  if (includeAuthors) {
    y -= 4;
    page.drawText("AUTHORS", { x: MARGIN, y, size: 8, font: bold, color: MUTED });
    y -= 18;
    meta.authors.forEach((a, i) => {
      const name = `${i + 1}.  ${a.full_name}${a.is_corresponding ? "  (Corresponding author)" : ""}`;
      page.drawText(name, { x: MARGIN + 6, y, size: 11, font: bold, color: INK });
      y -= 14;
      if (a.affiliation) {
        for (const l of wrap(a.affiliation, obl, 9.5, contentW - 30)) {
          page.drawText(l, { x: MARGIN + 20, y, size: 9.5, font: obl, color: MUTED });
          y -= 12;
        }
      }
      y -= 5;
    });
  } else {
    y -= 4;
    page.drawText("AUTHORS", { x: MARGIN, y, size: 8, font: bold, color: MUTED });
    y -= 16;
    page.drawText("Withheld for double-blind review.", {
      x: MARGIN + 6,
      y,
      size: 10.5,
      font: obl,
      color: MUTED,
    });
    y -= 16;
  }

  // ---- Footer note ----
  const note = includeAuthors
    ? "The manuscript that follows is anonymised for double-blind review and carries no author names. Author identities appear on this cover page only."
    : "This is the double-blind review copy. Author identities are withheld throughout, including on this cover page.";
  let fy = MARGIN + 24;
  for (const l of wrap(note, obl, 8.5, contentW)) {
    page.drawText(l, { x: MARGIN, y: fy, size: 8.5, font: obl, color: MUTED });
    fy -= 11;
  }

  // ---- Merge parts (PDF only) ----
  const merged: string[] = [];
  const skipped: string[] = [];
  for (const p of parts) {
    if (!/\.pdf$/i.test(p.fileName)) {
      skipped.push(p.fileName);
      continue;
    }
    try {
      const src = await PDFDocument.load(p.bytes, { ignoreEncryption: true });
      const pages = await out.copyPages(src, src.getPageIndices());
      pages.forEach((pg) => out.addPage(pg));
      merged.push(p.fileName);
    } catch {
      skipped.push(p.fileName);
    }
  }

  out.setTitle(
    `${meta.paperId ?? "Manuscript"} — ${includeAuthors ? "Camera-ready" : "Review copy"}`
  );
  out.setAuthor("GLOGIFT 2027 Conference Portal");
  // Compiled content pages, excluding the generated cover.
  const contentPages = Math.max(0, out.getPageCount() - 1);
  const bytes = await out.save();
  return { bytes, merged, skipped, contentPages };
}
