import type { Metadata } from "next";
import { LandingPage } from "@/components/landing/LandingPage";

// /Home is an alias of the landing page — canonicalise to "/" so search
// engines don't treat it as duplicate content.
export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

export default function HomeLandingPage() {
  return <LandingPage />;
}
