import type { NextConfig } from "next";

/**
 * Response headers applied to every route. Vercel already sends HSTS, so the
 * job here is the rest of the baseline: stop the site being framed, stop
 * content-type sniffing, keep referrers off third parties, and switch off
 * device APIs the portal never asks for.
 */
const securityHeaders = [
  // Belt and braces with the CSP frame-ancestors directive in the proxy, for
  // anything that still only understands this header.
  { key: "X-Frame-Options", value: "DENY" },
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
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Nothing gains from advertising the framework.
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
