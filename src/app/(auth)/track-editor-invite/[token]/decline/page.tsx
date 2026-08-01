import { TrackEditorDecline } from "@/components/TrackEditorDecline";

/** Decline landing for a track-editor invitation (email "Decline" link). */
export default async function TrackEditorDeclinePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  return <TrackEditorDecline token={token} />;
}
