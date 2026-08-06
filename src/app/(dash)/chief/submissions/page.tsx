import { requireRole } from "@/lib/auth";
import { SubmissionManagementView } from "@/components/SubmissionManagementView";

export const metadata = { title: "Submission Management" };

export default async function ChiefSubmissionManagementPage() {
  const profile = await requireRole("chief");
  // Entering the scores is the Editorial Office's job, and that follows the
  // person rather than the URL: someone holding the Office role gets the input
  // boxes on this page too. A Convener without it still sees read-only scores.
  return (
    <SubmissionManagementView
      canRecordIntegrity={profile.roles.includes("admin")}
    />
  );
}
