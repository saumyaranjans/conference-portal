import { redirect } from "next/navigation";
import { requireProfile } from "@/lib/auth";
import { PageHeader } from "@/components/ui/Primitives";
import { ThankYouPanel } from "@/components/ThankYouPanel";
import { myRegistration } from "@/lib/registrationActions";

/**
 * Where a delegate lands after the bank confirms payment.
 *
 * Shows the receipt rather than describing it. A registration is the one thing
 * on this portal a delegate pays real money for, and being told "thank you,
 * your invoice is available somewhere" is a weaker confirmation than seeing
 * the document itself with their name and the amount on it.
 *
 * Reached only with a paid registration. Anyone else is sent back to
 * /registration — a thank-you page for a payment that did not happen would be
 * worse than useless, and the URL is guessable.
 */
export default async function ThankYouPage() {
  const profile = await requireProfile();
  const registration = await myRegistration(profile.id);

  if (!registration || registration.status !== "paid") {
    redirect("/registration");
  }

  const sub = Array.isArray(registration.submissions)
    ? registration.submissions[0]
    : registration.submissions;

  return (
    <>
      <PageHeader
        title="Thank you — you are registered"
        subtitle="GLOGIFT 2027 · 25–27 February 2027 · IIM Sambalpur"
      />
      <ThankYouPanel
        registrationId={registration.id}
        currency={registration.currency}
        paid={registration.total_amount ?? registration.amount}
        paidAt={registration.paid_at}
        paperReference={sub?.paper_id ?? null}
        participationMode={registration.participation_mode ?? null}
      />
    </>
  );
}
