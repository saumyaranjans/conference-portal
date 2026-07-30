import { redirect } from "next/navigation";
import { getProfile } from "@/lib/auth";
import { ROLE_HOME, type AppRole } from "@/lib/types";
import { LandingPage } from "@/components/landing/LandingPage";

// Landing priority for multi-role users: Convener → Track Editor → Author →
// Reviewer → Editorial Office.
const PRIORITY: AppRole[] = ["chief", "editor", "author", "reviewer", "admin"];

export default async function Home() {
  const profile = await getProfile();

  // Signed in? Go straight to the most privileged dashboard they hold.
  if (profile) {
    const primary = PRIORITY.find((r) => profile.roles.includes(r)) ?? "author";
    redirect(ROLE_HOME[primary]);
  }

  // Not signed in? The conference landing page is the front door; the portal
  // is one click away from it.
  return <LandingPage />;
}
