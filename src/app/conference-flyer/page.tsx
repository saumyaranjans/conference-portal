import type { Metadata } from "next";

import { ConferenceDocumentPage } from "@/components/landing/ConferenceDocumentPage";

export const metadata: Metadata = {
  title: "Conference Flyer - GLOGIFT2027 - IIM SAMBALPUR",
  description: "View and download the GLOGIFT 2027 conference flyer.",
};

export default function ConferenceFlyerPage() {
  return (
    <ConferenceDocumentPage
      title="Conference Flyer"
      description="View the GLOGIFT 2027 call-for-submissions flyer online, or download the original PDF below."
      pdf="/downloads/glogift-2027-conference-flyer.pdf"
      pages={["/document-previews/flyer/page-1.png"]}
    />
  );
}
