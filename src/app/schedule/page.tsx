import type { Metadata } from "next";

import { ConferenceSchedule } from "@/components/landing/ConferenceSchedule";
import { pageMetadata, breadcrumbJsonLd } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Conference Schedule, 25–27 Feb 2027",
  description:
    "3-day GLOGIFT 2027 programme at IIM Sambalpur, 25–27 Feb 2027: inaugural, on-site & online track sessions, Talk with Editors, gala dinner & valedictory.",
  path: "/schedule",
});

const BREADCRUMB = breadcrumbJsonLd("Conference Schedule", "/schedule");

export default function Page() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(BREADCRUMB) }}
      />
      <ConferenceSchedule />
    </>
  );
}
