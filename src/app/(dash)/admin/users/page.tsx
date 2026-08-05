import { requireRole } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/server";
import {
  setUserActive,
  updateUserRoles,
  setConvenerManage,
} from "@/lib/actions";
import { ActionForm, SubmitButton } from "@/components/ActionForm";
import { PageHeader, formatDate } from "@/components/ui/Primitives";
import { ROLE_LABELS, type AppRole, type Profile } from "@/lib/types";

const ALL_ROLES: AppRole[] = ["author", "reviewer", "editor", "chief", "admin"];

export default async function AdminUsersPage() {
  const me = await requireRole("admin");
  const admin = createAdminClient();

  const { data } = await admin
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: false });

  const users = (data ?? []) as Profile[];

  return (
    <>
      <PageHeader
        title="Users & Roles"
        subtitle="Grant reviewer, editor, chief or admin rights. Everyone is an author by default."
      />

      <div className="space-y-3">
        {users.map((u) => (
          <div key={u.id} className="card card-pad">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="font-medium text-slate-900">
                  {u.full_name || "(no name)"}
                  {u.id === me.id && (
                    <span className="badge bg-blue-100 text-blue-800 ml-2">
                      You
                    </span>
                  )}
                  {!u.is_active && (
                    <span className="badge bg-red-100 text-red-800 ml-2">
                      Deactivated
                    </span>
                  )}
                </p>
                <p className="text-xs text-slate-500 mt-0.5">
                  {u.email}
                  {u.affiliation ? ` · ${u.affiliation}` : ""}
                  {u.designation ? ` · ${u.designation}` : ""}
                  {u.participant_category ? ` · ${u.participant_category}` : ""} ·
                  joined {formatDate(u.created_at)}
                </p>
              </div>

              <ActionForm action={setUserActive}>
                <input type="hidden" name="user_id" value={u.id} />
                <input
                  type="hidden"
                  name="active"
                  value={String(!u.is_active)}
                />
                <SubmitButton
                  variant={u.is_active ? "danger" : "secondary"}
                  className="text-xs py-1.5 px-3"
                >
                  {u.is_active ? "Deactivate" : "Reactivate"}
                </SubmitButton>
              </ActionForm>
            </div>

            <ActionForm action={updateUserRoles} className="mt-4">
              <input type="hidden" name="user_id" value={u.id} />
              <div className="flex flex-wrap items-center gap-3">
                {ALL_ROLES.map((r) => (
                  <label
                    key={r}
                    className="flex items-center gap-2 text-sm border border-slate-200
                               rounded-lg px-3 py-1.5 cursor-pointer hover:bg-slate-50
                               has-[:checked]:border-blue-500 has-[:checked]:bg-blue-50"
                  >
                    <input
                      type="checkbox"
                      name="roles"
                      value={r}
                      defaultChecked={u.roles.includes(r)}
                    />
                    {ROLE_LABELS[r]}
                  </label>
                ))}
                <SubmitButton variant="secondary" className="text-sm py-1.5">
                  Save roles
                </SubmitButton>
              </div>
            </ActionForm>

            {/* Convener access tier — Editorial Office (admin) only. */}
            {u.roles.includes("chief") && (
              <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3 dark:border-slate-800">
                <span className="text-xs font-medium text-slate-500">
                  Convener rights:
                </span>
                <span
                  className={`badge ${
                    u.convener_manage !== false
                      ? "bg-emerald-100 text-emerald-800"
                      : "bg-amber-100 text-amber-800"
                  }`}
                >
                  {u.convener_manage !== false ? "Manage (edit)" : "View-only"}
                </span>
                <ActionForm action={setConvenerManage}>
                  <input type="hidden" name="user_id" value={u.id} />
                  <input
                    type="hidden"
                    name="manage"
                    value={String(!(u.convener_manage !== false))}
                  />
                  <SubmitButton
                    variant="secondary"
                    className="text-xs py-1.5 px-3"
                  >
                    {u.convener_manage !== false
                      ? "Set to View-only"
                      : "Set to Manage"}
                  </SubmitButton>
                </ActionForm>
              </div>
            )}
          </div>
        ))}
      </div>
    </>
  );
}
