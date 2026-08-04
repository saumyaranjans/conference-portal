import type { Metadata } from "next";
import { LandingPage } from "@/components/landing/LandingPage";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

// schema.org Event — helps search engines show rich results for the
// conference (name, dates, venue, organiser).
const EVENT_JSONLD = {
  "@context": "https://schema.org",
  "@type": "Event",
  name: "GLOGIFT 27 — International Conference on AI-Driven Solutions in Management",
  alternateName: "Twenty Seventh Global Conference on Flexible Systems Management",
  description:
    "International Conference on AI-Driven Solutions in Management: Flexibility, Digitalisation & Decarbonization. 25–27 February 2027 at IIM Sambalpur, India.",
  startDate: "2027-02-25",
  endDate: "2027-02-27",
  eventAttendanceMode: "https://schema.org/MixedEventAttendanceMode",
  eventStatus: "https://schema.org/EventScheduled",
  image: ["https://glogift2027.in/og-image.png"],
  url: "https://glogift2027.in",
  location: {
    "@type": "Place",
    name: "Indian Institute of Management Sambalpur",
    address: {
      "@type": "PostalAddress",
      addressLocality: "Sambalpur",
      addressRegion: "Odisha",
      addressCountry: "IN",
    },
  },
  organizer: [
    {
      "@type": "Organization",
      name: "Indian Institute of Management Sambalpur",
      url: "https://iimsambalpur.ac.in",
    },
    { "@type": "Organization", name: "GIFT Society" },
  ],
  audience: {
    "@type": "Audience",
    audienceType:
      "Academicians, PhD scholars, MBA students, research associates and practitioners from prominent Indian and global universities (Management, Communication, Engineering, Information Technology, Social Sciences), and industry professionals and consultants from AI-focused sectors.",
  },
  about: [
    "Artificial Intelligence in Management",
    "Flexible Systems Management",
    "Digitalisation",
    "Decarbonization",
    "Management",
    "Communication",
    "Engineering",
    "Information Technology",
    "Social Sciences",
  ],
};

/**
 * The root URL (www.glogift2027.in) is ALWAYS the public conference landing
 * page — never the submission portal, even when a portal session is open. The
 * portal is reached only by going through Login (a signed-in visitor who opens
 * /login is forwarded to their dashboard by the proxy; see src/proxy.ts).
 */
export default function Home() {
  return (
    <>
      {/* JSON-LD is a data block (not executable) so the CSP script-src does
          not apply — no nonce needed. */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(EVENT_JSONLD) }}
      />
      <LandingPage />
    </>
  );
}
