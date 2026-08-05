import type { Metadata } from "next";
import { LandingPage, FAQ_ITEMS } from "@/components/landing/LandingPage";
import {
  REGISTRATION_FEE_BY_CATEGORY,
  EARLY_BIRD_CUTOFF,
  isEarlyBird,
} from "@/lib/registrationFees";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

// Full registration-fee schedule as schema.org Offers — built from the single
// source of truth (registrationFees.ts) so prices never drift. Every delegate
// category is listed at its Regular tier; the Early-Bird tier is included only
// while it is actually purchasable, so an expired offer never lingers in the
// markup (prices are numbers — Google types offers.price as Number).
const REGISTRATION_URL = "https://glogift2027.in/#fees";
const EVENT_OFFERS = Object.entries(REGISTRATION_FEE_BY_CATEGORY).flatMap(
  ([category, fee]) => [
    ...(isEarlyBird()
      ? [
          {
            "@type": "Offer",
            name: `Conference registration — ${category} (Early Bird)`,
            category: "Conference registration",
            price: fee.earlyBird,
            priceCurrency: fee.currency,
            availability: "https://schema.org/InStock",
            url: REGISTRATION_URL,
            validFrom: "2026-08-01",
            validThrough: `${EARLY_BIRD_CUTOFF}T23:59:59+05:30`,
          },
        ]
      : []),
    {
      "@type": "Offer",
      name: `Conference registration — ${category} (Regular)`,
      category: "Conference registration",
      price: fee.regular,
      priceCurrency: fee.currency,
      availability: "https://schema.org/InStock",
      url: REGISTRATION_URL,
      validFrom: "2026-12-21",
    },
  ]
);

// schema.org EducationEvent (the academic-event subtype — Google's Event rich
// result accepts all Event subtypes) — helps search engines show rich results
// for the conference (name, dates, venue, organiser).
const EVENT_JSONLD = {
  "@context": "https://schema.org",
  "@type": "EducationEvent",
  name: "GLOGIFT 27 — International Conference on AI-Driven Solutions in Management",
  alternateName: [
    "GLOGIFT 27",
    "GLOGIFT 2027",
    "Twenty Seventh Global Conference on Flexible Systems Management",
    "27th Global Conference on Flexible Systems Management",
  ],
  description:
    "International Conference on AI-Driven Solutions in Management: Flexibility, Digitalisation & Decarbonization. 25–27 February 2027 at IIM Sambalpur, India.",
  // Full ISO-8601 with offset so Google never has to guess the timezone; the
  // times mirror the published schedule (Day 1 opens 10:00, Day 3 ends 18:00,
  // registration desk from 08:30).
  startDate: "2027-02-25T10:00:00+05:30",
  endDate: "2027-02-27T18:00:00+05:30",
  doorTime: "2027-02-25T08:30:00+05:30",
  inLanguage: "en",
  isAccessibleForFree: false,
  keywords:
    "Flexible Systems Management, AI in Management, Digitalisation, Decarbonization, GLOGIFT, IIM Sambalpur, academic conference, call for papers",
  superEvent: {
    "@type": "EventSeries",
    name: "GLOGIFT — Global Conference on Flexible Systems Management",
    organizer: {
      "@type": "Organization",
      name: "GIFT Society",
      url: "https://giftsociety.org",
    },
  },
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
    // The full visible FAQ (rendered as an accordion on the landing page) —
    // visible text and structured data stay in lockstep via the shared array.
    ...FAQ_ITEMS.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: { "@type": "Answer", text: item.a },
    })),
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
