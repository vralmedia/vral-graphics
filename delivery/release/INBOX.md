# Release inbox

## DELIVERY

RELEASE-PORTAL: read `/Users/seujao/aura-engine/vral-graphics/delivery/.env.local` locally for values. Do not copy secret values into this file, commit them, or expose them in browser code/logs.

Paste/configure these server-side names only:

- `VG_FORM_API_KEY`
- `VG_FORM_ALLOWED_ORIGIN`
- `VG_DELIVERY_MODE`
- `VG_FLYER_PATH`
- `VG_OUTBOX_DIR`
- `VG_EMAIL_PROVIDER`
- `VG_EMAIL_FROM`
- `VG_EMAIL_TEST_TO`
- `VG_RESEND_API_KEY`
- `VG_POSTMARK_SERVER_TOKEN`
- `VG_SENDGRID_API_KEY`

Current safe release posture is `VG_DELIVERY_MODE=sandbox`: it writes `delivery/outbox/*.eml`, attaches the original flyer, and never emails a prospect or customer. Do not switch to provider mode until an authenticated provider, sender, and an approved test-only recipient are independently verified. CRM remains `BLOCKED` until a CLOUD CRM store or operator-owned relay is configured.
