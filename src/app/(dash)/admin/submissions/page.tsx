import { requireRole } from "@/lib/auth";
import { SubmissionManagementView } from "@/components/SubmissionManagementView";

export const metadata = { title: "Submission Management" };

export default async function AdminSubmissionManagementPage() {
  await requireRole("admin");
  // Only the Editorial Office runs the integrity checks and enters the scores.
  return <SubmissionManagementView canRecordIntegrity />;
}
