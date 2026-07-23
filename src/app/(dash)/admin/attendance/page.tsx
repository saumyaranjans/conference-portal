import { requireRole } from "@/lib/auth";
import { AttendanceRegister } from "@/components/AttendanceRegister";

export default async function AdminAttendancePage() {
  await requireRole("admin", "chief");
  return <AttendanceRegister />;
}
