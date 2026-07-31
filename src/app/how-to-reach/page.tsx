import type { Metadata } from "next";

import { HowToReachPage } from "@/components/landing/HowToReachPage";

export const metadata: Metadata = {
  title: "How to reach — GLOGIFT 2027, IIM Sambalpur",
  description:
    "Directions to IIM Sambalpur for GLOGIFT 2027 delegates: by road, rail and air, with campus distances and a map.",
};

export default function Page() {
  return <HowToReachPage />;
}
