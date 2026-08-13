-- Payment gateway configuration, editable by the Convener.
--
-- The credentials arrive from the bank during onboarding and change again at
-- go-live (UAT keys are replaced by production ones). Holding them only in
-- environment variables means every change is a redeploy by a developer; the
-- Convener should be able to complete onboarding without one.
--
-- One row, always. `id` is a boolean primary key fixed to true, so a second
-- row cannot be inserted and "the config" is never ambiguous.
create table if not exists payment_gateway_config (
  id boolean primary key default true check (id),

  -- Matches PAYMENT_PROVIDER: '', 'sandbox', 'icici_orange', ...
  provider text not null default '',

  merchant_id   text not null default '',
  aggregator_id text not null default '',
  -- The HMAC signing secret. Never returned to a browser: the server actions
  -- report whether it is set, never its value.
  secure_key    text not null default '',
  initiate_url  text not null default '',
  command_url   text not null default '',

  mode text not null default 'uat' check (mode in ('uat', 'production')),
  -- Payments stay shut until someone deliberately opens them, so a
  -- half-entered configuration cannot start taking money.
  enabled boolean not null default false,

  updated_by uuid references profiles(id) on delete set null,
  updated_at timestamptz not null default now()
);

insert into payment_gateway_config (id) values (true) on conflict (id) do nothing;

-- RLS on with NO policies: every client-side role is denied outright. Only the
-- service role reaches this table, which is what keeps the signing secret out
-- of anything a browser can reach. A leaked key lets an attacker forge a
-- payment advice and mark registrations paid.
alter table payment_gateway_config enable row level security;

comment on table payment_gateway_config is
  'Single-row gateway configuration. Service-role access only; secure_key must never be sent to a client.';
comment on column payment_gateway_config.secure_key is
  'HMAC-SHA256 signing secret. Write-only from the UI; never read back to a browser.';
