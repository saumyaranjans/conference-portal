import type { Metadata } from "next";
import { AdvisoryPage } from "@/components/landing/AdvisoryPage";
import { pageMetadata, breadcrumbJsonLd } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Conference Advisory",
  description:
    "Patrons, advisory leadership and the conference committee for GLOGIFT 2027 — the 27th Global Conference on Flexible Systems Management, IIM Sambalpur, 25–27 Feb 2027.",
  path: "/advisory",
});

const BREADCRUMB = breadcrumbJsonLd("Conference Advisory", "/advisory");

export default function Page() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(BREADCRUMB) }}
      />
      <AdvisoryPage />
    </>
  );
}
