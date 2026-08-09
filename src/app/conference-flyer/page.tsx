import type { Metadata } from "next";

import { ConferenceDocumentPage } from "@/components/landing/ConferenceDocumentPage";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Conference Flyer",
  description:
    "View and download the GLOGIFT 27 conference flyer - call for papers, tracks, dates, publication opportunities and venue at IIM Sambalpur, 25-27 February 2027.",
  path: "/conference-flyer",
});

export default function ConferenceFlyerPage() {
  return (
    <ConferenceDocumentPage
      title="Conference Flyer"
      description="View the updated GLOGIFT 27 call-for-papers flyer online, or download the text-selectable PDF below."
      pdf="/downloads/glogift-2027-conference-flyer.pdf?v=glogift27-20260809-gift-society"
      pages={["/document-previews/flyer/page-1.png?v=glogift27-20260809-gift-society"]}
    />
  );
}
