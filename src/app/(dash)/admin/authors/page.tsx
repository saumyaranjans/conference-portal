import { requireRole } from "@/lib/auth";
import { AuthorManagementView } from "@/components/AuthorManagementView";

export default async function AdminAuthorsPage() {
  await requireRole("admin", "chief");
  return <AuthorManagementView />;
}
