import type { Metadata } from "next";

import { ConferenceSchedule } from "@/components/landing/ConferenceSchedule";

export const metadata: Metadata = {
  title: "Conference Schedule — GLOGIFT 27",
  description:
    "The GLOGIFT 27 conference schedule: a 3-day timetable (25–27 February 2027) of inaugural, special sessions, on-site and online track sessions, breaks, the Talk with Editors of Top-Tier Journals, gala dinner and valedictory.",
};

export default function Page() {
  return <ConferenceSchedule />;
}
