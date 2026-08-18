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
        // NOTE: /people/ is deliberately NOT blocked here. Google had already
        // indexed a committee portrait and was using it as this site's search
        // thumbnail; blocking the path would have frozen that, because a
        // crawler turned away at robots.txt can never read the noindex that
        // asks for the removal. The portraits are kept crawlable and carry
        // `X-Robots-Tag: noindex` from vercel.json instead.
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
