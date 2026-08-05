/**
 * Instant loading skeleton for dashboard pages. Next renders this immediately
 * on navigation (including right after sign-in) while the page's server data
 * loads, so the portal feels quick instead of blank.
 */
export default function DashboardLoading() {
  return (
    <div className="animate-pulse space-y-5">
      <div className="h-7 w-56 rounded bg-slate-200 dark:bg-slate-800" />
      <div className="h-4 w-80 max-w-full rounded bg-slate-100 dark:bg-slate-800/70" />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="h-24 rounded-xl bg-slate-100 dark:bg-slate-800/60"
          />
        ))}
      </div>
      <div className="h-72 rounded-xl bg-slate-100 dark:bg-slate-800/60" />
    </div>
  );
}
