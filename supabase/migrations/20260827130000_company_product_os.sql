-- Vral Graphics Company Product OS
-- Server-only data plane. Browsers never receive the service-role key and never
-- talk directly to these tables. Public tracking is a capability token hashed by
-- the Node API before it reaches this database.

create extension if not exists pgcrypto;

create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  normalized_name text not null,
  dedupe_key text not null unique,
  website text,
  industry text,
  locale text not null default 'en',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists organizations_name_idx on public.organizations(normalized_name);

create table if not exists public.contacts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete set null,
  full_name text not null,
  email text,
  phone text,
  preferred_channel text not null default 'whatsapp' check (preferred_channel in ('whatsapp','phone','email')),
  locale text not null default 'en',
  consent_contact_at timestamptz,
  consent_offers_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint contacts_reachable check (coalesce(nullif(phone,''), nullif(email,'')) is not null)
);
create unique index if not exists contacts_email_unique on public.contacts (lower(email)) where email is not null and email <> '';
create index if not exists contacts_phone_idx on public.contacts (regexp_replace(phone, '[^0-9]', '', 'g')) where phone is not null and phone <> '';

create table if not exists public.locations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  label text not null default 'Primary',
  address_line text not null,
  city text,
  region text,
  postal_code text,
  country text not null default 'US',
  install_notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.catalog_products (
  id text primary key,
  name_en text not null,
  name_es text not null,
  active boolean not null default true,
  configuration_schema jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.catalog_versions (
  id uuid primary key default gen_random_uuid(),
  version_name text not null unique,
  currency text not null default 'USD',
  effective_at timestamptz not null default now(),
  retired_at timestamptz,
  published_by text,
  created_at timestamptz not null default now()
);

create table if not exists public.catalog_options (
  id uuid primary key default gen_random_uuid(),
  catalog_version_id uuid not null references public.catalog_versions(id) on delete cascade,
  product_id text not null references public.catalog_products(id) on delete cascade,
  sku text not null,
  label text not null,
  option_data jsonb not null default '{}'::jsonb,
  price_cents integer check (price_cents is null or price_cents >= 0),
  quote_only boolean not null default true,
  active boolean not null default true,
  unique (catalog_version_id, sku)
);

create table if not exists public.print_jobs (
  id uuid primary key default gen_random_uuid(),
  public_code text not null default upper(substr(replace(gen_random_uuid()::text,'-',''),1,8)) unique,
  organization_id uuid not null references public.organizations(id),
  primary_contact_id uuid not null references public.contacts(id),
  location_id uuid references public.locations(id),
  product_id text references public.catalog_products(id),
  sku text,
  source text not null default 'website',
  owner text not null default 'Mike',
  captured_by text,
  language text not null default 'en',
  stage text not null default 'New' check (stage in ('New','Contacted','Quoted','Awaiting Artwork','Awaiting Approval','Payment Pending','Paid','In Production','Ready','Completed','Lost')),
  goal text,
  quantity text,
  specifications jsonb not null default '{}'::jsonb,
  artwork_mode text,
  artwork_status text not null default 'needed' check (artwork_status in ('needed','selected','stored','in_review','approved','rejected','not_required')),
  fulfillment text check (fulfillment is null or fulfillment in ('pickup','delivery','installation')),
  needed_by date,
  notes text,
  payment_verified boolean not null default false,
  tracking_token_hash text not null unique,
  idempotency_key text unique,
  campaign text,
  referral text,
  follow_up_due timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz
);
create index if not exists print_jobs_stage_idx on public.print_jobs(stage, updated_at desc);
create index if not exists print_jobs_owner_idx on public.print_jobs(owner, stage);
create index if not exists print_jobs_org_idx on public.print_jobs(organization_id, updated_at desc);

create table if not exists public.job_assets (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.print_jobs(id) on delete cascade,
  kind text not null check (kind in ('artwork','reference','proof','production','delivery')),
  storage_path text not null,
  original_name text,
  mime_type text,
  size_bytes bigint check (size_bytes is null or size_bytes >= 0),
  version integer not null default 1,
  status text not null default 'stored',
  uploaded_by text,
  created_at timestamptz not null default now(),
  unique(job_id, storage_path)
);

create table if not exists public.quotes (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.print_jobs(id) on delete cascade,
  version integer not null default 1,
  status text not null default 'draft' check (status in ('draft','sent','accepted','declined','expired','superseded')),
  currency text not null default 'USD',
  subtotal_cents integer not null default 0 check (subtotal_cents >= 0),
  tax_cents integer not null default 0 check (tax_cents >= 0),
  total_cents integer not null default 0 check (total_cents >= 0),
  expires_at timestamptz,
  sent_at timestamptz,
  accepted_at timestamptz,
  created_by text,
  created_at timestamptz not null default now(),
  unique(job_id, version)
);

create table if not exists public.quote_items (
  id uuid primary key default gen_random_uuid(),
  quote_id uuid not null references public.quotes(id) on delete cascade,
  sku text,
  label text not null,
  quantity numeric not null default 1 check (quantity > 0),
  unit_cents integer not null check (unit_cents >= 0),
  taxable boolean not null default true,
  metadata jsonb not null default '{}'::jsonb
);

create table if not exists public.proofs (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.print_jobs(id) on delete cascade,
  asset_id uuid not null references public.job_assets(id),
  version integer not null,
  status text not null default 'review' check (status in ('review','changes_requested','approved','superseded')),
  sent_at timestamptz,
  decided_at timestamptz,
  created_by text,
  created_at timestamptz not null default now(),
  unique(job_id, version)
);

create table if not exists public.proof_comments (
  id uuid primary key default gen_random_uuid(),
  proof_id uuid not null references public.proofs(id) on delete cascade,
  author_type text not null check (author_type in ('customer','staff','system')),
  author_name text,
  body text not null,
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.approvals (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.print_jobs(id) on delete cascade,
  proof_id uuid references public.proofs(id),
  decision text not null check (decision in ('approved','changes_requested','declined')),
  actor_name text,
  actor_contact text,
  decision_note text,
  ip_hash text,
  created_at timestamptz not null default now()
);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.print_jobs(id) on delete cascade,
  quote_id uuid references public.quotes(id),
  provider text not null,
  external_payment_id text,
  external_event_id text unique,
  amount_cents integer check (amount_cents is null or amount_cents >= 0),
  currency text not null default 'USD',
  status text not null check (status in ('pending','verified','failed','refunded','void')),
  verified_at timestamptz,
  raw_reference jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.production_runs (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.print_jobs(id) on delete cascade,
  vendor text,
  status text not null default 'queued' check (status in ('queued','preflight','printing','finishing','quality_check','complete','failed')),
  due_at timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  production_notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.fulfillments (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.print_jobs(id) on delete cascade,
  method text not null check (method in ('pickup','delivery','installation')),
  status text not null default 'pending' check (status in ('pending','scheduled','out_for_delivery','ready','completed','failed')),
  scheduled_at timestamptz,
  completed_at timestamptz,
  tracking_reference text,
  recipient_name text,
  proof_asset_id uuid references public.job_assets(id),
  created_at timestamptz not null default now()
);

create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.print_jobs(id) on delete cascade,
  channel text not null check (channel in ('web','whatsapp','email','phone','internal')),
  external_thread_id text,
  status text not null default 'open' check (status in ('open','waiting_customer','waiting_team','closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.conversation_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  direction text not null check (direction in ('inbound','outbound','internal')),
  author text,
  body text not null,
  external_message_id text,
  delivery_status text,
  created_at timestamptz not null default now()
);

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  job_id uuid references public.print_jobs(id) on delete cascade,
  type text not null,
  title text not null,
  owner text,
  status text not null default 'open' check (status in ('open','in_progress','blocked','done','cancelled')),
  due_at timestamptz,
  completed_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists tasks_open_due_idx on public.tasks(status, due_at) where status in ('open','in_progress','blocked');

create table if not exists public.job_events (
  id bigint generated always as identity primary key,
  job_id uuid not null references public.print_jobs(id) on delete cascade,
  event_type text not null,
  actor text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists job_events_job_idx on public.job_events(job_id, created_at);

create table if not exists public.job_exceptions (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.print_jobs(id) on delete cascade,
  code text not null,
  severity text not null check (severity in ('low','medium','high','critical')),
  title text not null,
  detail text,
  status text not null default 'open' check (status in ('open','acknowledged','resolved','dismissed')),
  owner text,
  opened_at timestamptz not null default now(),
  resolved_at timestamptz
);
create index if not exists job_exceptions_open_idx on public.job_exceptions(status, severity, opened_at) where status in ('open','acknowledged');

create table if not exists public.integration_connections (
  id uuid primary key default gen_random_uuid(),
  provider text not null unique,
  status text not null default 'blocked' check (status in ('blocked','connected','degraded','disabled')),
  secret_reference text,
  last_success_at timestamptz,
  last_error_at timestamptz,
  last_error text,
  updated_at timestamptz not null default now()
);

create table if not exists public.automation_rules (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  trigger_event text not null,
  conditions jsonb not null default '{}'::jsonb,
  actions jsonb not null default '[]'::jsonb,
  active boolean not null default false,
  requires_human_confirmation boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists automation_rules_name_unique on public.automation_rules(name);

create table if not exists public.automation_runs (
  id uuid primary key default gen_random_uuid(),
  rule_id uuid not null references public.automation_rules(id) on delete cascade,
  job_id uuid references public.print_jobs(id) on delete cascade,
  status text not null check (status in ('queued','running','waiting_human','completed','failed','cancelled')),
  idempotency_key text unique,
  result jsonb not null default '{}'::jsonb,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.webhook_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  external_event_id text not null,
  signature_verified boolean not null default false,
  payload_hash text not null,
  status text not null default 'received' check (status in ('received','processed','ignored','failed')),
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  unique(provider, external_event_id)
);

insert into public.catalog_products (id,name_en,name_es,configuration_schema) values
  ('business-cards','Business Cards','Tarjetas de presentación','{"quantity":true,"size":true,"sides":true}'::jsonb),
  ('flyers-postcards','Flyers & Postcards','Flyers y postales','{"quantity":true,"size":true,"sides":true}'::jsonb),
  ('brochures-menus','Brochures & Menus','Brochures y menús','{"quantity":true,"size":true,"folding":true}'::jsonb),
  ('banners','Banners','Banners','{"width":true,"height":true,"install":true}'::jsonb),
  ('window-graphics','Window Graphics','Gráficos de ventana','{"width":true,"height":true,"install":true}'::jsonb),
  ('signs-aframes','Signs & A-Frames','Letreros y A-Frames','{"quantity":true,"size":true,"install":true}'::jsonb),
  ('packaging','Packaging','Empaques','{"goal":true}'::jsonb),
  ('unsure','Not sure yet','Todavía no estoy seguro','{"goal":true}'::jsonb)
on conflict (id) do update set name_en=excluded.name_en,name_es=excluded.name_es,configuration_schema=excluded.configuration_schema,updated_at=now();

insert into public.automation_rules(name,trigger_event,actions,active,requires_human_confirmation) values
  ('Request intake routing','request_received','[{"type":"sync_crm"},{"type":"assign_follow_up"},{"type":"send_received_message"}]'::jsonb,false,false),
  ('Quote follow-up','quote_sent','[{"type":"schedule_quote_follow_up","delayMinutes":2880}]'::jsonb,false,false),
  ('Artwork preflight','artwork_stored','[{"type":"preflight_artwork"}]'::jsonb,false,true),
  ('Proof reminder','proof_sent','[{"type":"schedule_proof_reminder","delayMinutes":1440}]'::jsonb,false,false),
  ('Approved proof to payment','proof_approved','[{"type":"prepare_payment_request"}]'::jsonb,false,true),
  ('Verified payment to production','payment_verified','[{"type":"release_production"}]'::jsonb,false,true),
  ('Production to fulfillment','production_complete','[{"type":"coordinate_fulfillment"}]'::jsonb,false,true),
  ('Fulfillment follow-up','fulfillment_complete','[{"type":"schedule_customer_follow_up","delayMinutes":2880}]'::jsonb,false,false)
on conflict(name) do update set trigger_event=excluded.trigger_event,actions=excluded.actions,requires_human_confirmation=excluded.requires_human_confirmation,updated_at=now();

do $$
declare table_name text;
begin
  foreach table_name in array array[
    'organizations','contacts','locations','catalog_products','catalog_versions','catalog_options','print_jobs','job_assets',
    'quotes','quote_items','proofs','proof_comments','approvals','payments','production_runs','fulfillments','conversations',
    'conversation_messages','tasks','job_events','job_exceptions','integration_connections','automation_rules','automation_runs','webhook_events'
  ] loop
    execute format('alter table public.%I enable row level security', table_name);
    execute format('revoke all on table public.%I from anon, authenticated', table_name);
    execute format('grant all on table public.%I to service_role', table_name);
  end loop;
end $$;

create or replace function public.vral_intake_print_job(p_request jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_name text := trim(coalesce(p_request->>'name',''));
  v_business text := trim(coalesce(p_request->>'business',''));
  v_phone text := trim(coalesce(p_request->>'phone',''));
  v_email text := lower(trim(coalesce(p_request->>'email','')));
  v_address text := trim(coalesce(p_request->>'address',''));
  v_source text := trim(coalesce(p_request->>'source','website'));
  v_key text := nullif(trim(coalesce(p_request->>'idempotencyKey','')), '');
  v_token_hash text := trim(coalesce(p_request->>'trackingTokenHash',''));
  v_org uuid;
  v_contact uuid;
  v_location uuid;
  v_job public.print_jobs%rowtype;
  v_existing uuid;
  v_org_key text;
begin
  if v_name = '' or v_business = '' then raise exception 'name and business are required' using errcode='22023'; end if;
  if v_phone = '' and v_email = '' then raise exception 'phone or email is required' using errcode='22023'; end if;
  if v_source <> 'Field' and (v_phone = '' or v_email = '') then raise exception 'phone and email are required' using errcode='22023'; end if;
  if length(v_token_hash) <> 64 then raise exception 'tracking token hash is required' using errcode='22023'; end if;

  if v_key is not null then
    select id into v_existing from public.print_jobs where idempotency_key=v_key;
    if v_existing is not null then
      update public.print_jobs set tracking_token_hash=v_token_hash,updated_at=now() where id=v_existing returning * into v_job;
      return jsonb_build_object('id',v_job.id,'receivedAt',v_job.created_at,'updatedAt',v_job.updated_at,'status',v_job.stage,'owner',v_job.owner,'duplicate',true,'delivery','[]'::jsonb);
    end if;
  end if;

  v_org_key:=encode(digest(lower(regexp_replace(v_business,'\s+',' ','g'))||'|'||coalesce(nullif(v_email,''),regexp_replace(v_phone,'[^0-9]','','g')),'sha256'),'hex');
  insert into public.organizations(name,normalized_name,dedupe_key,locale)
  values(v_business,lower(regexp_replace(v_business,'\s+',' ','g')),v_org_key,coalesce(nullif(p_request->>'language',''),'en'))
  on conflict(dedupe_key) do update set name=excluded.name,updated_at=now()
  returning id into v_org;

  select id into v_contact from public.contacts
  where (v_email<>'' and lower(email)=v_email) or (v_phone<>'' and regexp_replace(phone,'[^0-9]','','g')=regexp_replace(v_phone,'[^0-9]','','g'))
  order by updated_at desc limit 1;
  if v_contact is null then
    insert into public.contacts(organization_id,full_name,email,phone,locale,consent_contact_at,consent_offers_at)
    values(v_org,v_name,nullif(v_email,''),nullif(v_phone,''),coalesce(nullif(p_request->>'language',''),'en'),case when coalesce((p_request->>'consentContact')::boolean,false) then now() end,case when coalesce((p_request->>'consentOffers')::boolean,false) then now() end)
    returning id into v_contact;
  else
    update public.contacts set organization_id=v_org,full_name=v_name,email=coalesce(nullif(v_email,''),email),phone=coalesce(nullif(v_phone,''),phone),updated_at=now() where id=v_contact;
  end if;

  if v_address<>'' then
    insert into public.locations(organization_id,address_line) values(v_org,v_address) returning id into v_location;
  end if;

  insert into public.print_jobs(
    organization_id,primary_contact_id,location_id,product_id,sku,source,owner,captured_by,language,goal,quantity,specifications,
    artwork_mode,artwork_status,fulfillment,needed_by,notes,tracking_token_hash,idempotency_key,campaign,referral,follow_up_due
  ) values(
    v_org,v_contact,v_location,nullif(p_request->>'product',''),nullif(p_request->>'sku',''),v_source,coalesce(nullif(p_request->>'owner',''),'Mike'),nullif(p_request->>'capturedBy',''),
    coalesce(nullif(p_request->>'language',''),'en'),nullif(p_request->>'goal',''),nullif(p_request->>'quantity',''),coalesce(p_request->'specifications','{}'::jsonb),
    nullif(p_request#>>'{artwork,mode}',''),case when p_request#>>'{artwork,status}'='stored' then 'stored' else 'needed' end,nullif(p_request->>'fulfillment',''),
    case when coalesce(p_request#>>'{timing,neededBy}','') ~ '^\d{4}-\d{2}-\d{2}$' then (p_request#>>'{timing,neededBy}')::date end,
    nullif(coalesce(p_request#>>'{specifications,notes}',p_request->>'notes'),'') ,v_token_hash,v_key,nullif(p_request->>'campaign',''),nullif(p_request->>'referral',''),now()+interval '2 days'
  ) returning * into v_job;

  insert into public.job_events(job_id,event_type,actor,payload) values(v_job.id,'request_received',coalesce(nullif(p_request->>'capturedBy',''),'customer'),jsonb_build_object('source',v_source));
  insert into public.tasks(job_id,type,title,owner,due_at) values(v_job.id,'contact_customer','Contact the customer',v_job.owner,v_job.follow_up_due);
  insert into public.conversations(job_id,channel,status) values(v_job.id,case when v_source='Field' then 'internal' else 'web' end,'waiting_team');

  return jsonb_build_object('id',v_job.id,'receivedAt',v_job.created_at,'updatedAt',v_job.updated_at,'status',v_job.stage,'owner',v_job.owner,'duplicate',false,'delivery','[]'::jsonb);
end;
$$;

create or replace function public.vral_operations_snapshot(p_role text, p_owner text)
returns jsonb
language sql
security definer
set search_path = public, pg_temp
as $$
  with visible as (
    select j.*,o.name business,c.full_name,c.email,c.phone,l.address_line
    from public.print_jobs j
    join public.organizations o on o.id=j.organization_id
    join public.contacts c on c.id=j.primary_contact_id
    left join public.locations l on l.id=j.location_id
    where p_role='admin' or j.owner=p_owner
    order by j.updated_at desc
  ), jobs as (
    select coalesce(jsonb_agg(jsonb_build_object(
      'id',id,'shortId',public_code,'receivedAt',created_at,'updatedAt',updated_at,'status',stage,'owner',owner,'capturedBy',captured_by,
      'name',full_name,'phone',phone,'email',email,'address',address_line,'business',business,'product',product_id,'sku',sku,'interest',coalesce(product_id,'Printing'),
      'source',source,'language',language,'campaign',campaign,'referral',referral,'followUpDue',follow_up_due,'paymentVerified',payment_verified,
      'quantity',quantity,'artwork',artwork_mode,'artworkStatus',artwork_status,'fulfillment',fulfillment,'notes',notes,'specifications',specifications,'delivery','[]'::jsonb,
      'audit',coalesce((select jsonb_agg(jsonb_build_object('type',e.event_type,'to',e.payload->>'to','actor',e.actor,'at',e.created_at) order by e.created_at) from public.job_events e where e.job_id=visible.id),'[]'::jsonb)
    ) order by updated_at desc),'[]'::jsonb) body from visible
  )
  select jsonb_build_object('generatedAt',now(),'jobs',jobs.body) from jobs;
$$;

create or replace function public.vral_update_job_stage(p_job_id uuid,p_stage text,p_actor text)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare v_job public.print_jobs%rowtype; v_from text;
begin
  if p_stage not in ('New','Contacted','Quoted','Awaiting Artwork','Awaiting Approval','Payment Pending','Paid','In Production','Ready','Completed','Lost') then raise exception 'invalid stage' using errcode='22023'; end if;
  select * into v_job from public.print_jobs where id=p_job_id for update;
  if not found then raise exception 'job not found' using errcode='P0002'; end if;
  if p_stage='Paid' and not v_job.payment_verified then raise exception 'Paid requires a verified payment webhook' using errcode='22023'; end if;
  v_from:=v_job.stage;
  update public.print_jobs set stage=p_stage,updated_at=now(),completed_at=case when p_stage='Completed' then now() else completed_at end where id=p_job_id returning * into v_job;
  insert into public.job_events(job_id,event_type,actor,payload) values(p_job_id,'stage_changed',coalesce(nullif(p_actor,''),'ops'),jsonb_build_object('from',v_from,'to',p_stage));
  return jsonb_build_object('id',v_job.id,'status',v_job.stage,'updatedAt',v_job.updated_at,'paymentVerified',v_job.payment_verified);
end;
$$;

create or replace function public.vral_mark_payment_verified(p_job_id uuid,p_event_id text)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare v_job public.print_jobs%rowtype; v_event_job uuid;
begin
  if nullif(trim(coalesce(p_event_id,'')),'') is null then
    raise exception 'payment event id required' using errcode='22023';
  end if;

  select job_id into v_event_job from public.payments where external_event_id=trim(p_event_id);
  if v_event_job is not null and v_event_job<>p_job_id then
    raise exception 'payment event already belongs to another job' using errcode='23505';
  end if;
  if v_event_job=p_job_id then
    select * into v_job from public.print_jobs where id=p_job_id;
    if not found then raise exception 'job not found' using errcode='P0002'; end if;
    return jsonb_build_object('id',v_job.id,'status',v_job.stage,'updatedAt',v_job.updated_at,'paymentVerified',v_job.payment_verified,'paymentEventId',trim(p_event_id));
  end if;

  insert into public.payments(job_id,provider,external_event_id,status,verified_at)
  values(p_job_id,'quickbooks',trim(p_event_id),'verified',now());
  update public.print_jobs set payment_verified=true,stage='Paid',updated_at=now() where id=p_job_id returning * into v_job;
  if not found then raise exception 'job not found' using errcode='P0002'; end if;
  insert into public.job_events(job_id,event_type,actor,payload) values(p_job_id,'payment_verified','payment-webhook',jsonb_build_object('eventId',trim(p_event_id)));
  return jsonb_build_object('id',v_job.id,'status',v_job.stage,'updatedAt',v_job.updated_at,'paymentVerified',true,'paymentEventId',trim(p_event_id));
end;
$$;

create or replace function public.vral_track_print_job(p_token_hash text)
returns jsonb
language sql
security definer
set search_path = public, pg_temp
as $$
  select jsonb_build_object(
    'id',j.id,'shortId',j.public_code,'status',j.stage,'product',j.product_id,'quantity',j.quantity,'artwork',j.artwork_mode,'artworkStatus',j.artwork_status,
    'fulfillment',j.fulfillment,'createdAt',j.created_at,'updatedAt',j.updated_at,
    'proof',(select jsonb_build_object('id',p.id,'version',p.version,'status',p.status,'available',true) from public.proofs p where p.job_id=j.id and p.status<>'superseded' order by p.version desc limit 1),
    'quote',(select jsonb_build_object('id',q.id,'version',q.version,'status',q.status,'currency',q.currency,'totalCents',q.total_cents,'expiresAt',q.expires_at) from public.quotes q where q.job_id=j.id and q.status<>'superseded' order by q.version desc limit 1),
    'events',coalesce((select jsonb_agg(jsonb_build_object('type',e.event_type,'at',e.created_at,'label',case e.event_type when 'request_received' then 'Request received' when 'artwork_stored' then 'Artwork received' when 'payment_verified' then 'Payment verified' when 'stage_changed' then coalesce(e.payload->>'to','Job updated') else 'Job updated' end) order by e.created_at) from public.job_events e where e.job_id=j.id),'[]'::jsonb)
  ) from public.print_jobs j where j.tracking_token_hash=p_token_hash;
$$;

create or replace function public.vral_latest_proof(p_job_id uuid)
returns jsonb
language sql
security definer
set search_path = public, pg_temp
as $$
  select jsonb_build_object('id',p.id,'version',p.version,'status',p.status,'storagePath',a.storage_path,'originalName',a.original_name,'mimeType',a.mime_type)
  from public.proofs p join public.job_assets a on a.id=p.asset_id
  where p.job_id=p_job_id and p.status<>'superseded' order by p.version desc limit 1;
$$;

create or replace function public.vral_record_approval(p_job_id uuid,p_decision text,p_note text,p_actor text)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare v_proof public.proofs%rowtype; v_approval uuid;
begin
  if p_decision not in ('approved','changes_requested') then raise exception 'invalid proof decision' using errcode='22023'; end if;
  select * into v_proof from public.proofs where job_id=p_job_id and status<>'superseded' order by version desc limit 1 for update;
  if not found then raise exception 'proof not found' using errcode='P0002'; end if;
  insert into public.approvals(job_id,proof_id,decision,actor_name,decision_note)
  values(p_job_id,v_proof.id,p_decision,coalesce(nullif(p_actor,''),'customer'),nullif(trim(coalesce(p_note,'')),'')) returning id into v_approval;
  update public.proofs set status=p_decision,decided_at=now() where id=v_proof.id;
  update public.print_jobs set stage=case when p_decision='approved' then 'Payment Pending' else 'Awaiting Approval' end,updated_at=now() where id=p_job_id;
  insert into public.job_events(job_id,event_type,actor,payload) values(p_job_id,'proof_'||p_decision,coalesce(nullif(p_actor,''),'customer'),jsonb_build_object('proofId',v_proof.id,'approvalId',v_approval));
  insert into public.tasks(job_id,type,title,owner,status,due_at)
  values(p_job_id,case when p_decision='approved' then 'verify_payment' else 'revise_proof' end,case when p_decision='approved' then 'Verify payment' else 'Revise the proof' end,case when p_decision='approved' then 'Operations' else 'Design' end,'open',now()+interval '1 day');
  return jsonb_build_object('id',v_approval,'decision',p_decision,'jobId',p_job_id,'proofId',v_proof.id,'recordedAt',now());
end;
$$;

create or replace function public.vral_record_artwork(p_job_id uuid,p_storage_path text,p_original_name text,p_mime_type text,p_size_bytes bigint,p_actor text)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare v_asset uuid;
begin
  insert into public.job_assets(job_id,kind,storage_path,original_name,mime_type,size_bytes,uploaded_by)
  values(p_job_id,'artwork',p_storage_path,p_original_name,p_mime_type,p_size_bytes,coalesce(nullif(p_actor,''),'customer')) returning id into v_asset;
  update public.print_jobs set artwork_status='stored',stage=case when stage='Awaiting Artwork' then 'Awaiting Approval' else stage end,updated_at=now() where id=p_job_id;
  insert into public.job_events(job_id,event_type,actor,payload) values(p_job_id,'artwork_stored',coalesce(nullif(p_actor,''),'customer'),jsonb_build_object('assetId',v_asset));
  return jsonb_build_object('id',v_asset,'stored',true);
end;
$$;

revoke all on function public.vral_intake_print_job(jsonb) from public,anon,authenticated;
revoke all on function public.vral_operations_snapshot(text,text) from public,anon,authenticated;
revoke all on function public.vral_update_job_stage(uuid,text,text) from public,anon,authenticated;
revoke all on function public.vral_mark_payment_verified(uuid,text) from public,anon,authenticated;
revoke all on function public.vral_track_print_job(text) from public,anon,authenticated;
revoke all on function public.vral_record_artwork(uuid,text,text,text,bigint,text) from public,anon,authenticated;
revoke all on function public.vral_latest_proof(uuid) from public,anon,authenticated;
revoke all on function public.vral_record_approval(uuid,text,text,text) from public,anon,authenticated;
grant execute on function public.vral_intake_print_job(jsonb) to service_role;
grant execute on function public.vral_operations_snapshot(text,text) to service_role;
grant execute on function public.vral_update_job_stage(uuid,text,text) to service_role;
grant execute on function public.vral_mark_payment_verified(uuid,text) to service_role;
grant execute on function public.vral_track_print_job(text) to service_role;
grant execute on function public.vral_record_artwork(uuid,text,text,text,bigint,text) to service_role;
grant execute on function public.vral_latest_proof(uuid) to service_role;
grant execute on function public.vral_record_approval(uuid,text,text,text) to service_role;

-- Storage stays private. The Node API uploads with service role only after a
-- tracking-token check. Create the bucket here when running in Supabase.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('vral-artwork','vral-artwork',false,26214400,array['application/pdf','image/jpeg','image/png','image/webp','application/postscript'])
on conflict(id) do update set public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;
