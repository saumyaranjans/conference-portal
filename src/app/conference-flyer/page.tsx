import type { Metadata } from "next";

import { ConferenceDocumentPage } from "@/components/landing/ConferenceDocumentPage";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Conference Flyer",
  description:
    "View and download the GLOGIFT 2027 conference flyer — call for papers, tracks, dates and venue for the AI in Management conference at IIM Sambalpur, 25–27 Feb 2027.",
  path: "/conference-flyer",
});

export default function ConferenceFlyerPage() {
  return (
    <ConferenceDocumentPage
      title="Conference Flyer"
      description="View the GLOGIFT 27 call-for-submissions flyer online, or download the original PDF below."
      pdf="/downloads/glogift-2027-conference-flyer.pdf"
      pages={["/document-previews/flyer/page-1.png"]}
      embedPdf
    />
  );
}
