# Cloud proof

## Current status: NOT VERIFIED / no live project access

No table or project was created or modified during this run. This is
intentional: the repo has no `supabase/config.toml`, `~/.supabase` contains no
access-token file, and the authenticated CLI check returned:

```text
LegacyPlatformAuthRequiredError: Access token not provided.
Supply an access token by running `supabase login` or setting the
SUPABASE_ACCESS_TOKEN environment variable.
```

The cached CLI was present, but there was no authenticated account available
to list or create a project. The browser inspection could not attach in the
available sandbox and was interrupted before any Cloud action. Therefore this
file contains no fabricated project ID, table screenshot, service-role key, or
claimed CRM row.

## Prepared proof artifact

- Migration: [`../supabase/migrations/20260824182000_mike_field_leads.sql`](../supabase/migrations/20260824182000_mike_field_leads.sql)
- Expected table: `public.field_leads`
- Expected RLS: enabled; only `service_role` has explicit insert/select policy;
  `anon` and `authenticated` are revoked.
- Expected production proof after RELEASE-PORTAL apply: a successful SQL
  Editor run plus a real inserted row visible in Table Editor with its `id`,
  `created_at`, `owner = Mike`, and supplied `idempotency_key`.

Until that row is visible in Postgres, this project must not be described as
CRM REAL.
