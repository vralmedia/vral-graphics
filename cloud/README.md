# Vral Graphics Cloud store

The production source of truth is the Supabase/Postgres `public.field_leads`
table defined in
[`supabase/migrations/20260824182000_mike_field_leads.sql`](../supabase/migrations/20260824182000_mike_field_leads.sql).

This checkout has no linked Supabase project and no Supabase CLI access token.
The cached CLI reported `Access token not provided`; no project was created or
modified from this machine. Do not point this migration at an unrelated
project. The live-project proof is recorded in [`PROOF.md`](./PROOF.md).

## Connection placeholders

Set these only in the backend/deployment secret store or in the ignored
`cloud/.env.local` file while applying the release. Never commit a real
service-role key.

```dotenv
# Use one production connection path. The REST path requires the service role key.
SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<service-role-key-from-project-settings-api>

# Alternative direct Postgres path. Keep the password in the secret store.
DATABASE_URL=postgresql://postgres:<database-password>@<db-host>:5432/postgres
```

`backend/lib/store.js` uses Postgres when `DATABASE_URL` is present. Otherwise
it uses the Supabase REST endpoint when `SUPABASE_URL` and
`SUPABASE_SERVICE_ROLE_KEY` are present. With neither configured it uses the
existing private JSONL path as an explicitly labeled `SANDBOX` fallback; that
fallback is not production CRM persistence.

## Apply through Supabase

1. Open the target Supabase project at `supabase.com/dashboard`.
2. In the left sidebar click **SQL Editor**, then **New query**.
3. Paste the complete contents of the migration linked above.
4. Click **Run** and confirm the result is successful.
5. Click **Table Editor** in the left sidebar and open **field_leads**.
6. Confirm the columns, the `status` check constraint, and the unique
   `idempotency_key` constraint.
7. Click **Project Settings → API** and copy the **service_role** key only into
   the deployment secret named `SUPABASE_SERVICE_ROLE_KEY`. Do not paste it in
   frontend code, Git, screenshots, or chat.
8. For a direct connection instead, use **Project Settings → Database →
   Connection string**, choose the transaction/session pooler appropriate to
   the host, and save it as `DATABASE_URL`.
9. Submit one approved test lead through the backend, then in **Table Editor →
   field_leads** verify the inserted row. Only that verified row is proof of
   real Postgres persistence.

## Apply through Lovable Cloud / RELEASE-PORTAL

1. Open the correct Lovable project and click **Cloud** in the project
   navigation.
2. Open **Database** (or **Supabase**, if the project presents the linked
   database label), then open **SQL Editor**.
3. Click **New query**, paste the migration, and click **Run**.
4. Open **Tables / Table Editor**, select **field_leads**, and verify the exact
   columns and constraints from the migration.
5. Open **Cloud → Secrets** (or **Project settings → Secrets**), add
   `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` for the backend runtime, and
   save. Keep the service-role value server-side only.
6. If Lovable exposes only a database URL, add `DATABASE_URL` instead and do
   not add an anon/publishable key to the backend store.
7. Redeploy the backend from **Release / Publish**, submit one test lead, and
   verify the row in **Cloud → Database → Tables → field_leads** before calling
   the CRM real.

The UI labels can vary between Lovable Cloud and a directly linked Supabase
project; the required sequence is always SQL Editor → migration → Table Editor
verification → server secret → test row verification.
