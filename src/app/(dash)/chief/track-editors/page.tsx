import { requireRole } from "@/lib/auth";
import { TrackEditorManagementView } from "@/components/TrackEditorManagementView";

export default async function ChiefTrackEditorsPage() {
  await requireRole("chief", "admin");
  return <TrackEditorManagementView />;
}
