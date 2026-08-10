import Link from "next/link";
import { PdfImageViewer } from "@/components/PdfImageViewer";
import { formatDate } from "@/components/ui/Primitives";
import { formatMoney } from "@/lib/registrationFees";
import { participationModeLabel } from "@/lib/types";

/**
 * The confirmation a delegate sees after paying, and the receipt itself.
 *
 * Presentational and prop-driven so it can be rendered without a paid
 * registration behind it. The page that uses it needs a real one; being able
 * to look at this without the database is what makes it reviewable at all.
 */
export function ThankYouPanel({
  registrationId,
  currency,
  paid,
  paidAt,
  paperReference,
  participationMode,
  invoiceSrc,
}: {
  registrationId: string;
  currency: "INR" | "USD";
  paid: number;
  paidAt: string | null;
  paperReference: string | null;
  participationMode: string | null;
  /** Overridable so a preview can point at a sample file. */
  invoiceSrc?: { inline: string; download: string };
}) {
  const src = invoiceSrc ?? {
    inline: `/api/invoices/${registrationId}?inline=1`,
    download: `/api/invoices/${registrationId}`,
  };

  return (
    <>
      <div className="card card-pad mb-6 border-emerald-200 bg-emerald-50 dark:border-emerald-500/30 dark:bg-emerald-500/10">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-base font-bold text-white">
            ✓
          </span>
          <div>
            <p className="font-semibold text-emerald-900 dark:text-emerald-100">
              Your payment has been confirmed and your place is secured.
            </p>
            <p className="mt-1 text-sm text-emerald-900/80 dark:text-emerald-100/80">
              {formatMoney(currency, paid)} paid
              {paidAt && ` on ${formatDate(paidAt)}`}
              {paperReference && ` · presenting ${paperReference}`}
              {participationMode &&
                ` · ${participationModeLabel(participationMode)}`}
            </p>
            <p className="mt-2 text-sm text-emerald-900/80 dark:text-emerald-100/80">
              We have emailed you a confirmation, and will send the programme
              nearer the conference. We look forward to seeing you in Sambalpur.
            </p>
          </div>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          Your invoice
        </h2>
        <div className="flex gap-2">
          <a href={src.download} className="btn-primary text-sm">
            Download invoice
          </a>
          <Link href="/author" className="btn-secondary text-sm">
            Go to my dashboard
          </Link>
        </div>
      </div>

      {/* Rendered to canvas by pdf.js, not handed to the browser's PDF plugin.
          An <object>/<iframe> cannot work here at all: the app's CSP sets
          frame-ancestors 'none' and does not frame application/pdf, so the
          viewer is blocked and every delegate would see the fallback. The
          canvas route also works on mobile, where inline PDF viewing usually
          is not available. Same file either way — the download link points at
          the same route. */}
      <div className="mb-8 overflow-hidden rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/40">
        <PdfImageViewer src={src.inline} />
      </div>
    </>
  );
}
