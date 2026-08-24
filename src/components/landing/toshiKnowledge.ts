import {
  REGISTRATION_FEE_BY_CATEGORY,
  GLOGIFT_MEMBER_DISCOUNT,
} from "@/lib/registrationFees";
import { MAX_SUBMISSIONS_PER_AUTHOR } from "@/lib/types";
import { TRACKS } from "@/components/landing/tracks";
import { PUBLICATIONS } from "@/components/landing/publications";
import { ADVISORY_BOARD } from "@/components/landing/advisory";
import type { FaqItem } from "@/components/landing/FaqBot";

/**
 * Toshi's extended knowledge — everything on the site beyond the core FAQ,
 * generated from the same sources of truth the pages render from (fee table,
 * track list, published deadlines), so the bot can answer most questions
 * without ever drifting from what the website says.
 */

const feeLines = Object.entries(REGISTRATION_FEE_BY_CATEGORY)
  .map(([category, fee]) => {
    const sym = fee.currency === "INR" ? "₹" : "$";
    return `${category}: ${sym}${fee.earlyBird.toLocaleString("en-IN")} early-bird / ${sym}${fee.regular.toLocaleString("en-IN")} regular`;
  })
  .join("; ");

const trackNames = TRACKS.map(([name], i) => `${i + 1}. ${name}`).join(" ");

const outletLines = PUBLICATIONS.map((p) => `${p.title} (${p.badge})`).join("; ");

/** Board members who edit one of the outlets, so Toshi can name them. */
const boardEditors = ADVISORY_BOARD.filter((m) => m.org.includes("Editor"))
  .map((m) => `${m.name} — ${m.org.split(" · ").slice(-1)[0]}`)
  .join("; ");

export const TOSHI_KNOWLEDGE: FaqItem[] = [
  {
    q: "Where can my paper be published? What are the publishing outlets?",
    a: `Selected papers may be considered for these outlets: ${outletLines}. Selection is made by the respective editorial boards and each journal applies its own review in full — being selected is an invitation to submit, not an acceptance. Full details, and a link to each publisher's own author instructions, are on the Publishing Outlet Guidelines page.`,
  },
  {
    q: "Is there a best paper award or prize money?",
    a: "Yes. Best Paper Awards carry ₹15,000 for first place, ₹12,000 for second and ₹10,000 for third. They are judged across all submissions to the conference — three prizes in total, not one per track — and are open to Pathway B papers only, since a Pathway A paper is presented on its accepted abstract and there is no manuscript to judge.",
  },
  {
    q: "Who is on the conference advisory board?",
    a: `The advisory board has ${ADVISORY_BOARD.length} members from institutions including the IITs, the IIMs, BITS Pilani, DTU, Jamia Millia Islamia, Sapienza University of Rome and Wayne State University. Several edit journals associated with the conference: ${boardEditors}. The full board, with affiliations, is under Conference advisory on the home page.`,
  },
  {
    q: "Can I pay the registration fee online yet?",
    a: "Not yet. Online payment is being set up with ICICI Bank and will open shortly. You can complete your registration details now — they are saved — and you will be emailed as soon as the payment link is live. Please do not attempt to transfer fees by any other route in the meantime.",
  },
  {
    q: "Which journal should I target, and where are its guidelines?",
    a: "The Full Paper Submission Guidelines page covers the conference's own requirements and the two journals it prioritises — the Global Journal of Flexible Systems Management and the International Journal of Global Business and Competitiveness. The Publishing Outlet Guidelines page lists every outlet, says what each one suits, and links to the publisher's own author instructions. Word limits and formatting are set by the publisher, not the conference, so check theirs before submitting.",
  },
  {
    q: "How much is the registration fee for each category?",
    a: `Registration fees (per delegate) — ${feeLines}. Early-bird rates apply on or before 20 December 2026; regular rates from 21 December 2026. GIFT Society members receive a ${Math.round(GLOGIFT_MEMBER_DISCOUNT * 100)}% discount.`,
  },
  {
    q: "What are the ten conference tracks?",
    a: `The ten tracks are: ${trackNames}. Full scope notes for every track are in the Call for Papers section of the website.`,
  },
  {
    q: "What are the important deadlines?",
    a: "Key dates: abstract submission closes 23 November 2026; abstract decisions by 30 November 2026; full-paper (Pathway B) submission closes 8 December 2026; full-paper decisions by 15 December 2026; early-bird registration ends 20 December 2026. The conference runs 25–27 February 2027.",
  },
  {
    q: "How do I submit my abstract or paper?",
    a: `Create an account on the submission portal (Sign up on this website), then use "New Submission" to submit a 500-word abstract (350 words minimum) under one of the ten tracks, declaring Pathway A or B. Each author may be part of at most ${MAX_SUBMISSIONS_PER_AUTHOR} active submissions, counting corresponding-author and co-author roles together.`,
  },
  {
    q: "What does the three-day programme look like?",
    a: "The conference runs three full days (25–27 February 2027), each with on-site and online track sessions running in parallel. Highlights: the Conference Inaugural on Day 1, special sessions and panels across the days, a Talk with Editors of Top-Tier Journals, a Gala Dinner on Day 1 evening, and the Valedictory on Day 3. The full Gantt-style timetable is on the Conference Schedule page of this website.",
  },
  {
    q: "Is there a gala dinner or networking event?",
    a: "Yes — a Gala Dinner for all delegates is hosted on Day 1 (25 February 2027) evening at the Director's residence, along with breaks and networking opportunities across all three days.",
  },
  {
    q: "Can I present my paper online?",
    a: "Yes. GLOGIFT 27 is hybrid: online track sessions run in parallel with the on-site sessions on all three days, so remote participants can present virtually. In-person attendance at IIM Sambalpur is of course encouraged.",
  },
  {
    q: "How do I reach IIM Sambalpur?",
    a: "IIM Sambalpur is at Basantpur, Sambalpur, Odisha, India. The How to Reach page on this website has directions by air, rail and road with campus distances and a map, and the Sambalpur Travelogue page covers the city itself.",
  },
  {
    q: "Whom do I contact for help?",
    a: "For programme matters write to the Conference Chair at glogift27.chair@iimsambalpur.ac.in; for submissions, registration and general queries write to the Conference Coordinator at glogift27.coordinator@iimsambalpur.ac.in.",
  },
  {
    q: "Will I get a participation certificate?",
    a: "Yes — certificates are issued by the conference Editorial Office and can be downloaded from your submission-portal account once generated after the conference.",
  },
  {
    q: "Where can accepted papers be published?",
    a: "Selected full papers — subject to an additional review round by the respective editorial boards — will be considered for Springer journals such as the Global Journal of Flexible Systems Management and for a Scopus-indexed book series. See the Publication Opportunities section of the website for the current outlets.",
  },
  {
    q: "Who organises GLOGIFT and what is the GIFT Society?",
    a: "GLOGIFT 27 is jointly organised by IIM Sambalpur and the GIFT Society — the Global Institute of Flexible Systems Management (B-51 Basement, Sarvodaya Enclave, New Delhi 110017), which runs the GLOGIFT conference series; this is its 27th edition.",
  },
  {
    q: "What language is the conference conducted in?",
    a: "The conference — presentations, submissions and proceedings — is conducted in English.",
  },
  {
    q: "Where do I stay during the conference?",
    a: "Accommodation guidance is shared with registered delegates. For options near campus, write to the Conference Coordinator at glogift27.coordinator@iimsambalpur.ac.in; the Sambalpur Travelogue page on this website is also a good introduction to the city.",
  },
];
