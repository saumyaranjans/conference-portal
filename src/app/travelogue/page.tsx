import type { Metadata } from "next";

import { TraveloguePage } from "@/components/landing/TraveloguePage";

export const metadata: Metadata = {
  title: "Sambalpur travelogue — GLOGIFT 27",
  description:
    "A guide to Sambalpur for GLOGIFT 27 delegates: how to reach the city, what to see, and where to find Sambalpuri Ikat. Also available as a PDF.",
};

export default function Page() {
  return <TraveloguePage />;
}
