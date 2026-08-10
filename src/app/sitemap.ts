import type { MetadataRoute } from "next";

// Bump when public content meaningfully changes — a truthful lastmod keeps
// crawlers trusting the sitemap.
const LAST_CONTENT_CHANGE = new Date("2026-08-07T00:00:00.000Z");

export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://glogift2027.in";
  const routes = [
    "",
    "/schedule",
    "/conference-flyer",
    "/conference-brochure",
    "/full-paper-submission-guidelines",
    "/how-to-reach",
    "/travelogue",
    "/security",
    "/privacy",
    "/terms",
  ];

  return routes.map((route, index) => ({
    url: `${base}${route}`,
    lastModified: LAST_CONTENT_CHANGE,
    changeFrequency: index === 0 ? "weekly" : "monthly",
    priority: index === 0 ? 1 : 0.7,
  }));
}
