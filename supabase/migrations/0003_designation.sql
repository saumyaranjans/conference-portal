-- =====================================================================
-- Add professional designation captured at sign-up.
-- =====================================================================
alter table profiles
  add column if not exists designation text not null default '';

-- Recreate the sign-up handler so the designation from auth metadata
-- lands on the profile row.
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into profiles (id, email, full_name, affiliation, designation)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    coalesce(new.raw_user_meta_data->>'affiliation', ''),
    coalesce(new.raw_user_meta_data->>'designation', '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;
