# Vral Graphics — Lovable Cloud

Production persistence is **Lovable Cloud** (the built-in backend in the Lovable project). Do not connect a separate Supabase account for this product.

The table is `public.field_leads`. SQL lives in `supabase/migrations/20260824182000_mike_field_leads.sql` only as the schema file to paste into **Cloud → Database → SQL Editor**.

`backend/lib/store.js` uses Lovable Cloud when `LOVABLE_CLOUD_URL` and `LOVABLE_CLOUD_SERVICE_ROLE_KEY` are set (or `DATABASE_URL`). With neither, it uses private JSONL and labels that `SANDBOX`. That fallback is not CRM.

## Apply in Lovable Cloud

1. Open project `0c4c6418-ebcd-4d69-a801-e39aaaccb18a`.
2. Enable Cloud (chat in the **main** version, not a visual-edit pass): “Enable Lovable Cloud”.
3. Cloud → Database → SQL Editor → New query → paste the migration → Run.
4. Cloud → Tables → `field_leads` and confirm columns + unique `idempotency_key`.
5. Cloud → Secrets: `LOVABLE_CLOUD_URL` and `LOVABLE_CLOUD_SERVICE_ROLE_KEY` on the server only.
6. One test lead, then confirm the row in Cloud tables. Until that row exists, CRM is not REAL.
