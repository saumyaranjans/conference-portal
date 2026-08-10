import type { Metadata } from "next";
import { headers } from "next/headers";
import { VisitTracker } from "@/components/VisitTracker";
import "./globals.css";

const SITE_URL = "https://glogift2027.in";
// ~58 chars — survives SERP truncation and carries the tokens academics
// actually type: the year form "2027", the field, and the host institute.
const SITE_TITLE =
  "GLOGIFT 2027 | AI in Management Conference | IIM Sambalpur";
// ~151 chars — front-loads "call for papers" (the highest-intent academic
// query) and keeps the series name, venue and dates inside the snippet.
const SITE_DESC =
  "Call for papers — GLOGIFT 2027 (27th Global Conference on Flexible Systems Management): AI in management, IIM Sambalpur, India, 25–27 Feb 2027. Hybrid.";

// Entity signals: who runs this site (with the official social profiles as
// sameAs) and what the site is called. JSON-LD data blocks are inert script
// tags, so the CSP script-src does not apply to them.
const ORG_JSONLD = {
  "@context": "https://schema.org",
  "@type": "EducationalOrganization",
  name: "Indian Institute of Management Sambalpur",
  alternateName: "IIM Sambalpur",
  url: "https://www.iimsambalpur.ac.in",
  logo: `${SITE_URL}/iim-sambalpur.png`,
  sameAs: [
    "https://www.facebook.com/IIMSBP/",
    "https://x.com/iim_sambalpur",
    "https://www.instagram.com/iim_sambalpur/",
    "https://www.linkedin.com/school/indian-institute-of-management-sambalpur",
    "https://youtube.com/@PRMediaCommitteeIIMSambalpur",
  ],
};
const WEBSITE_JSONLD = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "GLOGIFT 27",
  alternateName: ["GLOGIFT 2027", "27th Global Conference on Flexible Systems Management"],
  url: SITE_URL,
  publisher: {
    "@type": "EducationalOrganization",
    name: "Indian Institute of Management Sambalpur",
    url: "https://www.iimsambalpur.ac.in",
  },
};

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: SITE_TITLE,
    template: "%s · GLOGIFT 27",
  },
  description: SITE_DESC,
  applicationName: "GLOGIFT 27",
  keywords: [
    "GLOGIFT 27",
    "GLOGIFT 2027",
    "Flexible Systems Management",
    "AI in management conference",
    "IIM Sambalpur conference",
    "management conference 2027 India",
    "call for papers management",
    "AI-Driven Solutions in Management",
    "digitalisation",
    "decarbonization",
    "GIFT Society",
    // Target audiences
    "conference for academicians",
    "PhD scholars conference",
    "MBA students conference",
    "research associates conference",
    "practitioners management conference",
    "industry professionals AI conference",
    "AI consultants conference",
    "Indian and global universities conference",
    // Disciplines
    "management research",
    "communication studies conference",
    "engineering conference India",
    "information technology conference",
    "social sciences conference",
    "interdisciplinary AI research",
  ],
  authors: [{ name: "IIM Sambalpur · GIFT Society" }],
  creator: "IIM Sambalpur",
  publisher: "IIM Sambalpur",
  category: "education",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  openGraph: {
    title: SITE_TITLE,
    description: SITE_DESC,
    url: SITE_URL,
    siteName: "GLOGIFT 27",
    type: "website",
    locale: "en_IN",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "GLOGIFT 27 — International Conference on AI-Driven Solutions in Management, IIM Sambalpur, 25–27 February 2027",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE,
    description: SITE_DESC,
    images: ["/og-image.png"],
  },
  // The tab icon is the year alone: the GIFT smiley was unreadable at 32px and
  // said nothing about which conference this is.
  icons: {
    icon: [
      { url: "/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-48.png", sizes: "48x48", type: "image/png" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
  },
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // The proxy mints a nonce per request; this inline script has to carry it
  // or the Content Security Policy will refuse to run it.
  const nonce = (await headers()).get("x-nonce") ?? undefined;

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Light is the default; dark applies only when the user has chosen
            it (saved as theme=dark). Applied before first paint to avoid a
            flash of the wrong theme. */}
        {/* The browser blanks a nonce attribute once it has parsed the tag, so
            React sees "" on the client and reports a mismatch that is not one. */}
        <script
          nonce={nonce}
          suppressHydrationWarning
          dangerouslySetInnerHTML={{
            __html: `(function(){try{if(localStorage.getItem('theme')==='dark'){document.documentElement.classList.add('dark');}}catch(e){}})();`,
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(ORG_JSONLD) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(WEBSITE_JSONLD) }}
        />
      </head>
      <body className="antialiased">
        {children}
        {/* Records public page views. Mounted at the root so every public page
            is measured, not just the landing page; it excludes the portal
            itself. */}
        <VisitTracker />
      </body>
    </html>
  );
}
