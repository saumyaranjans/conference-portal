import { Section, formatDate } from "@/components/ui/Primitives";
import type { MyCertificate } from "@/lib/certificateAccess";

const TYPE_LABEL: Record<MyCertificate["certificate_type"], string> = {
  participant: "Certificate of Participation & Presentation",
  reviewer: "Certificate of Appreciation — Reviewer",
  track_editor: "Certificate of Appreciation — Track Editor",
};

/**
 * Shows the certificates issued to the current user (filtered to the types
 * relevant to this dashboard). Each links to the authenticated download route;
 * renders nothing when there are none.
 */
export function MyCertificates({
  certificates,
  types,
  title = "Your certificates",
}: {
  certificates: MyCertificate[];
  types: MyCertificate["certificate_type"][];
  title?: string;
}) {
  const list = certificates.filter((c) => types.includes(c.certificate_type));
  if (list.length === 0) return null;

  return (
    <Section title={title}>
      <div className="card divide-y divide-slate-100 dark:divide-slate-800">
        {list.map((c) => (
          <div
            key={c.id}
            className="px-5 py-3 flex items-center justify-between gap-4 flex-wrap"
          >
            <div className="min-w-0">
              <p className="text-sm font-medium text-slate-800 dark:text-slate-100">
                {TYPE_LABEL[c.certificate_type]}
              </p>
              <p className="text-xs text-slate-500">
                No. {c.certificate_number} · Issued {formatDate(c.issued_at)}
              </p>
            </div>
            <a
              href={`/api/certificates/${c.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary shrink-0"
            >
              Download PDF
            </a>
          </div>
        ))}
      </div>
    </Section>
  );
}
