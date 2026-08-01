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
  // Nothing gains from advertising the framework.
  poweredByHeader: false,
  experimental: {
    serverActions: {
      bodySizeLimit: "256kb",
    },
  },
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      // Conference PDFs are rendered inside the site's own document viewer.
      // SAMEORIGIN keeps third-party framing blocked while allowing that one
      // first-party use case. Application pages remain DENY in src/proxy.ts.
      {
        source: "/downloads/:path*.pdf",
        headers: [
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          {
            key: "Content-Security-Policy",
            value: "default-src 'none'; frame-ancestors 'self'",
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
