import { requireRole } from "@/lib/auth";
import { ReviewerManagementView } from "@/components/ReviewerManagementView";

export default async function AdminReviewersPage() {
  await requireRole("admin", "chief");
  return <ReviewerManagementView />;
}
