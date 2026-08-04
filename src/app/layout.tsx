import type { Metadata } from "next";
import { headers } from "next/headers";
import "./globals.css";

const SITE_URL = "https://glogift2027.in";
const SITE_TITLE =
  "GLOGIFT 27 — International Conference on AI-Driven Solutions in Management";
const SITE_DESC =
  "GLOGIFT 27 (Twenty Seventh Global Conference on Flexible Systems Management) — International Conference on AI-Driven Solutions in Management: Flexibility, Digitalisation & Decarbonization. 25–27 February 2027 at IIM Sambalpur, India. A global forum for academicians, PhD scholars, MBA students, research associates and practitioners from prominent Indian and global universities — across Management, Communication, Engineering, Information Technology and Social Sciences — and for industry professionals and consultants from AI-focused sectors. Call for papers across ten tracks; in-person and hybrid.";

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
  icons: {
    icon: "/glogift-logo.png",
    apple: "/glogift-logo.png",
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
      </head>
      <body className="antialiased">{children}</body>
    </html>
  );
}
