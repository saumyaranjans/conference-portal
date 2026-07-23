"use client";

import { usePathname, useRouter } from "next/navigation";
import { ROLE_HOME, ROLE_LABELS, type AppRole } from "@/lib/types";

const ROLE_ORDER: AppRole[] = ["admin", "chief", "editor", "reviewer", "author"];

/**
 * Dropdown that lets a multi-role user jump to any dashboard they hold.
 *
 * On pages that don't belong to a role (e.g. /profile) nothing is selected,
 * so picking any role still fires a change and navigates — otherwise the
 * select would already show that role and selecting it would do nothing.
 */
export function RoleSwitcher({ roles }: { roles: AppRole[] }) {
  const router = useRouter();
  const pathname = usePathname();

  const matched = ROLE_ORDER.find(
    (r) => roles.includes(r) && pathname.startsWith(ROLE_HOME[r])
  );

  if (roles.length <= 1) return null;

  function go(value: string) {
    if (!value) return;
    router.push(ROLE_HOME[value as AppRole]);
  }

  return (
    <label className="flex items-center gap-2">
      <span className="text-xs text-slate-500 hidden sm:inline">View as</span>
      <select
        value={matched ?? ""}
        onChange={(e) => go(e.target.value)}
        className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-sm
                   font-medium text-slate-700 outline-none focus:border-blue-500
                   focus:ring-2 focus:ring-blue-100"
        aria-label="Switch role"
      >
        {!matched && (
          <option value="" disabled>
            Select…
          </option>
        )}
        {roles.map((r) => (
          <option key={r} value={r}>
            {ROLE_LABELS[r]}
          </option>
        ))}
      </select>
    </label>
  );
}
