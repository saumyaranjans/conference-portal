export type AppRole = "author" | "reviewer" | "editor" | "chief" | "admin";

export type SubmissionStatus =
  | "draft"
  | "submitted"
  | "under_review"
  | "revisions_requested"
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
  affiliation: string;
  designation: string;
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
  description: string;
  editor_id: string | null;
}

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
  file_path: string | null;
  file_name: string | null;
  submitted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Assignment {
  id: string;
  submission_id: string;
  reviewer_id: string;
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

/** Human-readable labels, kept in one place so every dashboard agrees. */
export const STATUS_LABELS: Record<SubmissionStatus, string> = {
  draft: "Draft",
  submitted: "Submitted",
  under_review: "Under Review",
  revisions_requested: "Revisions Requested",
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
  editor: "Editor",
  chief: "Editor-in-Chief",
  admin: "Administrator",
};

/** Where each role lands after signing in. */
export const ROLE_HOME: Record<AppRole, string> = {
  author: "/author",
  reviewer: "/reviewer",
  editor: "/editor",
  chief: "/chief",
  admin: "/admin",
};
