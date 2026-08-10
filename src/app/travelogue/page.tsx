import type { Metadata } from "next";

import { TraveloguePage } from "@/components/landing/TraveloguePage";
import { pageMetadata, breadcrumbJsonLd } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Sambalpur Travelogue for Delegates",
  description:
    "A guide to Sambalpur for GLOGIFT 27 delegates: how to reach the city, what to see, and where to find Sambalpuri Ikat. Also available as a PDF.",
  path: "/travelogue",
});

const BREADCRUMB = breadcrumbJsonLd("Sambalpur Travelogue", "/travelogue");

export default function Page() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(BREADCRUMB) }}
      />
      <TraveloguePage />
    </>
  );
}
