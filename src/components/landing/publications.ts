/**
 * The publishing outlets, as one list. Shared so the landing page's
 * Conference Attractions section and the Publishing Outlet Guidelines page can
 * never drift apart — the same reason the track list lives in tracks.ts.
 *
 * Ordered by selectivity: the journals first by standing, then the two book
 * series, and the proceedings last, since every accepted paper appears there
 * and it is the floor rather than an outlet to aim for.
 */
export type Publication = {
  title: string;
  /** Publisher and standing, as shown on the card. */
  badge: string;
  cover: string;
  /** The outlet's home on the publisher's site. Empty when it has none yet. */
  url: string;
  /** One line, for the landing card. */
  detail: string;
  /**
   * The publisher's own author instructions, where a stable address is known.
   * Left unset rather than guessed: a broken link on this page sends an author
   * to the wrong requirements, which is worse than one extra click.
   */
  guidelines?: string;
  /** Who to write for, on the guidelines page. */
  suits?: string;
};

export const PUBLICATIONS: Publication[] = [
  {
    title: "Global Journal of Flexible Systems Management",
    badge: "Springer · ABDC-A",
    cover: "/journals/gjfsm.jpg",
    url: "https://link.springer.com/journal/40171",
    guidelines: "https://link.springer.com/journal/40171/submission-guidelines",
    detail:
      "Selected best papers fast-tracked after further peer review and revision.",
    suits:
      "General-management research on organizational flexibility — adaptive, responsive and agile strategy, structures, systems, people and culture.",
  },
  {
    title: "FIIB Business Review",
    badge: "SAGE · ABDC-B",
    cover: "/journals/fiib.jpg",
    url: "https://journals.sagepub.com/home/fib",
    detail:
      "Selected best papers fast-tracked after further peer review and revision.",
    suits:
      "Empirical and case-based management research, including work grounded in emerging-market practice.",
  },
  {
    title: "International Journal of Global Business & Competitiveness",
    badge: "Springer · ABDC-C",
    cover: "/journals/ijgbc.jpg",
    url: "https://link.springer.com/journal/42943",
    guidelines: "https://link.springer.com/journal/42943/submission-guidelines",
    detail:
      "Selected best papers fast-tracked after further peer review and revision.",
    suits:
      "Management and business research addressing competitiveness, globalisation and their application to practice.",
  },
  {
    title: "International Journal of Accounting, Business and Finance",
    badge: "Indian Accounting Association · ABDC-C",
    cover: "/journals/ijabf.jpg",
    url: "https://www.ijabf.in/index.php/IJABF",
    detail:
      "Selected best papers fast-tracked after further peer review and revision.",
    suits:
      "Accounting, finance and business research. Peer-reviewed and open access.",
  },
  {
    title: "Book Series on Flexible Systems Management",
    badge: "Springer · Scopus-indexed",
    cover: "/journals/book-series.jpg",
    url: "https://link.springer.com/series/10780",
    detail: "Selected best papers fast-tracked as book chapters.",
    suits:
      "Work that reads as a chapter rather than an article — broader in scope, and suited to a themed volume.",
  },
  {
    title: "Review of Management Literature",
    badge: "Emerald · Scopus-indexed",
    cover: "/journals/rml.jpg",
    url: "https://www.emeraldgrouppublishing.com/book-series/review-management-literature",
    detail: "Selected best papers fast-tracked as book chapters.",
    suits:
      "Review and synthesis work — systematic reviews, bibliometric analyses and states of the literature.",
  },
  {
    title: "GLOGIFT 27 Conference Proceedings",
    badge: "Book with ISBN",
    cover: "/journals/proceedings.svg",
    url: "",
    detail:
      "All accepted and presented papers appear in a dedicated proceedings volume.",
    suits:
      "Every accepted and presented paper, with no separate submission needed.",
  },
];
