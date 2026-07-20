import { requireProfile } from "@/lib/auth";
import { DashboardShell } from "@/components/DashboardShell";

export default async function DashLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await requireProfile();
  return <DashboardShell profile={profile}>{children}</DashboardShell>;
}
