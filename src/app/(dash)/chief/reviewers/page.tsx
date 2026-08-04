import { requireRole } from "@/lib/auth";
import { ReviewerManagementView } from "@/components/ReviewerManagementView";

export default async function ChiefReviewersPage() {
  await requireRole("chief", "admin");
  return <ReviewerManagementView />;
}
