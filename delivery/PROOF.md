# Vral Graphics delivery proof

Date: 2026-08-24

## Secret handling

- `VG_FORM_API_KEY` was generated as 32 random bytes encoded as 64 lowercase hexadecimal characters.
- The value exists only in `delivery/.env.local`, which is ignored by `delivery/.gitignore`.
- This file intentionally records the key length only: **64 characters**.
- No secret value is present in this proof or in `backend/.env.example`.

## Configuration

- Allowed CORS origin: `https://vral-vision-spark.lovable.app`
- Delivery mode: `sandbox`
- Test recipient: `mike+test@example.test`
- Flyer source: `/Users/seujao/Downloads/PHOTO-2026-08-22-17-28-58.jpg`
- Flyer SHA-256: `d6122485aca2ca845fccc58457f279b98651fe4aaf147f329ef36bd5247afd3d`
- The flyer was read in place and was not moved or copied out of Downloads.

## Provider and safety checks

- No Resend, Postmark, SendGrid, Gmail, or SMTP credentials were present in the process environment or checked local env files.
- No authenticated provider CLI was installed; only `curl` was available.
- The Resend-related Downloads note contained DNS records only, not an authenticated API credential.
- No provider API call was made. No prospect or customer was emailed.
- Provider mode requires an explicitly configured provider, sender, and safe test recipient. The submitted lead email is never used as the destination.

## Delivery results

- CRM: `BLOCKED` honestly because no CLOUD CRM store or operator-owned CRM relay is configured.
- Flyer email: `DELIVERED` to the local SANDBOX interceptor.
- Sandbox output: `delivery/outbox/*.eml`, with `X-VG-Delivery-Mode: SANDBOX` and the original JPEG attached as `PHOTO-2026-08-22-17-28-58.jpg`.
- The EML `To` header was the safe test recipient, not the submitted prospect address.
- The sandbox proof used a request stub and observed **0** provider/network calls.
- The existing queue/retry suite passed, including retry attempts and terminal delivery event persistence.

## Verification

- `npm test` passed: **12 tests, 12 passed**. The HTTP tests required local loopback permission in the execution sandbox.
- End-to-end sandbox proof passed: CRM `BLOCKED`, flyer email `DELIVERED`, original attachment present, network/provider calls `0`, prospect address used as `To`: `no`.

## Release handoff

The release handoff is kept under the exclusive `delivery/**` write scope at `delivery/release/INBOX.md`. The repository-root `release/INBOX.md` was not touched because it was outside the explicit exclusive-write allowlist.
