import { requireRole } from "@/lib/auth";
import { GiftMembershipDesk } from "@/components/GiftMembershipDesk";

/** Editorial Office's view of the GIFT membership desk. Mirrors the Convener's
 *  page — both run this desk — and an admin always holds manage rights. */
export default async function AdminGiftMembersPage() {
  await requireRole("admin");
  return <GiftMembershipDesk canManage />;
}
