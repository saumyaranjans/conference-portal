"use client";

import { usePathname, useRouter } from "next/navigation";
import { ROLE_HOME, ROLE_LABELS, type AppRole } from "@/lib/types";

/**
 * Dropdown that lets a multi-role user jump to any dashboard they hold.
 * The current role is inferred from the URL so the selector always
 * reflects where you are.
 */
export function RoleSwitcher({ roles }: { roles: AppRole[] }) {
  const router = useRouter();
  const pathname = usePathname();

  const current: AppRole =
    (["admin", "chief", "editor", "reviewer", "author"] as AppRole[]).find((r) =>
      pathname.startsWith(ROLE_HOME[r])
    ) ?? roles[0];

  if (roles.length <= 1) return null;

  return (
    <label className="flex items-center gap-2">
      <span className="text-xs text-slate-500 hidden sm:inline">View as</span>
      <select
        value={current}
        onChange={(e) => router.push(ROLE_HOME[e.target.value as AppRole])}
        className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-sm
                   font-medium text-slate-700 outline-none focus:border-blue-500
                   focus:ring-2 focus:ring-blue-100"
        aria-label="Switch role"
      >
        {roles.map((r) => (
          <option key={r} value={r}>
            {ROLE_LABELS[r]}
          </option>
        ))}
      </select>
    </label>
  );
}
