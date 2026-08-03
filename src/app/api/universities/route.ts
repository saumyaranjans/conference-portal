import { NextResponse } from "next/server";
import universities from "@/data/universities.json";

type U = { n: string; c: string };
const DATA = universities as U[];

// Curated FULL-name list for Indian institutes, searched first so the formal
// name is offered (e.g. "Indian Institute of Management Sambalpur", never the
// short "IIM Sambalpur"). Each entry carries an alias string so a user typing
// the abbreviation ("iim sambalpur") still resolves to the full name.
const IIM_CITIES = [
  "Ahmedabad", "Bangalore", "Calcutta", "Lucknow", "Kozhikode", "Indore",
  "Shillong", "Rohtak", "Ranchi", "Raipur", "Tiruchirappalli", "Udaipur",
  "Kashipur", "Nagpur", "Visakhapatnam", "Bodh Gaya", "Amritsar", "Sambalpur",
  "Sirmaur", "Jammu", "Mumbai",
];
const IIT_CITIES = [
  "Bombay", "Delhi", "Madras", "Kanpur", "Kharagpur", "Roorkee", "Guwahati",
  "Bhubaneswar", "Hyderabad", "Gandhinagar", "Ropar", "Patna", "Indore",
  "Mandi", "Jodhpur", "(BHU) Varanasi", "Palakkad", "Tirupati", "Dhanbad",
  "Bhilai", "Goa", "Jammu", "Dharwad",
];
const CURATED: { n: string; k: string }[] = [
  ...IIM_CITIES.map((c) => ({
    n: `Indian Institute of Management ${c}`,
    k: `iim ${c}`,
  })),
  ...IIT_CITIES.map((c) => ({
    n: `Indian Institute of Technology ${c}`,
    k: `iit ${c}`,
  })),
  { n: "Indian Institute of Science, Bangalore", k: "iisc bengaluru bangalore" },
  { n: "Indian School of Business, Hyderabad", k: "isb hyderabad" },
  { n: "XLRI – Xavier School of Management, Jamshedpur", k: "xlri jamshedpur" },
  { n: "National Institute of Industrial Engineering, Mumbai", k: "nitie mumbai" },
];

/** Curated full-name matches, prefix (name or alias) first. */
function searchCurated(q: string): string[] {
  const starts: string[] = [];
  const contains: string[] = [];
  for (const e of CURATED) {
    const name = e.n.toLowerCase();
    const alias = e.k.toLowerCase();
    if (name.startsWith(q) || alias.startsWith(q)) starts.push(e.n);
    else if (name.includes(q) || alias.includes(q)) contains.push(e.n);
  }
  return [...starts, ...contains];
}

/** Local, offline fallback list — prefix matches first, then substring. */
function searchLocal(q: string): string[] {
  const starts: string[] = [];
  const contains: string[] = [];
  for (const u of DATA) {
    const name = u.n.toLowerCase();
    const label = u.c ? `${u.n}, ${u.c}` : u.n;
    if (name.startsWith(q)) {
      if (starts.length < 8) starts.push(label);
    } else if (name.includes(q)) {
      if (contains.length < 8) contains.push(label);
    }
    if (starts.length >= 8 && contains.length >= 8) break;
  }
  return [...starts, ...contains];
}

/** Comprehensive results from the Research Organization Registry (ROR). */
async function searchRor(q: string): Promise<string[]> {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), 3000);
  try {
    const res = await fetch(
      `https://api.ror.org/v2/organizations?query=${encodeURIComponent(q)}`,
      {
        signal: controller.signal,
        headers: { Accept: "application/json" },
        redirect: "error",
        cache: "no-store",
      }
    );
    if (!res.ok) return [];
    const data = await res.json();
    return (data.items ?? []).slice(0, 10).map((it: any) => {
      const names: any[] = it.names ?? [];
      const display =
        names.find((n) => (n.types ?? []).includes("ror_display"))?.value ??
        names[0]?.value ??
        "";
      const country =
        it.locations?.[0]?.geonames_details?.country_name ?? "";
      const label = country ? `${display}, ${country}` : display;
      return label.slice(0, 240);
    }).filter(Boolean);
  } catch {
    return [];
  } finally {
    clearTimeout(t);
  }
}

export async function GET(request: Request) {
  const q = (new URL(request.url).searchParams.get("q") ?? "")
    .trim()
    .toLowerCase();
  if (q.length < 2) return NextResponse.json([]);
  if (q.length > 100 || /[\u0000-\u001f\u007f]/.test(q)) {
    return NextResponse.json(
      { error: "Invalid search query." },
      { status: 400, headers: { "Cache-Control": "no-store" } }
    );
  }

  // Curated Indian full-names first, then ROR (comprehensive), then local list.
  const [ror, local] = await Promise.all([
    searchRor(q),
    Promise.resolve(searchLocal(q)),
  ]);
  const curated = searchCurated(q);

  const seen = new Set<string>();
  const merged: string[] = [];
  for (const s of [...curated, ...ror, ...local]) {
    const key = s.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(s);
    if (merged.length >= 10) break;
  }

  return NextResponse.json(merged, {
    headers: { "Cache-Control": "private, no-store, max-age=0" },
  });
}
