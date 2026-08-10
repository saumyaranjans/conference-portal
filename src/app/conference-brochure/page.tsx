import type { Metadata } from "next";

import { ConferenceDocumentPage } from "@/components/landing/ConferenceDocumentPage";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Conference Brochure",
  description:
    "Read the updated three-page GLOGIFT 27 conference brochure: tracks, pathways, publication opportunities, fees, certificate rules and venue at IIM Sambalpur.",
  path: "/conference-brochure",
});

export default function ConferenceBrochurePage() {
  return (
    <ConferenceDocumentPage
      title="Conference Brochure"
      description="Read the updated three-page GLOGIFT 27 conference brochure online, or download the text-selectable PDF below."
      pdf="/downloads/glogift-2027-conference-brochure.pdf?v=glogift27-20260808c"
      pages={[
        "/document-previews/brochure/page-1.png?v=glogift27-20260808c",
        "/document-previews/brochure/page-2.png?v=glogift27-20260808c",
        "/document-previews/brochure/page-3.png?v=glogift27-20260808c",
      ]}
    />
  );
}
