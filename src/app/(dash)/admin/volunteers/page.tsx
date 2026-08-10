import { requireRole } from "@/lib/auth";
import { VolunteerRequests } from "@/components/VolunteerRequests";

export default async function AdminVolunteersPage() {
  await requireRole("admin");
  return <VolunteerRequests basePath="/admin" />;
}
