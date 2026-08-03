import type { NextConfig } from "next";

/**
 * Response headers applied to every route. Vercel already sends HSTS, so the
 * job here is the rest of the baseline: stop the site being framed, stop
 * content-type sniffing, keep referrers off third parties, and switch off
 * device APIs the portal never asks for.
 */
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Send the origin to other sites, never the full path — portal URLs carry
  // paper ids we would rather not leak into someone else's logs.
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value:
      "camera=(), microphone=(), geolocation=(), payment=(), usb=(), magnetometer=(), gyroscope=(), interest-cohort=()",
  },
  { key: "X-DNS-Prefetch-Control", value: "on" },
  // Keep this browsing context isolated from anything it opens.
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  { key: "Cross-Origin-Resource-Policy", value: "same-site" },
  { key: "Origin-Agent-Cluster", value: "?1" },
  { key: "X-Permitted-Cross-Domain-Policies", value: "none" },
  { key: "Strict-Transport-Security", value: "max-age=63072000" },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  outputFileTracingIncludes: {
    "/*": [
      "./src/assets/fonts/**/*",
      "./public/glogift-logo.png",
      "./public/iim-sambalpur.png",
      "./public/letterhead.png",
    ],
  },
  // Nothing gains from advertising the framework.
  poweredByHeader: false,
  experimental: {
    serverActions: {
      // Signature scans are validated at 2 MB by the protected server action.
      bodySizeLimit: "3mb",
    },
  },
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      // The public landing page must return to its original (signed-out) state
      // on every revisit — never a back/forward-cached logged-in view. Once the
      // session cookie is dropped (window closed), a fresh render shows the
      // public page rather than a restored dashboard redirect.
      {
        source: "/",
        headers: [
          {
            key: "Cache-Control",
            value: "private, no-store, max-age=0, must-revalidate",
          },
          { key: "Pragma", value: "no-cache" },
        ],
      },
      // Public conference PDFs are rendered by Chromium's internal PDF
      // extension. It uses an extension origin even when the parent page is
      // first-party, so the static resource must be readable across that
      // boundary. Application pages remain DENY in src/proxy.ts.
      {
        source: "/downloads/:path*.pdf",
        headers: [
          {
            key: "Cross-Origin-Resource-Policy",
            value: "cross-origin",
          },
        ],
      },
      // The camera-ready PDF is streamed from our origin and rendered inline by
      // Chromium's internal PDF extension, which loads it from an extension
      // origin — so the response must be readable across that boundary.
      {
        source: "/api/camera-ready/:path*",
        headers: [
          {
            key: "Cross-Origin-Resource-Policy",
            value: "cross-origin",
          },
        ],
      },
      // Same reasoning for individual manuscript files rendered inline.
      {
        source: "/api/paper-file/:path*",
        headers: [
          {
            key: "Cross-Origin-Resource-Policy",
            value: "cross-origin",
          },
        ],
      },
      // …and the blinded review copy.
      {
        source: "/api/review-copy/:path*",
        headers: [
          {
            key: "Cross-Origin-Resource-Policy",
            value: "cross-origin",
          },
        ],
      },
      {
        source:
          "/:section(admin|author|reviewer|editor|chief|profile|api|auth)/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "private, no-store, max-age=0, must-revalidate",
          },
          { key: "Pragma", value: "no-cache" },
        ],
      },
      {
        source:
          "/:route(login|signup|forgot-password|reset-password|reviewer-invite|track-editor-invite|chair-invite)/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "private, no-store, max-age=0, must-revalidate",
          },
          { key: "Pragma", value: "no-cache" },
        ],
      },
    ];
  },
};

export default nextConfig;
