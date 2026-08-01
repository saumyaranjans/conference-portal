export type CertificateType = "participant" | "reviewer" | "track_editor";

export type ParticipantCertificateSnapshot = {
  certificateType: "participant";
  recipientName: string;
  paperTitle: string;
  coauthors: string[];
  trackName: string;
  presentationDate: string;
  conferenceName: string;
  conferenceAcronym: string;
  conferenceYear: number;
};

export type ReviewerCertificateSnapshot = {
  certificateType: "reviewer";
  recipientName: string;
  conferenceName: string;
  conferenceAcronym: string;
  conferenceYear: number;
};

export type TrackEditorCertificateSnapshot = {
  certificateType: "track_editor";
  recipientName: string;
  trackName: string;
  conferenceName: string;
  conferenceAcronym: string;
  conferenceYear: number;
};

export type CertificateSnapshot =
  | ParticipantCertificateSnapshot
  | ReviewerCertificateSnapshot
  | TrackEditorCertificateSnapshot;

export const CERTIFICATE_TEMPLATE_VERSION = 1;

export const CERTIFICATE_SIGNATORIES = [
  {
    key: "mahadeo-prasad-jaiswal",
    name: "Prof. Mahadeo Prasad Jaiswal",
    role: "Conference Patron",
    organisation: "Director, IIM Sambalpur",
  },
  {
    key: "seema-gupta",
    name: "Prof. Seema Gupta",
    role: "Conference Convenor",
    organisation: "IIM Sambalpur",
  },
  {
    key: "saumyaranjan-sahoo",
    name: "Prof. Saumyaranjan Sahoo",
    role: "Conference Co-Convenor",
    organisation: "IIM Sambalpur",
  },
] as const;

export function certificatePrefix(type: CertificateType): string {
  if (type === "participant") return "P";
  if (type === "reviewer") return "R";
  return "TE";
}

/** Join a salutation to a name without repeating an existing prefix. */
export function withSalutation(name: string, salutation?: string | null): string {
  const cleanName = name.trim();
  const cleanSalutation = (salutation ?? "").trim().replace(/\s+/g, " ");
  if (!cleanSalutation) return cleanName;

  const normalisedName = cleanName.toLowerCase().replace(/[.]/g, "");
  const normalisedSalutation = cleanSalutation.toLowerCase().replace(/[.]/g, "");
  if (
    normalisedName === normalisedSalutation ||
    normalisedName.startsWith(`${normalisedSalutation} `)
  ) {
    return cleanName;
  }
  return `${cleanSalutation} ${cleanName}`.trim();
}

export function formatCertificateDate(value: string): string {
  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

export function formatCoauthorList(names: string[]): string {
  const cleanNames = names.map((name) => name.trim()).filter(Boolean);
  if (cleanNames.length === 0) return "";
  if (cleanNames.length === 1) return cleanNames[0];
  if (cleanNames.length === 2) return `${cleanNames[0]} & ${cleanNames[1]}`;
  return `${cleanNames.slice(0, -1).join(", ")}, and ${cleanNames.at(-1)}`;
}

export function participantEligibility(evidence: any): {
  eligible: boolean;
  missing: string[];
} {
  const missing: string[] = [];
  if (!evidence?.registration_fee_paid) missing.push("registration fee");
  if (!(Number(evidence?.amount_paid) > 0)) missing.push("positive amount paid");
  if (!evidence?.attended_confirmed) missing.push("attendance confirmation");
  if (!evidence?.presentation_confirmed) missing.push("presentation confirmation");
  if (!evidence?.presentation_date) missing.push("presentation date");
  return { eligible: missing.length === 0, missing };
}
