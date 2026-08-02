import type { Metadata } from "next";

import { ConferenceDocumentPage } from "@/components/landing/ConferenceDocumentPage";

export const metadata: Metadata = {
  title: "Conference Brochure - GLOGIFT2027 - IIM SAMBALPUR",
  description: "View and download the GLOGIFT 2027 conference brochure.",
};

export default function ConferenceBrochurePage() {
  return (
    <ConferenceDocumentPage
      title="Conference Brochure"
      description="Read the GLOGIFT 2027 conference brochure online, or download the PDF below."
      pdf="/downloads/glogift-2027-conference-brochure.pdf"
      pages={[]}
      embedPdf
    />
  );
}
