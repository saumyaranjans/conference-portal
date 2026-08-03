"use client";

import { useEffect, useMemo, useState } from "react";

type Geo = { viewBox: string; locations: { id: string; name: string; path: string }[] };

/**
 * A choropleth map + ranked table of website visits, driven by a value map
 * keyed by the region id (lowercased ISO code). Geometry is fetched from
 * /maps/{kind}.json on mount so it never bloats the page bundle.
 */
export function GeoVisitMap({
  kind,
  values,
  regionLabel,
}: {
  kind: "india" | "world";
  values: Record<string, number>;
  /** e.g. "State" or "Country" — table header. */
  regionLabel: string;
}) {
  const [geo, setGeo] = useState<Geo | null>(null);
  const [hover, setHover] = useState<{ name: string; v: number } | null>(null);

  useEffect(() => {
    let alive = true;
    fetch(`/maps/${kind}.json`)
      .then((r) => r.json())
      .then((d) => alive && setGeo(d))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [kind]);

  const total = useMemo(() => Object.values(values).reduce((a, b) => a + b, 0), [values]);
  const max = useMemo(() => Math.max(1, ...Object.values(values)), [values]);

  const rows = useMemo(() => {
    if (!geo) return [];
    return geo.locations
      .map((l) => ({ name: l.name, v: values[l.id] ?? 0 }))
      .filter((r) => r.v > 0)
      .sort((a, b) => b.v - a.v);
  }, [geo, values]);

  const fill = (v: number) => {
    if (!v) return "var(--geo-empty, #e8ebf0)";
    const t = 0.2 + 0.8 * (v / max);
    return `rgba(37, 99, 235, ${t.toFixed(3)})`; // blue intensity
  };

  return (
    <div className="grid lg:grid-cols-5 gap-4 items-start">
      <div className="lg:col-span-3 card card-pad">
        {geo ? (
          <div className="relative">
            <svg viewBox={geo.viewBox} className="w-full h-auto" role="img" aria-label={`${kind} visit map`}>
              {geo.locations.map((l) => {
                const v = values[l.id] ?? 0;
                return (
                  <path
                    key={l.id}
                    d={l.path}
                    fill={fill(v)}
                    stroke="#ffffff"
                    strokeWidth={kind === "world" ? 0.4 : 0.8}
                    onMouseEnter={() => setHover({ name: l.name, v })}
                    onMouseLeave={() => setHover(null)}
                    style={{ cursor: "default" }}
                  >
                    <title>{`${l.name}: ${v}`}</title>
                  </path>
                );
              })}
            </svg>
            <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
              <span>
                {hover ? (
                  <span className="font-medium text-slate-700 dark:text-slate-200">
                    {hover.name}: {hover.v} visit{hover.v === 1 ? "" : "s"}
                  </span>
                ) : (
                  <span>Hover a region for its count</span>
                )}
              </span>
              <span className="flex items-center gap-1">
                Fewer
                <span className="inline-block h-2 w-16 rounded" style={{ background: "linear-gradient(90deg, rgba(37,99,235,0.2), rgba(37,99,235,1))" }} />
                More
              </span>
            </div>
          </div>
        ) : (
          <p className="text-sm text-slate-500 py-10 text-center">Loading map…</p>
        )}
      </div>

      <div className="lg:col-span-2 card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[11px] uppercase tracking-wide text-slate-500 border-b border-slate-100 dark:border-slate-700">
              <th className="px-3 py-2">{regionLabel}</th>
              <th className="px-3 py-2 text-right">Visits</th>
              <th className="px-3 py-2 text-right">Share</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={3} className="px-3 py-6 text-center text-slate-400">
                  No visits recorded yet.
                </td>
              </tr>
            )}
            {rows.map((r) => (
              <tr key={r.name} className="border-b border-slate-50 dark:border-slate-800">
                <td className="px-3 py-1.5 text-slate-700 dark:text-slate-200">{r.name}</td>
                <td className="px-3 py-1.5 text-right font-medium">{r.v}</td>
                <td className="px-3 py-1.5 text-right text-slate-500">
                  {total ? ((r.v / total) * 100).toFixed(1) : "0.0"}%
                </td>
              </tr>
            ))}
          </tbody>
          {rows.length > 0 && (
            <tfoot>
              <tr className="border-t border-slate-200 dark:border-slate-700 font-semibold">
                <td className="px-3 py-2">Total</td>
                <td className="px-3 py-2 text-right">{total}</td>
                <td className="px-3 py-2 text-right">100%</td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}
