# Vral Graphics form backend

`POST /api/leads` durably records the ordered lead schema — name, phone, email, address, business, interest (default `Printing`) — with owner `Mike`. Delivery is queued only after persistence. It never reports a CRM or flyer-email delivery as successful unless that endpoint returned success.

## Run

Use Node 18+. Copy the values from `.env.example` into your secret manager or process environment; this repository intentionally has no credentials. Then run `npm test` and `npm start` from this directory.

The caller must send `Authorization: Bearer <VG_FORM_API_KEY>` and an `Origin` that exactly matches `VG_FORM_ALLOWED_ORIGIN`. Do not embed that key in the public landing page. Place this API behind a server-side form relay, same-origin authenticated session, or another secret-preserving gateway before connecting the static frontend. Missing security configuration returns `BLOCKED` with HTTP 503; an unapproved origin is rejected with 403.

## Delivery state

Every accepted lead is appended to `LEAD_STORE_PATH` before CRM/flyer-email delivery is attempted. Delivery events are appended to the same private JSONL store; configured jobs retry up to `VG_DELIVERY_MAX_ATTEMPTS` and pending `QUEUED`/`RETRYING` jobs are recovered on restart. Idempotency keys and a 24-hour contact dedupe prevent repeat creation; a hidden `website` honeypot is accepted without persistence, and each client has a 5-per-10-minute in-memory limit. Client identity uses the socket address unless `VG_TRUST_PROXY=true`; enable that only behind a trusted proxy that overwrites `X-Forwarded-For`. The response reports `QUEUED` until a configured adapter completes; terminal states are `DELIVERED`, `FAILED`, or `BLOCKED`. `BLOCKED` means no real endpoint was configured; it is not a simulated send.

## Production checklist — BLOCKED pending credentials/deployment

- [ ] Set a random `VG_FORM_API_KEY` in the deployment secret store.
- [ ] Set exact `VG_FORM_ALLOWED_ORIGIN` and route the public form through a secret-preserving relay.
- [ ] Configure `LEAD_STORE_PATH` on persistent encrypted storage with backup/retention controls.
- [ ] Configure an operator-owned `VG_CRM_WEBHOOK_URL` (and optional token) that creates/updates CRM records.
- [ ] Configure an operator-owned `VG_FLYER_EMAIL_WEBHOOK_URL` (and optional token) that sends actual flyer/lead notifications.
- [ ] Submit one real test lead; verify the persisted row, CRM record, notification email, Mike assignment, and no secrets in browser/network logs.
