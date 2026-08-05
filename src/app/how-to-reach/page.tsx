import type { Metadata } from "next";

import { HowToReachPage } from "@/components/landing/HowToReachPage";
import { pageMetadata, breadcrumbJsonLd } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "How to Reach IIM Sambalpur",
  description:
    "Directions to IIM Sambalpur for GLOGIFT 2027 delegates: by road, rail and air, with campus distances and a map.",
  path: "/how-to-reach",
});

const BREADCRUMB = breadcrumbJsonLd("How to Reach IIM Sambalpur", "/how-to-reach");

export default function Page() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(BREADCRUMB) }}
      />
      <HowToReachPage />
    </>
  );
}
