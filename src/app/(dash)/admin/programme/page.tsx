import { requireRole } from "@/lib/auth";
import { ProgrammeBoardView } from "@/components/ProgrammeBoardView";

export const metadata = { title: "Conference Programme" };

export default async function AdminProgrammePage() {
  await requireRole("admin");
  return <ProgrammeBoardView basePath="/admin/programme" />;
}
