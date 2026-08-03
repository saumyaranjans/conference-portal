import { requireRole } from "@/lib/auth";
import { AuthorManagementView } from "@/components/AuthorManagementView";

export default async function ChiefAuthorsPage() {
  await requireRole("chief", "admin");
  return <AuthorManagementView />;
}
