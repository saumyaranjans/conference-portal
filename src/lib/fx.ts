/**
 * USD → INR exchange rate, fetched server-side (so it is not subject to the
 * browser CSP) and cached for a few hours. Used to show the Indian equivalent
 * of a Foreign Delegate's USD fee and to fold that amount into INR revenue.
 *
 * Falls back to a sane constant if the rate service is unreachable, so the
 * portal never breaks over a missed FX call.
 */
const FALLBACK_USD_INR = 83;

export async function getUsdInrRate(): Promise<{ rate: number; live: boolean }> {
  try {
    const res = await fetch("https://open.er-api.com/v6/latest/USD", {
      // Refresh a few times a day — "that day's rate".
      next: { revalidate: 21600 },
    });
    if (res.ok) {
      const data = (await res.json()) as { rates?: { INR?: number } };
      const rate = Number(data?.rates?.INR);
      if (Number.isFinite(rate) && rate > 0) return { rate, live: true };
    }
  } catch {
    // fall through to the constant below
  }
  return { rate: FALLBACK_USD_INR, live: false };
}

/** Convert a USD amount to whole INR at the given rate. */
export function usdToInr(usd: number, rate: number): number {
  return Math.round(usd * rate);
}
