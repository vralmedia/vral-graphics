# Vral Graphics Company Product OS backend

The backend is the operational spine for the full journey: request → human review → quote → artwork → proof → verified payment → production → fulfillment → follow-up. The public site, customer workspace, Field capture, and Operations cockpit all use the same print-job identity and event history.

The production schema and server-only RPC boundary live in `../supabase/migrations/20260827130000_company_product_os.sql`. It includes organizations, contacts, locations, catalog versions, print jobs, assets, quotes, proofs, approvals, verified payments, production, fulfillment, conversations, tasks, events, exceptions, integrations, automations, and webhook idempotency.

`POST /api/leads` durably records the ordered lead schema — name, phone, email, address, business, interest (default `Printing`) — with owner `Mike`. Delivery is queued only after persistence. It never reports a CRM or flyer-email delivery as successful unless that endpoint returned success.

## Run

Use Node 18+. Copy the values from `.env.example` into your secret manager or process environment; this repository intentionally has no credentials. Then run `npm test` and `npm start` from this directory.

`POST /api/leads` is server-to-server only. The caller must send `Authorization: Bearer <VG_FORM_API_KEY>` and an `Origin` that exactly matches `VG_FORM_ALLOWED_ORIGIN`. Do not embed that key in any page. Missing security configuration returns `BLOCKED` with HTTP 503; an unapproved origin is rejected with 403.

`POST /api/print-requests` is the browser relay: same-origin JSON, no browser secret. With `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`, it creates the real Company OS job and returns a one-time tracking capability whose hash—not the token—is stored. Without cloud credentials, local work stays in the explicitly labeled JSONL sandbox and cannot claim production tracking or artwork storage.

`GET /api/jobs/track` requires the tracking capability in `X-Vral-Job-Token`. `POST /api/print-requests/:id/artwork` requires that same capability, accepts only approved artwork formats up to 25 MB, verifies the job before upload, and writes to the private `VG_ARTWORK_BUCKET`.

`GET /api/admin/operations` returns the shared operations snapshot. Normal work is expressed as a next action; work that left the normal path appears as an exception. The UI never infers `Paid`: only the verified payment route can cross that gate.

`/field` and `/admin` require a configured session (`VG_FIELD_SESSION_SECRET` + `VG_FIELD_USERS`). Production without those credentials stays BLOCKED and is never simulated. `Paid` on the admin board cannot be set by the UI before `POST /api/internal/payment-verified` (Bearer, posse D webhook).

## Delivery state

Every accepted lead is appended to `LEAD_STORE_PATH` before CRM/flyer-email delivery is attempted. Delivery events are appended to the same private JSONL store; configured jobs retry up to `VG_DELIVERY_MAX_ATTEMPTS` and pending `QUEUED`/`RETRYING` jobs are recovered on restart. Idempotency keys and a 24-hour contact dedupe prevent repeat creation; a hidden `website` honeypot is accepted without persistence, and each client has a 5-per-10-minute in-memory limit. Client identity uses the socket address unless `VG_TRUST_PROXY=true`; enable that only behind a trusted proxy that overwrites `X-Forwarded-For`. The response reports `QUEUED` until a configured adapter completes; terminal states are `DELIVERED`, `FAILED`, or `BLOCKED`. `BLOCKED` means no real endpoint was configured; it is not a simulated send.

## Production checklist — BLOCKED pending credentials/deployment

- [ ] Set a random `VG_FORM_API_KEY` in the deployment secret store.
- [ ] Apply every Supabase migration, including the Company Product OS migration.
- [ ] Set server-only `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`; confirm the key never appears in Vite output or browser traffic.
- [ ] Confirm the private `VG_ARTWORK_BUCKET`, 25 MB limit, accepted MIME types, backup, retention, and deletion policy.
- [ ] Set exact `VG_FORM_ALLOWED_ORIGIN` and route the public form through a secret-preserving relay.
- [ ] Configure `LEAD_STORE_PATH` on persistent encrypted storage with backup/retention controls.
- [ ] Configure an operator-owned `VG_CRM_WEBHOOK_URL` (and optional token) that creates/updates CRM records.
- [ ] Configure an operator-owned `VG_FLYER_EMAIL_WEBHOOK_URL` (and optional token) that sends actual flyer/lead notifications.
- [ ] Submit one real test lead; verify the persisted row, CRM record, notification email, Mike assignment, and no secrets in browser/network logs.
- [ ] Run a complete golden job: website request → Operations → quote → artwork → proof → approval → verified payment webhook → production → fulfillment → customer tracking.
