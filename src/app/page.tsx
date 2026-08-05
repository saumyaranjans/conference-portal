import type { Metadata } from "next";
import { LandingPage } from "@/components/landing/LandingPage";
import {
  REGISTRATION_FEE_BY_CATEGORY,
  EARLY_BIRD_CUTOFF,
} from "@/lib/registrationFees";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

// Full registration-fee schedule as schema.org Offers — built from the single
// source of truth (registrationFees.ts) so prices never drift. Every delegate
// category is listed at both its Early-Bird and Regular tier.
const REGISTRATION_URL = "https://glogift2027.in/#fees";
const EVENT_OFFERS = Object.entries(REGISTRATION_FEE_BY_CATEGORY).flatMap(
  ([category, fee]) => [
    {
      "@type": "Offer",
      name: `Conference registration — ${category} (Early Bird)`,
      category: "Conference registration",
      price: String(fee.earlyBird),
      priceCurrency: fee.currency,
      availability: "https://schema.org/InStock",
      url: REGISTRATION_URL,
      validFrom: "2026-08-01",
      validThrough: `${EARLY_BIRD_CUTOFF}T23:59:59+05:30`,
    },
    {
      "@type": "Offer",
      name: `Conference registration — ${category} (Regular)`,
      category: "Conference registration",
      price: String(fee.regular),
      priceCurrency: fee.currency,
      availability: "https://schema.org/InStock",
      url: REGISTRATION_URL,
      validFrom: "2026-12-21",
    },
  ]
);

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
    {
      "@type": "Organization",
      name: "GIFT Society",
      url: "https://giftsociety.org",
    },
  ],
  // Google recognises Event `offers` as an array of Offer; each needs
  // price/priceCurrency/availability/url/validFrom to register. Generated from
  // the live fee table so every delegate tier is represented accurately.
  offers: EVENT_OFFERS,
  // `performer` must be a Person or PerformingGroup for Google to accept it —
  // Organization is silently dropped (reported as "missing performer").
  performer: [
    {
      "@type": "PerformingGroup",
      name: "Global speakers, academicians and AI-industry practitioners",
    },
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

// schema.org FAQPage — gives search engines (and AI overviews) a clean,
// authoritative answer for the most-confused facts. GLOGIFT is a recurring
// series, so third-party listings of PAST editions (e.g. an earlier IIM
// Kozhikode edition in January) get mistaken for this one; these entries state
// the correct 2027 dates and venue explicitly.
const FAQ_JSONLD = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "When is GLOGIFT 27 (GLOGIFT 2027) being held?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "GLOGIFT 27 is being held on 25–27 February 2027.",
      },
    },
    {
      "@type": "Question",
      name: "Where is GLOGIFT 27 (GLOGIFT 2027) being held?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "GLOGIFT 27 is hosted at the Indian Institute of Management (IIM) Sambalpur, Odisha, India.",
      },
    },
    {
      "@type": "Question",
      name: "Who organises GLOGIFT 27?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "GLOGIFT 27 is organised by IIM Sambalpur in association with the GIFT Society (Global Institute of Flexible Systems Management). It is the Twenty Seventh Global Conference on Flexible Systems Management.",
      },
    },
    {
      "@type": "Question",
      name: "What is the theme of GLOGIFT 27?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "GLOGIFT 27 is the International Conference on AI-Driven Solutions in Management: Flexibility, Digitalisation & Decarbonization, with a call for papers across ten tracks.",
      },
    },
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
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(FAQ_JSONLD) }}
      />
      <LandingPage />
    </>
  );
}
