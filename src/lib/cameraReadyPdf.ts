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
): Promise<{ bytes: Uint8Array; merged: string[]; skipped: string[] }> {
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

  // ---- Logo (centered) ----
  try {
    const logoBytes = await readFile(path.join(process.cwd(), "public", "glogift-logo.png"));
    const logo = await out.embedPng(logoBytes);
    const h = 62;
    const w = (logo.width / logo.height) * h;
    page.drawImage(logo, { x: (A4_W - w) / 2, y: y - h, width: w, height: h });
    y -= h + 18;
  } catch {
    y -= 8;
  }

  // ---- Conference identity ----
  center("GLOGIFT 2027", y, 22, bold, NAVY);
  y -= 20;
  for (const line of wrap(CONFERENCE_FULL, reg, 10, contentW - 20)) {
    center(line, y, 10, reg, MUTED);
    y -= 13;
  }
  y -= 2;
  center(CONFERENCE_WHEN, y, 10, obl, MUTED);
  y -= 20;

  // ---- Gold rule ----
  page.drawRectangle({ x: MARGIN, y, width: contentW, height: 2, color: GOLD });
  y -= 30;

  // ---- Camera-ready label ----
  center("CAMERA-READY MANUSCRIPT", y, 11, bold, BLUE);
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

  // ---- Authors ----
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

  // ---- Footer note ----
  const note =
    "The manuscript that follows is anonymised for single-blind review and carries no author names. Author identities appear on this cover page only.";
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

  out.setTitle(`${meta.paperId ?? "Manuscript"} — Camera-ready`);
  out.setAuthor("GLOGIFT 2027 Conference Portal");
  const bytes = await out.save();
  return { bytes, merged, skipped };
}
