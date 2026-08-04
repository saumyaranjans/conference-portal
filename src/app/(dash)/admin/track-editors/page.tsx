import { requireRole } from "@/lib/auth";
import { TrackEditorManagementView } from "@/components/TrackEditorManagementView";

export default async function AdminTrackEditorsPage() {
  await requireRole("admin", "chief");
  return <TrackEditorManagementView />;
}
