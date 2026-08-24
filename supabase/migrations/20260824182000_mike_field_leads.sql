-- Mike field leads: production persistence for the credential-gated backend.
-- The backend must use SUPABASE_SERVICE_ROLE_KEY or DATABASE_URL; never expose
-- either credential to the browser.

create table if not exists public.field_leads (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default timezone('utc', now()),
  owner text not null default 'Mike',
  name text not null,
  phone text not null,
  email text not null,
  address text not null,
  business text not null,
  interest text not null default 'Printing',
  status text not null default 'New',
  delivery_crm text,
  delivery_email text,
  idempotency_key text unique,
  constraint field_leads_status_check check (status in ('New', 'Follow up', 'Paid', 'Email'))
);

create index if not exists field_leads_created_at_idx
  on public.field_leads (created_at desc);

alter table public.field_leads enable row level security;

revoke all on table public.field_leads from anon, authenticated;
grant select, insert on table public.field_leads to service_role;

drop policy if exists field_leads_service_role_select on public.field_leads;
create policy field_leads_service_role_select
  on public.field_leads
  for select
  to service_role
  using (true);

drop policy if exists field_leads_service_role_insert on public.field_leads;
create policy field_leads_service_role_insert
  on public.field_leads
  for insert
  to service_role
  with check (true);
