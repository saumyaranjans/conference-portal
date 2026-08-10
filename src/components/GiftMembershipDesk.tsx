import { createAdminClient } from "@/lib/supabase/server";
import { ActionForm, SubmitButton } from "@/components/ActionForm";
import { EmptyState, PageHeader, formatDate } from "@/components/ui/Primitives";
import {
  verifyGiftMembership,
  revokeGiftMembership,
} from "@/lib/membershipActions";
import { MEMBER_DISCOUNT_PERCENT } from "@/lib/registrationFees";

/**
 * The GIFT membership desk, shared by the Convener and the Editorial Office.
 *
 * Lists everyone who CLAIMED membership at sign-up so staff can check the
 * number against the Society's roll. Verifying issues a single-use coupon and
 * emails it; nothing else grants the discount, so an unverified claim costs
 * the conference nothing.
 */
export async function GiftMembershipDesk({ canManage }: { canManage: boolean }) {
  const admin = createAdminClient();

  const { data: claims, error } = await admin
    .from("profiles")
    .select(
      "id, full_name, email, affiliation, glogift_member, glogift_membership_no, glogift_membership_verified, glogift_membership_verified_at, created_at"
    )
    .eq("glogift_member", true)
    .order("created_at", { ascending: false });

  // Migration 0080 not applied yet — say so rather than rendering an empty
  // desk that looks like "nobody has claimed membership".
  if (error) {
    return (
      <>
        <PageHeader title="GIFT membership" />
        <div className="card card-pad text-sm text-amber-800 bg-amber-50 border-amber-200">
          This desk needs migration{" "}
          <code className="font-mono">0080_gift_membership_coupons.sql</code> to
          be run in the Supabase SQL editor first.
        </div>
      </>
    );
  }

  const rows = (claims as any[]) ?? [];

  const { data: couponRows } = await admin
    .from("registration_coupons")
    .select("profile_id, code, status, emailed_at, redeemed_at");
  const couponByProfile = new Map(
    ((couponRows as any[]) ?? [])
      .filter((c) => c.status !== "revoked")
      .map((c) => [c.profile_id, c])
  );

  const verified = rows.filter((r) => r.glogift_membership_verified);
  const pending = rows.filter((r) => !r.glogift_membership_verified);

  return (
    <>
      <PageHeader
        title="GIFT membership"
        subtitle={`Verify a claimed membership to issue and email a ${MEMBER_DISCOUNT_PERCENT}% discount coupon. A claim on its own gives no discount.`}
      />

      {rows.length === 0 ? (
        <EmptyState
          title="No membership claims yet"
          description="Delegates who answer “yes” to the GIFT membership question at sign-up appear here."
        />
      ) : (
        <div className="space-y-3">
          {[...pending, ...verified].map((u) => {
            const coupon = couponByProfile.get(u.id);
            return (
              <div key={u.id} className="card card-pad">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="font-medium text-slate-900 dark:text-slate-100">
                      {u.full_name || "(no name)"}
                      {u.glogift_membership_verified ? (
                        <span className="badge bg-emerald-100 text-emerald-800 ml-2">
                          Verified
                        </span>
                      ) : (
                        <span className="badge bg-amber-100 text-amber-800 ml-2">
                          Unverified claim
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {u.email}
                      {u.affiliation ? ` · ${u.affiliation}` : ""}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      Membership no.{" "}
                      <span className="font-mono text-slate-700 dark:text-slate-300">
                        {u.glogift_membership_no?.trim() || "— not supplied —"}
                      </span>
                      {u.glogift_membership_verified_at &&
                        ` · verified ${formatDate(u.glogift_membership_verified_at)}`}
                    </p>
                    {coupon && (
                      <p className="text-xs mt-1 text-slate-500">
                        Coupon{" "}
                        <span className="font-mono font-medium text-slate-800 dark:text-slate-200">
                          {coupon.code}
                        </span>
                        {coupon.status === "redeemed"
                          ? " · used"
                          : coupon.emailed_at
                            ? " · emailed"
                            : " · NOT emailed"}
                      </p>
                    )}
                  </div>

                  {canManage && (
                    <div className="flex shrink-0 gap-2">
                      {u.glogift_membership_verified ? (
                        <ActionForm
                          action={revokeGiftMembership}
                          confirm={`Withdraw verification for ${u.full_name}? Any unused coupon is revoked.`}
                        >
                          <input type="hidden" name="profile_id" value={u.id} />
                          <SubmitButton
                            variant="danger"
                            className="text-xs py-1.5 px-3"
                          >
                            Withdraw
                          </SubmitButton>
                        </ActionForm>
                      ) : (
                        <ActionForm action={verifyGiftMembership}>
                          <input type="hidden" name="profile_id" value={u.id} />
                          <SubmitButton className="text-xs py-1.5 px-3">
                            Verify &amp; send coupon
                          </SubmitButton>
                        </ActionForm>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
