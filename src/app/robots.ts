import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      // "/" covers every public page; explicit per-page Allow lines are noise.
      allow: "/",
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
        "/denied",
        "/reviewer-invite/",
        "/track-editor-invite/",
        "/chair-invite/",
        // Committee portraits. They stay visible to visitors — robots.txt
        // binds crawlers, not browsers — but Google cannot use a face it has
        // not crawled as the search thumbnail, and left to itself it picked
        // one over the conference banner.
        "/people/",
        // Capability-token URLs — must never be crawled.
        "/paper-assignment/",
        "/review-invite/",
        "/co-author-invite/",
      ],
    },
    sitemap: "https://glogift2027.in/sitemap.xml",
    // (The non-standard "Host:" directive was dropped — only legacy Yandex
    // ever read it; canonical URLs + redirects carry that signal now.)
  };
}
