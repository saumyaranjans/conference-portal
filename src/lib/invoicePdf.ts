import { readFile } from "node:fs/promises";
import path from "node:path";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

/**
 * The registration receipt a delegate downloads once payment has cleared.
 *
 * Called an invoice because that is what a delegate's finance office asks them
 * for, but it is issued after payment and states so: it evidences a completed
 * payment rather than requesting one.
 *
 * Built from the registration row, never from the form. Every figure here —
 * base, discount, GST, total — is what was actually charged and stored, so a
 * receipt cannot disagree with the ledger even if the fee table changes later.
 *
 * Standard fonts only. The certificates embed brand faces from disk because
 * they are display pieces; a receipt is read once and filed, and Helvetica
 * keeps it small and immune to a missing font file.
 */

const INK = rgb(0.09, 0.133, 0.231);
const MUTED = rgb(0.36, 0.42, 0.52);
const NAVY = rgb(0.031, 0.169, 0.4);
const RULE = rgb(0.85, 0.87, 0.9);

const A4: [number, number] = [595.28, 841.89];
const MARGIN = 56;

export type InvoiceData = {
  invoiceNumber: string;
  issuedOn: string;
  paidOn: string | null;
  orderId: string | null;
  delegate: {
    name: string;
    email: string;
    category: string;
    country: string;
  };
  paper: { reference: string; title: string } | null;
  currency: "INR" | "USD";
  base: number;
  discount: number;
  couponCode: string;
  taxRate: number;
  tax: number;
  total: number;
  participationMode: string;
};

/**
 * The three marks that head the invoice, left to right: the conference, the
 * society that convenes it, and the host institute.
 *
 * `gift-logo.png` is not in the repository yet. Rather than hard-fail or leave
 * a hole, a missing file is skipped and the remaining logos close the gap —
 * so dropping the file into public/ is the whole of adding it, with no code
 * change. Everything else here would break the invoice if it were absent,
 * which is why only this one is optional.
 */
const LOGO_FILES = ["glogift-logo.png", "gift-logo.png", "iim-sambalpur.png"];
const LOGO_HEIGHT = 26;
const LOGO_GAP = 14;

async function loadLogos(pdf: PDFDocument) {
  const embedded = [];
  for (const file of LOGO_FILES) {
    try {
      const bytes = await readFile(path.join(process.cwd(), "public", file));
      embedded.push(await pdf.embedPng(bytes));
    } catch {
      // Absent or unreadable: the invoice is a receipt, not a brochure, and
      // must still be issued.
    }
  }
  return embedded;
}

function money(currency: "INR" | "USD", n: number): string {
  // The PDF is WinAnsi-encoded: "₹" is not in that character set and throws on
  // draw, so the receipt names the currency in letters instead of a glyph.
  const amount = n.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${currency} ${amount}`;
}

export async function generateInvoicePdf(d: InvoiceData): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage(A4);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const body = await pdf.embedFont(StandardFonts.Helvetica);

  const right = A4[0] - MARGIN;
  let y = A4[1] - MARGIN;

  const text = (
    s: string,
    opts: { x?: number; size?: number; font?: typeof body; color?: typeof INK } = {}
  ) => {
    page.drawText(s, {
      x: opts.x ?? MARGIN,
      y,
      size: opts.size ?? 10,
      font: opts.font ?? body,
      color: opts.color ?? INK,
    });
  };

  /** Right-aligned, for the money column. */
  const textRight = (s: string, size = 10, font = body) => {
    page.drawText(s, {
      x: right - font.widthOfTextAtSize(s, size),
      y,
      size,
      font,
      color: INK,
    });
  };

  const rule = () => {
    page.drawLine({
      start: { x: MARGIN, y: y + 6 },
      end: { x: right, y: y + 6 },
      thickness: 0.75,
      color: RULE,
    });
  };

  // ---- header ------------------------------------------------------------
  //
  // The three marks sit on one baseline above the title, each scaled to a
  // common height so a tall crest and a wide wordmark read as a set rather
  // than as three unrelated images.
  const logos = await loadLogos(pdf);
  if (logos.length) {
    y -= LOGO_HEIGHT;
    let x = MARGIN;
    for (const logo of logos) {
      const width = (logo.width / logo.height) * LOGO_HEIGHT;
      page.drawImage(logo, { x, y, width, height: LOGO_HEIGHT });
      x += width + LOGO_GAP;
    }
    y -= 22;
  }

  text("GLOGIFT 2027", { size: 20, font: bold, color: NAVY });
  y -= 16;
  text("Indian Institute of Management Sambalpur", { size: 9, color: MUTED });
  y -= 11;
  text("in association with the GIFT Society", { size: 9, color: MUTED });

  y += 27;
  textRight("REGISTRATION INVOICE", 12, bold);
  y -= 15;
  textRight(d.invoiceNumber, 9, body);
  y -= 12;
  textRight(`Issued ${d.issuedOn}`, 9, body);

  y -= 34;
  rule();

  // ---- parties -----------------------------------------------------------
  y -= 22;
  text("BILLED TO", { size: 8, font: bold, color: MUTED });
  y -= 14;
  text(d.delegate.name, { size: 11, font: bold });
  y -= 13;
  text(d.delegate.email, { size: 9, color: MUTED });
  y -= 12;
  text(`${d.delegate.category}${d.delegate.country ? ` · ${d.delegate.country}` : ""}`, {
    size: 9,
    color: MUTED,
  });

  y -= 24;
  text("CONFERENCE", { size: 8, font: bold, color: MUTED });
  y -= 14;
  text("GLOGIFT 2027 · 25-27 February 2027 · IIM Sambalpur", { size: 9 });
  y -= 12;
  text(`Attending: ${d.participationMode}`, { size: 9, color: MUTED });

  if (d.paper) {
    y -= 12;
    // Long titles would run off the page; clip rather than overlap the margin.
    const title = d.paper.title.length > 78
      ? `${d.paper.title.slice(0, 75)}...`
      : d.paper.title;
    text(`Paper: ${d.paper.reference}${title ? ` - ${title}` : ""}`, {
      size: 9,
      color: MUTED,
    });
  }

  // ---- charges -----------------------------------------------------------
  y -= 30;
  rule();
  y -= 18;
  text("DESCRIPTION", { size: 8, font: bold, color: MUTED });
  textRight("AMOUNT", 8, bold);
  y -= 8;
  rule();

  y -= 20;
  text("Delegate registration fee", { size: 10 });
  textRight(money(d.currency, d.base));

  if (d.discount > 0) {
    y -= 18;
    text(
      `Less GIFT Society discount${d.couponCode ? ` (${d.couponCode})` : ""}`,
      { size: 10 }
    );
    textRight(`- ${money(d.currency, d.discount)}`);
  }

  y -= 18;
  text(`GST @ ${Math.round(d.taxRate * 100)}%`, { size: 10 });
  textRight(money(d.currency, d.tax));

  y -= 12;
  rule();
  y -= 20;
  text("TOTAL PAID", { size: 11, font: bold });
  textRight(money(d.currency, d.total), 11, bold);

  // ---- payment -----------------------------------------------------------
  y -= 34;
  text("PAYMENT", { size: 8, font: bold, color: MUTED });
  y -= 14;
  text(`Status: Paid${d.paidOn ? ` on ${d.paidOn}` : ""}`, { size: 9 });
  if (d.orderId) {
    y -= 12;
    text(`Order reference: ${d.orderId}`, { size: 9, color: MUTED });
  }

  // ---- footer ------------------------------------------------------------
  y = MARGIN + 34;
  rule();
  y -= 12;
  text(
    "This invoice is issued against a completed payment. No payment is due.",
    { size: 8, color: MUTED }
  );
  y -= 11;
  text(
    "Registration fees are non-refundable except where the organisers cancel the conference.",
    { size: 8, color: MUTED }
  );

  return pdf.save();
}
