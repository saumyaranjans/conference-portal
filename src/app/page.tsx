import { redirect } from "next/navigation";
import { getProfile } from "@/lib/auth";
import { ROLE_HOME, type AppRole } from "@/lib/types";

const PRIORITY: AppRole[] = ["admin", "chief", "editor", "reviewer", "author"];

export default async function Home() {
  const profile = await getProfile();

  // Signed in? Go straight to the most privileged dashboard they hold.
  if (profile) {
    const primary = PRIORITY.find((r) => profile.roles.includes(r)) ?? "author";
    redirect(ROLE_HOME[primary]);
  }

  // Not signed in? The front door is the Sign In page.
  redirect("/login");
}
