import { requireRole } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/server";
import { GeoVisitMap } from "@/components/GeoVisitMap";
import { PageHeader, Section, StatCard } from "@/components/ui/Primitives";

/**
 * Website-visit analytics surfaced on the Track Editor dashboard: counts by
 * country (world map + table) and by Indian state (India map + table). Mirrors
 * the Convener's Visit Analytics; uses the admin client for the full picture.
 */
export default async function EditorVisitAnalyticsPage() {
  await requireRole("editor");
  const admin = createAdminClient();

  const { data } = await admin
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
