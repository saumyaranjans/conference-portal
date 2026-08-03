import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { GeoVisitMap } from "@/components/GeoVisitMap";
import { PageHeader, Section, StatCard } from "@/components/ui/Primitives";

/**
 * Website-visit analytics for the Convener: counts by country (world map +
 * table) and by Indian state (India map + table). Geolocation is captured per
 * visit from the edge headers (see /api/visit).
 */
export default async function VisitAnalyticsPage() {
  await requireRole("chief", "admin");
  const supabase = await createClient();

  // Visits are small; fetch the two geo columns and aggregate in-process.
  const { data } = await supabase
    .from("site_visits")
    .select("country, region")
    .limit(100000);
  const rows = (data ?? []) as { country: string | null; region: string | null }[];

  const worldValues: Record<string, number> = {};
  const indiaValues: Record<string, number> = {};
  let unknown = 0;
  for (const r of rows) {
    const c = (r.country ?? "").trim().toLowerCase();
    if (!c) {
      unknown++;
      continue;
    }
    worldValues[c] = (worldValues[c] ?? 0) + 1;
    if (c === "in") {
      const s = (r.region ?? "").trim().toLowerCase();
      if (s) indiaValues[s] = (indiaValues[s] ?? 0) + 1;
    }
  }

  const total = rows.length;
  const countries = Object.keys(worldValues).length;
  const states = Object.keys(indiaValues).length;
  const indiaTotal = worldValues["in"] ?? 0;

  return (
    <>
      <PageHeader
        title="Visit Analytics"
        subtitle="Where visitors to glogift2027.in are coming from — by country and by Indian state."
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Total visits" value={total} />
        <StatCard label="Countries" value={countries} />
        <StatCard label="India visits" value={indiaTotal} />
        <StatCard label="Indian states" value={states} />
      </div>

      <Section title="By country — World">
        <GeoVisitMap kind="world" values={worldValues} regionLabel="Country" />
      </Section>

      <Section title="By state — India">
        <GeoVisitMap kind="india" values={indiaValues} regionLabel="State" />
      </Section>

      {unknown > 0 && (
        <p className="text-xs text-slate-400 mt-2">
          {unknown} visit{unknown === 1 ? "" : "s"} without a resolved location
          (e.g. local or unrecognised networks) are not shown on the maps.
        </p>
      )}
    </>
  );
}
