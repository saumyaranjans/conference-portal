import { requireRole } from "@/lib/auth";
import { canManageAsConvener } from "@/lib/auth";
import { GiftMembershipDesk } from "@/components/GiftMembershipDesk";

/** Convener's view of the GIFT membership desk. A view-only Convener sees the
 *  list but gets no buttons — the actions would only redirect to /denied. */
export default async function ConvenerGiftMembersPage() {
  const profile = await requireRole("chief");
  return <GiftMembershipDesk canManage={canManageAsConvener(profile)} />;
}
