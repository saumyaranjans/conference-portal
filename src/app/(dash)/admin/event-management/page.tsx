import { requireRole } from "@/lib/auth";
import { EventManagementView } from "@/components/EventManagementView";

export default async function AdminEventManagementPage() {
  await requireRole("admin");
  return <EventManagementView />;
}
