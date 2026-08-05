import { requireRole } from "@/lib/auth";
import { EventManagementView } from "@/components/EventManagementView";

export default async function ChiefEventManagementPage() {
  await requireRole("chief", "admin");
  return <EventManagementView />;
}
