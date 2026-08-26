# Vral Graphics lead intake status

The backend accepts the ordered field set `name`, `phone`, `email`, `address`, `business`, and `interest` (`Printing` when omitted), then assigns owner `Mike`.

| Capability | Current state | REAL condition | Proof / behavior |
| --- | --- | --- | --- |
| Lead persistence | SANDBOX | Set `LEAD_STORE_PATH` to operator-managed persistent storage with backup and retention | JSONL append happens before any delivery work; default is private `backend/data/leads.jsonl` |
| API bearer auth | BLOCKED until configured | Set `VG_FORM_API_KEY` | Requests without an exact `Bearer <key>` receive `401`; missing configuration receives `503 BLOCKED` |
| Exact CORS | BLOCKED until configured | Set `VG_FORM_ALLOWED_ORIGIN` to the one exact origin | Other origins receive `403` and never reach intake |
| Honeypot | SANDBOX | Always active | A non-empty `website` value receives `202` but is never persisted |
| Idempotency / contact dedupe | SANDBOX | Always active | Same idempotency key is reused; same name + phone + email is deduped for 24 hours |
| Rate limit | SANDBOX | Always active per process/client key | Default is 5 accepted attempts per 10 minutes |
| CRM adapter | BLOCKED without URL | Set `VG_CRM_WEBHOOK_URL` (and optional token) to a real operator-owned relay | No URL can only produce `BLOCKED`, never `DELIVERED`; configured jobs are queued and retried |
| Flyer/email adapter | BLOCKED without URL | Set `VG_FLYER_EMAIL_WEBHOOK_URL` (and optional token) to a real operator-owned relay | No URL can only produce `BLOCKED`, never `DELIVERED`; configured jobs are queued and retried |
| Delivery queue | SANDBOX | Run with persistent storage and real relay credentials | Queue and delivery events are JSONL records; pending `QUEUED`/`RETRYING` jobs are recovered on restart |
| `POST /api/print-requests` | SANDBOX | Set `VG_PUBLIC_ORIGIN` or `VG_FORM_ALLOWED_ORIGIN`; Vite proxies `/api` same-origin | Browser sends JSON only. No `Authorization`. Honeypot, rate limit, idempotency, and 24-hour dedupe reuse the lead-service. |
| `/field` login | BLOCKED until configured | Set `VG_FIELD_SESSION_SECRET` and `VG_FIELD_USERS` | Missing config returns `503 BLOCKED`. Mike sees Mike-owned leads; Anthony/admin sees all. |
| `/admin` pipeline | SANDBOX | Same field session | Columns are New through Lost. `Paid` is 409 until `POST /api/internal/payment-verified` with Bearer after a real webhook. |

## Prove a persisted lead locally

From the repository root, use a private temporary path and a test key/origin:

```sh
tmp_store="$(mktemp -d)/leads.jsonl"
LEAD_STORE_PATH="$tmp_store" VG_FORM_API_KEY="local-test-key" VG_FORM_ALLOWED_ORIGIN="https://vralgraphics.com" node backend/server.js
```

In another shell:

```sh
curl -i http://127.0.0.1:8787/api/leads \
  -X POST \
  -H 'Origin: https://vralgraphics.com' \
  -H 'Authorization: Bearer local-test-key' \
  -H 'Content-Type: application/json' \
  --data '{"name":"Mia","phone":"+1 305 555 0111","email":"mia@example.com","address":"9 Ink Ave","business":"Mia Studio","interest":"Printing","idempotencyKey":"local-proof-000001"}'
```

The response is accepted only after the JSONL append succeeds. Inspect the exact private path:

```sh
tail -n 1 "$tmp_store"
```

The row must contain `name`, `phone`, `email`, `address`, `business`, `interest`, and `owner: "Mike"`. With no webhook URLs, its delivery entries must be `BLOCKED`; no email or CRM send is claimed.

## Test proof

Run from the repository root:

```sh
node --test backend/test/*.test.js
```

The backend tests cover JSONL persistence across service recreation, default interest, 24-hour dedupe, idempotency, honeypot suppression, rate limiting, retry behavior, exact CORS/Bearer gates, and `BLOCKED` adapters.
