import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: [
        "/",
        "/conference-flyer",
        "/conference-brochure",
        "/full-paper-submission-guidelines",
        "/how-to-reach",
        "/travelogue",
        "/security",
      ],
      disallow: [
        "/admin/",
        "/author/",
        "/reviewer/",
        "/editor/",
        "/chief/",
        "/profile/",
        "/api/",
        "/auth/",
        "/login",
        "/signup",
        "/forgot-password",
        "/reset-password",
        "/reviewer-invite/",
        "/track-editor-invite/",
        "/chair-invite/",
      ],
    },
    sitemap: "https://glogift2027.in/sitemap.xml",
    host: "https://glogift2027.in",
  };
}
