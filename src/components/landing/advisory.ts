/**
 * The conference advisory board.
 *
 * Its own module so both the landing section and Toshi's knowledge read the
 * same list — the bot is imported by the landing page, so it cannot import
 * back, and a second hand-typed copy would drift the first time a member
 * changed. Same arrangement as tracks.ts and publications.ts.
 */
export type AdvisoryMember = { name: string; org: string };

export const ADVISORY_BOARD: AdvisoryMember[] = [
  {
    name: "Prof (Dr) P. K. Suri",
    org: "Professor, Delhi School of Management, DTU",
  },
  {
    name: "Prof (Dr) Arpan Kumar Kar",
    org: "Indian Institute of Technology Delhi",
  },
  {
    name: "Prof (Dr) Santosh Rangnekar",
    org: "Professor, Indian Institute of Technology Roorkee",
  },
  {
    name: "Prof (Dr) Abhijit Majumdar",
    org: "Indian Institute of Technology Delhi",
  },
  {
    name: "Prof (Dr) Anand Jha",
    org: "Chair, Department of Finance · Mike Ilitch School of Business, Wayne State University",
  },
  {
    name: "Prof (Dr) Idiano D'Adamo",
    org: "Full Professor of Management Engineering · Sapienza University of Rome",
  },
  {
    name: "Prof (Dr) Abid Haleem",
    org: "Professor, Mechanical Engineering · Faculty of Engineering and Technology, Jamia Millia Islamia",
  },
  {
    name: "Prof (Dr) Shveta Singh",
    org: "Indian Institute of Technology Delhi",
  },
  {
    name: "Prof (Dr) M. P. Gupta",
    org: "Director, Indian Institute of Management Lucknow",
  },
  {
    name: "Prof (Dr) Neetu Yadav",
    org: "Associate Professor, Birla Institute of Technology and Science, Pilani",
  },
  {
    name: "Prof (Dr) Sanjay Dhir",
    org: "Fellow, IIM Lucknow · Professor, DMS, Indian Institute of Technology Delhi",
  },
  {
    name: "Prof (Dr) Kirankumar S. Momaya",
    org: "Chair Professor, Indian Institute of Technology Bombay · Editor-in-Chief, International Journal of Global Business and Competitiveness",
  },
  {
    name: "Prof (Dr) Ramesh Anbanandam",
    org: "Indian Institute of Technology Roorkee",
  },
  {
    name: "Prof (Dr) Sudhir Rana",
    org: "College of Business, Liwa University · Editor-in-Chief, FIIB Business Review and Review of Management Literature",
  },
  {
    name: "Prof (Dr) Shubham Singhania",
    org: "FORE School of Management, New Delhi · Editor, Review of Management Literature",
  },
];
