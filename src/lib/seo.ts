import type { Metadata } from "next";

const SITE_URL = "https://glogift2027.in";
const OG_IMAGE = {
  url: "/og-image.png",
  width: 1200,
  height: 630,
  alt: "GLOGIFT 27 — International Conference on AI-Driven Solutions in Management, IIM Sambalpur, 25–27 February 2027",
};

/**
 * Complete per-page metadata for a public marketing page.
 *
 * Next.js does NOT deep-merge metadata: a page that sets only `title` inherits
 * the root layout's openGraph wholesale — so its og:url would literally be the
 * homepage. Every public subpage therefore declares its own canonical, OG and
 * Twitter block through this helper. `title` is left unbranded — the root
 * layout's template appends "· GLOGIFT 27" exactly once.
 */
export function pageMetadata({
  title,
  description,
  path,
}: {
  title: string;
  description: string;
  /** Route path starting with "/" — resolved against metadataBase. */
  path: string;
}): Metadata {
  const branded = `${title} · GLOGIFT 27`;
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      title: branded,
      description,
      url: path,
      type: "website",
      siteName: "GLOGIFT 27",
      locale: "en_IN",
      images: [OG_IMAGE],
    },
    twitter: {
      card: "summary_large_image",
      title: branded,
      description,
      images: ["/og-image.png"],
    },
  };
}

/** Two-level breadcrumb (home → page) for a public subpage. */
export function breadcrumbJsonLd(name: string, path: string) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "GLOGIFT 27", item: SITE_URL },
      { "@type": "ListItem", position: 2, name, item: `${SITE_URL}${path}` },
    ],
  };
}
