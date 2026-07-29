/** Each author may hold at most this many submissions (withdrawn excluded). */
export const MAX_SUBMISSIONS_PER_AUTHOR = 2;

/** Abstracts are capped at this many words. */
export const ABSTRACT_WORD_LIMIT = 500;

/** Completed reviews required before a track editor may recommend. */
export const MIN_REVIEWS_PER_SUBMISSION = 2;

/**
 * Reviewers who must recommend "accept" before a full paper can be accepted
 * into the publication stage. A chair may invite more reviewers than this; the
 * abstract stage has no such requirement and is at the chair's discretion.
 */
export const FULL_PAPER_ACCEPTS_REQUIRED = 2;

/** Word count used for the abstract limit (whitespace separated). */
export function countWords(text: string): number {
  const t = text.trim();
  return t ? t.split(/\s+/).length : 0;
}

export type AppRole = "author" | "reviewer" | "editor" | "chief" | "admin";

export type SubmissionStatus =
  | "draft"
  | "submitted"
  | "under_review"
  | "revisions_requested"
  | "abstract_accepted"
  | "accepted"
  | "rejected"
  | "withdrawn";

export type AssignmentStatus =
  | "invited"
  | "accepted"
  | "declined"
  | "submitted"
  | "expired";

export type Recommendation =
  | "accept"
  | "minor_revision"
  | "major_revision"
  | "reject";

export type DecisionKind = "accept" | "revisions_requested" | "reject";

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  first_name: string;
  last_name: string;
  title: string;
  gender: string;
  mobile: string;
  affiliation: string;
  institution: string;
  department: string;
  designation: string;
  participant_category: string;
  orcid: string;
  country: string;
  bio: string;
  expertise: string[];
  roles: AppRole[];
  is_active: boolean;
  created_at: string;
}

export interface Conference {
  id: string;
  name: string;
  acronym: string;
  year: number;
  description: string;
  submission_deadline: string | null;
  review_deadline: string | null;
  notification_date: string | null;
  is_open: boolean;
}

export interface Track {
  id: string;
  conference_id: string;
  name: string;
  code: string;
  description: string;
  editor_id: string | null;
}

/** Whether a listed author will attend the conference. */
export const AUTHOR_ATTENDANCE = [
  {
    value: "attending",
    label: "Attending Conference & Require Attendance/Presentation Certificate",
  },
  { value: "not_attending", label: "Not Attending" },
] as const;

export function attendanceLabel(value: string): string {
  return AUTHOR_ATTENDANCE.find((a) => a.value === value)?.label ?? "—";
}

/** Intended level of participation, captured on each submission. */
export const SUBMISSION_TYPES = [
  {
    value: "abstract_presentation",
    label: "Abstract & Presentation Only",
    description: "Submission of abstract and delivery of presentation.",
  },
  {
    value: "full_paper_presentation",
    label: "Full Paper & Presentation",
    description:
      "Submission of abstract, full paper, and delivery of presentation.",
  },
] as const;

export const PARTICIPATION_MODES = [
  { value: "virtual", label: "Virtual Conference (Online)" },
  { value: "onsite", label: "On-Site Institution Visit (Offline)" },
] as const;

export function submissionTypeLabel(value: string): string {
  return SUBMISSION_TYPES.find((t) => t.value === value)?.label ?? "—";
}

export function participationModeLabel(value: string): string {
  return PARTICIPATION_MODES.find((m) => m.value === value)?.label ?? "—";
}

export interface PublicationOpportunity {
  id: string;
  title: string;
  publisher: string;
  category: string;
  description: string;
  image_url: string;
  url: string;
  is_active: boolean;
  sort_order: number;
}

/** Country names for the sign-up / profile country typeahead. */
export const COUNTRIES: string[] = [
  "Afghanistan", "Albania", "Algeria", "Andorra", "Angola", "Argentina",
  "Armenia", "Australia", "Austria", "Azerbaijan", "Bahamas", "Bahrain",
  "Bangladesh", "Barbados", "Belarus", "Belgium", "Belize", "Benin", "Bhutan",
  "Bolivia", "Bosnia and Herzegovina", "Botswana", "Brazil", "Brunei",
  "Bulgaria", "Burkina Faso", "Burundi", "Cambodia", "Cameroon", "Canada",
  "Cape Verde", "Central African Republic", "Chad", "Chile", "China",
  "Colombia", "Comoros", "Congo", "Costa Rica", "Croatia", "Cuba", "Cyprus",
  "Czechia", "Denmark", "Djibouti", "Dominica", "Dominican Republic",
  "Ecuador", "Egypt", "El Salvador", "Estonia", "Eswatini", "Ethiopia",
  "Fiji", "Finland", "France", "Gabon", "Gambia", "Georgia", "Germany",
  "Ghana", "Greece", "Grenada", "Guatemala", "Guinea", "Guyana", "Haiti",
  "Honduras", "Hungary", "Iceland", "India", "Indonesia", "Iran", "Iraq",
  "Ireland", "Israel", "Italy", "Jamaica", "Japan", "Jordan", "Kazakhstan",
  "Kenya", "Kuwait", "Kyrgyzstan", "Laos", "Latvia", "Lebanon", "Lesotho",
  "Liberia", "Libya", "Liechtenstein", "Lithuania", "Luxembourg",
  "Madagascar", "Malawi", "Malaysia", "Maldives", "Mali", "Malta",
  "Mauritania", "Mauritius", "Mexico", "Moldova", "Monaco", "Mongolia",
  "Montenegro", "Morocco", "Mozambique", "Myanmar", "Namibia", "Nepal",
  "Netherlands", "New Zealand", "Nicaragua", "Niger", "Nigeria",
  "North Macedonia", "Norway", "Oman", "Pakistan", "Palestine", "Panama",
  "Papua New Guinea", "Paraguay", "Peru", "Philippines", "Poland",
  "Portugal", "Qatar", "Romania", "Russia", "Rwanda", "Samoa",
  "Saudi Arabia", "Senegal", "Serbia", "Seychelles", "Sierra Leone",
  "Singapore", "Slovakia", "Slovenia", "Somalia", "South Africa",
  "South Korea", "South Sudan", "Spain", "Sri Lanka", "Sudan", "Sweden",
  "Switzerland", "Syria", "Taiwan", "Tajikistan", "Tanzania", "Thailand",
  "Timor-Leste", "Togo", "Trinidad and Tobago", "Tunisia", "Turkey",
  "Turkmenistan", "Uganda", "Ukraine", "United Arab Emirates",
  "United Kingdom", "United States", "Uruguay", "Uzbekistan", "Vanuatu",
  "Venezuela", "Vietnam", "Yemen", "Zambia", "Zimbabwe",
];

/** Country dial codes for mobile numbers (India first). */
export const COUNTRY_DIAL_CODES: { country: string; code: string }[] = [
  { country: "India", code: "+91" },
  { country: "United States / Canada", code: "+1" },
  { country: "United Kingdom", code: "+44" },
  { country: "Australia", code: "+61" },
  { country: "Bangladesh", code: "+880" },
  { country: "Bhutan", code: "+975" },
  { country: "China", code: "+86" },
  { country: "France", code: "+33" },
  { country: "Germany", code: "+49" },
  { country: "Indonesia", code: "+62" },
  { country: "Italy", code: "+39" },
  { country: "Japan", code: "+81" },
  { country: "Malaysia", code: "+60" },
  { country: "Nepal", code: "+977" },
  { country: "Netherlands", code: "+31" },
  { country: "New Zealand", code: "+64" },
  { country: "Nigeria", code: "+234" },
  { country: "Pakistan", code: "+92" },
  { country: "Saudi Arabia", code: "+966" },
  { country: "Singapore", code: "+65" },
  { country: "South Africa", code: "+27" },
  { country: "South Korea", code: "+82" },
  { country: "Spain", code: "+34" },
  { country: "Sri Lanka", code: "+94" },
  { country: "Switzerland", code: "+41" },
  { country: "United Arab Emirates", code: "+971" },
];

/** The 5 participant categories from the CMPRP registration spec. */
export const PARTICIPANT_CATEGORIES = [
  "Faculty / Academician",
  "Industry Professional",
  "Research Scholar / PhD",
  "Student (UG/PG)",
  "Foreign Delegate",
] as const;

export interface Submission {
  id: string;
  conference_id: string;
  track_id: string | null;
  author_id: string;
  title: string;
  abstract: string;
  keywords: string[];
  status: SubmissionStatus;
  version: number;
  submission_type: string;
  participation_mode: string;
  stage: string;
  suggested_outlet_id: string | null;
  similarity_index: number | null;
  ai_percentage: number | null;
  integrity_checked_at: string | null;
  declared_original: boolean;
  declared_ai_assistance: boolean;
  declared_consent_publication: boolean;
  paper_id: string | null;
  paper_number: number | null;
  file_path: string | null;
  file_name: string | null;
  camera_ready_file_path: string | null;
  camera_ready_file_name: string | null;
  camera_ready_at: string | null;
  submitted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Assignment {
  id: string;
  submission_id: string;
  reviewer_id: string;
  /** Reviewer 1, Reviewer 2, … within this submission. */
  reviewer_number: number | null;
  assigned_by: string | null;
  status: AssignmentStatus;
  due_date: string | null;
  created_at: string;
  responded_at: string | null;
}

export interface Review {
  id: string;
  assignment_id: string;
  submission_id: string;
  reviewer_id: string;
  score_originality: number | null;
  score_technical: number | null;
  score_clarity: number | null;
  score_relevance: number | null;
  confidence: number | null;
  recommendation: Recommendation | null;
  comments_to_author: string;
  comments_to_editor: string;
  is_submitted: boolean;
  submitted_at: string | null;
}

export interface Decision {
  id: string;
  submission_id: string;
  decided_by: string;
  decision: DecisionKind;
  rationale: string;
  is_final: boolean;
  created_at: string;
}

export interface Notification {
  id: string;
  profile_id: string;
  title: string;
  body: string;
  link: string | null;
  is_read: boolean;
  created_at: string;
}

export interface ReviewStats {
  submission_id: string;
  assigned_count: number;
  accepted_count: number;
  declined_count: number;
  completed_count: number;
  avg_score: number | null;
  rec_accept: number;
  rec_minor: number;
  rec_major: number;
  rec_reject: number;
}

/** Statuses a Convener/admin may delete (not draft, under-review, revisions, or accepted). */
export const DELETABLE_SUBMISSION_STATUSES: SubmissionStatus[] = [
  "submitted",
  "withdrawn",
  "rejected",
];

/** Human-readable labels, kept in one place so every dashboard agrees. */
export const STATUS_LABELS: Record<SubmissionStatus, string> = {
  draft: "Draft",
  submitted: "Submitted",
  under_review: "Under Review",
  revisions_requested: "Revisions Requested",
  abstract_accepted: "Abstract Accepted",
  accepted: "Accepted",
  rejected: "Rejected",
  withdrawn: "Withdrawn",
};

export const RECOMMENDATION_LABELS: Record<Recommendation, string> = {
  accept: "Accept",
  minor_revision: "Minor Revision",
  major_revision: "Major Revision",
  reject: "Reject",
};

export const ROLE_LABELS: Record<AppRole, string> = {
  author: "Author",
  reviewer: "Reviewer",
  editor: "Track Editor",
  chief: "Convener",
  admin: "Editorial Office",
};

/** Where each role lands after signing in. */
export const ROLE_HOME: Record<AppRole, string> = {
  author: "/author",
  reviewer: "/reviewer",
  editor: "/editor",
  chief: "/chief",
  admin: "/admin",
};
