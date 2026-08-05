import type { Metadata } from "next";

import { ConferenceDocumentPage } from "@/components/landing/ConferenceDocumentPage";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Conference Brochure",
  description:
    "Read the three-page GLOGIFT 2027 conference brochure: tracks, submission pathways, publication opportunities, fees and venue — IIM Sambalpur, 25–27 Feb 2027.",
  path: "/conference-brochure",
});

export default function ConferenceBrochurePage() {
  return (
    <ConferenceDocumentPage
      title="Conference Brochure"
      description="Read the three-page GLOGIFT 27 conference brochure online, or download the original PDF below."
      pdf="/downloads/glogift-2027-conference-brochure.pdf"
      pages={[
        "/document-previews/brochure/page-1.png",
        "/document-previews/brochure/page-2.png",
        "/document-previews/brochure/page-3.png",
      ]}
    />
  );
}
