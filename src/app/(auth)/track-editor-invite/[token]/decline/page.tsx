import { TrackEditorDecline } from "@/components/TrackEditorDecline";

import type { Metadata } from "next";
// Utility/token page — never index, never follow.
export const metadata: Metadata = { robots: { index: false, follow: false } };

/** Decline landing for a track-editor invitation (email "Decline" link). */
export default async function TrackEditorDeclinePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  return <TrackEditorDecline token={token} />;
}
