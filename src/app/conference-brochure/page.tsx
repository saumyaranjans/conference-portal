import type { Metadata } from "next";

import { ConferenceDocumentPage } from "@/components/landing/ConferenceDocumentPage";

export const metadata: Metadata = {
  title: "Conference Brochure - GLOGIFT2027 - IIM SAMBALPUR",
  description: "View and download the four-page GLOGIFT 2027 conference brochure.",
};

export default function ConferenceBrochurePage() {
  return (
    <ConferenceDocumentPage
      title="Conference Brochure"
      description="Read the four-page GLOGIFT 2027 conference brochure online, or download the original PDF below."
      pdf="/downloads/glogift-2027-conference-brochure.pdf"
      pages={[
        "/document-previews/brochure/page-1.png",
        "/document-previews/brochure/page-2.png",
        "/document-previews/brochure/page-3.png",
        "/document-previews/brochure/page-4.png",
      ]}
    />
  );
}
