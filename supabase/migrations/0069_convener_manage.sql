-- =====================================================================
-- Convener access tier: a Convener (chief) can hold either VIEW-ONLY or
-- MANAGE (edit) rights. `convener_manage` gates every Convener write action
-- (see requireConvenerManage in src/lib/auth.ts). Default true so existing
-- Conveners keep full rights. Only the Editorial Office (admin) may set it.
-- =====================================================================

alter table profiles
  add column if not exists convener_manage boolean not null default true;

-- Guard the new column the same way as roles/is_active: only the Editorial
-- Office (or the service_role, used by the admin action) may change it, so a
-- view-only Convener cannot self-escalate by editing their own profile.
create or replace function public.protect_profile_privileged_fields()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  if (
    old.id is distinct from new.id
    or old.roles is distinct from new.roles
    or old.is_active is distinct from new.is_active
    or old.created_at is distinct from new.created_at
    or old.convener_manage is distinct from new.convener_manage
  ) and coalesce(auth.role(), '') <> 'service_role'
    and not has_role('admin') then
    raise exception 'Only the Editorial Office may change privileged profile fields.'
      using errcode = '42501';
  end if;
  return new;
end;
$function$;

select 'ok' as done;
