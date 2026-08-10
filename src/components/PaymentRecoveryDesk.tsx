"use client";

import { useState } from "react";
import { confirmPaymentManually } from "@/lib/paymentRecoveryActions";
import { formatMoney } from "@/lib/registrationFees";

type Row = {
  id: string;
  status: string;
  currency: "INR" | "USD";
  amount: number;
  total_amount: number | null;
  created_at: string;
  participant_category: string;
  profiles: { full_name: string | null; email: string | null } | null;
  payment_orders:
    | { order_id: string; status: string; provider_ref: string | null }[]
    | { order_id: string; status: string; provider_ref: string | null }
    | null;
};

/**
 * The Convener's desk for payments the bank took but the portal never settled.
 *
 * One row per unsettled registration, each with the order reference to search
 * the bank statement for. Confirming asks for the bank reference rather than
 * offering a bare "mark paid" button: this is an override of an automated
 * decision about money, and it should cost the person making it the ten
 * seconds it takes to write down what they checked.
 */
export function PaymentRecoveryDesk({ rows }: { rows: Row[] }) {
  const [openId, setOpenId] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<
    { id: string; ok: boolean; message?: string } | null
  >(null);

  async function onConfirm(e: React.FormEvent<HTMLFormElement>, id: string) {
    e.preventDefault();
    setPending(true);
    setResult(null);
    try {
      const res = await confirmPaymentManually(new FormData(e.currentTarget));
      setResult({ id, ...res });
      if (res.ok) setOpenId(null);
    } finally {
      setPending(false);
    }
  }

  if (!rows.length) {
    return (
      <p className="card card-pad text-sm text-slate-500">
        No unsettled registrations. Every registration taken so far is either
        paid or was never started.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-slate-500">
        Registrations the gateway did not settle. Check the order reference
        against the bank statement before confirming — confirming here marks
        the delegate registered and issues their invoice.
      </p>

      {rows.map((r) => {
        const orders = Array.isArray(r.payment_orders)
          ? r.payment_orders
          : r.payment_orders
            ? [r.payment_orders]
            : [];
        const owed = r.total_amount ?? r.amount;
        const isOpen = openId === r.id;
        const said = result?.id === r.id ? result : null;

        return (
          <div key={r.id} className="card card-pad">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                  {r.profiles?.full_name || "(name missing)"}{" "}
                  <span className="font-normal text-slate-500">
                    · {r.profiles?.email}
                  </span>
                </p>
                <p className="mt-0.5 text-xs text-slate-500">
                  {formatMoney(r.currency, owed)} · {r.participant_category} ·
                  started {new Date(r.created_at).toLocaleDateString("en-GB")}
                </p>
                {orders.length > 0 && (
                  <p className="mt-1 font-mono text-xs text-slate-600 dark:text-slate-300">
                    {orders.map((o) => o.order_id).join(", ")}
                  </p>
                )}
              </div>

              <div className="flex shrink-0 items-center gap-2">
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                    r.status === "failed"
                      ? "bg-red-50 text-red-700 dark:bg-red-500/15 dark:text-red-300"
                      : "bg-amber-50 text-amber-800 dark:bg-amber-500/15 dark:text-amber-200"
                  }`}
                >
                  {r.status === "failed" ? "Failed" : "Awaiting payment"}
                </span>
                <button
                  type="button"
                  className="btn-secondary text-sm"
                  onClick={() => setOpenId(isOpen ? null : r.id)}
                >
                  {isOpen ? "Cancel" : "Confirm payment"}
                </button>
              </div>
            </div>

            {isOpen && (
              <form
                onSubmit={(e) => onConfirm(e, r.id)}
                className="mt-3 border-t border-slate-200 pt-3 dark:border-slate-700"
              >
                <input type="hidden" name="registration_id" value={r.id} />
                <div className="flex flex-wrap items-end gap-3">
                  <div>
                    <label
                      htmlFor={`ref-${r.id}`}
                      className="label text-xs"
                    >
                      Bank reference (UTR / RRN){" "}
                      <span className="text-red-600">*</span>
                    </label>
                    <input
                      id={`ref-${r.id}`}
                      name="bank_reference"
                      required
                      autoComplete="off"
                      className="input font-mono text-sm sm:w-56"
                      placeholder="e.g. 431209876543"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <label htmlFor={`note-${r.id}`} className="label text-xs">
                      Note <span className="font-normal text-slate-500">(optional)</span>
                    </label>
                    <input
                      id={`note-${r.id}`}
                      name="note"
                      className="input text-sm w-full"
                      placeholder="What you checked, and where"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={pending}
                    className="btn-primary text-sm"
                  >
                    {pending ? "Confirming…" : "Confirm as paid"}
                  </button>
                </div>
                <p className="mt-2 text-xs text-slate-500">
                  This marks the delegate registered, redeems any coupon and
                  records you as the person who confirmed it.
                </p>
              </form>
            )}

            {said?.message && (
              <p
                className={`mt-2 rounded-lg px-3 py-2 text-sm ${
                  said.ok
                    ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-200"
                    : "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-300"
                }`}
              >
                {said.message}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
