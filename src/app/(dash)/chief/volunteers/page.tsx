import { requireRole } from "@/lib/auth";
import { VolunteerRequests } from "@/components/VolunteerRequests";

export default async function ChiefVolunteersPage() {
  await requireRole("chief", "admin");
  return <VolunteerRequests basePath="/chief" />;
}
