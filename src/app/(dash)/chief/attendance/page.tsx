import { requireRole } from "@/lib/auth";
import { AttendanceRegister } from "@/components/AttendanceRegister";

export default async function ChiefAttendancePage() {
  await requireRole("chief");
  return <AttendanceRegister />;
}
