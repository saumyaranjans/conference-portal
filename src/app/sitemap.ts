import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://glogift2027.in";
  const routes = [
    "",
    "/conference-flyer",
    "/conference-brochure",
    "/full-paper-submission-guidelines",
    "/how-to-reach",
    "/travelogue",
    "/security",
  ];

  return routes.map((route, index) => ({
    url: `${base}${route}`,
    lastModified: new Date("2026-08-01T00:00:00.000Z"),
    changeFrequency: index === 0 ? "weekly" : "monthly",
    priority: index === 0 ? 1 : 0.7,
  }));
}
