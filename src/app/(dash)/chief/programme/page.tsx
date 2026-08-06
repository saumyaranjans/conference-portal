import { requireRole } from "@/lib/auth";
import { ProgrammeBoardView } from "@/components/ProgrammeBoardView";

export const metadata = { title: "Conference Programme" };

export default async function ChiefProgrammePage() {
  await requireRole("chief");
  return <ProgrammeBoardView basePath="/chief/programme" />;
}
