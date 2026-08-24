# Release inbox

## CLOUD

1. Open the target Lovable project and click **Cloud → Database → SQL Editor → New query**.
2. Paste and run [`../supabase/migrations/20260824182000_mike_field_leads.sql`](../supabase/migrations/20260824182000_mike_field_leads.sql).
3. Click **Cloud → Database → Tables → field_leads** and verify the columns, status check, unique `idempotency_key`, and enabled RLS.
4. Click **Cloud → Secrets** (or **Project settings → Secrets**) and add `SUPABASE_URL` plus `SUPABASE_SERVICE_ROLE_KEY` to the backend runtime only. Never put the service-role key in frontend code.
5. Redeploy from **Release / Publish**, submit one test field lead, and verify the actual row in **field_leads**. Until that row is visible in Postgres, do not call CRM persistence REAL.

See [`../cloud/README.md`](../cloud/README.md) for the Supabase dashboard clicks, connection placeholders, and release verification details.
