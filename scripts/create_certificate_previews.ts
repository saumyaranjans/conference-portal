import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { generateCertificatePdf } from "../src/lib/certificatePdf";

const outputDir = path.join(process.cwd(), "output", "pdf");
const signatureDir = path.join(process.cwd(), "private", "certificate-signatures");

async function loadPreviewSignatures() {
  const keys = [
    "mahadeo-prasad-jaiswal",
    "seema-gupta",
    "saumyaranjan-sahoo",
  ] as const;
  const signatures: Partial<
    Record<(typeof keys)[number], { bytes: Uint8Array; mimeType: "image/png" }>
  > = {};
  for (const key of keys) {
    try {
      signatures[key] = {
        bytes: await readFile(path.join(signatureDir, `${key}.png`)),
        mimeType: "image/png",
      };
    } catch {
      // Keep the template usable before genuine signatures are supplied.
    }
  }
  return signatures;
}

const base = {
  issued_at: "2026-08-01T00:00:00.000Z",
};

const samples = [
  {
    filename: "GLOGIFT2027_Participant_Certificate_Template.pdf",
    certificate: {
      ...base,
      certificate_number: "GLOGIFT2027-P-SAMPLE01",
      certificate_type: "participant" as const,
      display_name: "Prof. Ananya Sharma",
      data_snapshot: {
        certificateType: "participant" as const,
        recipientName: "Prof. Ananya Sharma",
        paperTitle: "Responsible AI-Driven Decision Systems for Sustainable Organisations",
        coauthors: ["Rahul Mehta", "Priya Nair"],
        trackName: "Governance, Ethics and Responsible AI",
        presentationDate: "2027-02-26",
        conferenceName: "International Conference on AI-Driven Solutions in Management: Flexibility, Digitalisation and Decarbonization",
        conferenceAcronym: "GLOGIFT 2027",
        conferenceYear: 2027,
      },
    },
  },
  {
    filename: "GLOGIFT2027_Reviewer_Certificate_Template.pdf",
    certificate: {
      ...base,
      certificate_number: "GLOGIFT2027-R-SAMPLE01",
      certificate_type: "reviewer" as const,
      display_name: "Prof. Arvind Kumar",
      data_snapshot: {
        certificateType: "reviewer" as const,
        recipientName: "Prof. Arvind Kumar",
        conferenceName: "International Conference on AI-Driven Solutions in Management: Flexibility, Digitalisation and Decarbonization",
        conferenceAcronym: "GLOGIFT 2027",
        conferenceYear: 2027,
      },
    },
  },
  {
    filename: "GLOGIFT2027_Track_Editor_Certificate_Template.pdf",
    certificate: {
      ...base,
      certificate_number: "GLOGIFT2027-TE-SAMPLE01",
      certificate_type: "track_editor" as const,
      display_name: "Prof. Meera Iyer",
      data_snapshot: {
        certificateType: "track_editor" as const,
        recipientName: "Prof. Meera Iyer",
        trackName: "AI for Operations, Supply Chain and Industry 5.0",
        conferenceName: "International Conference on AI-Driven Solutions in Management: Flexibility, Digitalisation and Decarbonization",
        conferenceAcronym: "GLOGIFT 2027",
        conferenceYear: 2027,
      },
    },
  },
];

async function main() {
  await mkdir(outputDir, { recursive: true });
  const signatures = await loadPreviewSignatures();
  for (const sample of samples) {
    const bytes = await generateCertificatePdf({
      certificate: sample.certificate,
      signatures,
    });
    await writeFile(path.join(outputDir, sample.filename), bytes);
  }
  console.log(`Created ${samples.length} certificate previews in ${outputDir}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
