# Vral Graphics Company Product OS — release status

## What is implemented

| Capability | Code state | Production state |
| --- | --- | --- |
| Guided public intake | Implemented and tested | Requires deployed same-origin API |
| Durable Company OS schema | Migration ready | BLOCKED until migration and credentials are applied |
| Secure customer tracking | Hashed capability-token contract implemented | BLOCKED until Company OS database is configured |
| Private artwork storage | Authenticated 25 MB upload contract implemented | BLOCKED until private bucket and credentials are configured |
| Field Quick Capture | Implemented, session-gated, offline draft encrypted | BLOCKED until real users/session secret are configured |
| Operations cockpit | Implemented with Today, Exceptions, Jobs, Customers, Pipeline | BLOCKED until real auth and Company OS database are configured |
| CRM delivery | Fail-closed adapter exists | BLOCKED until operator-owned endpoint and token exist |
| Email delivery | Fail-closed adapter exists | BLOCKED until operator-owned provider/relay exists |
| QuickBooks payment | Server-verification gate exists | BLOCKED until OAuth, realm, webhook, and atomic order storage exist |
| Production / fulfillment records | Schema and workflow contract implemented | BLOCKED until operators and vendor workflow are connected |

The JSONL store remains an explicit local/sandbox compatibility path. It is not a production substitute for the Company OS.

## Release gates

1. Apply migrations and verify row-level access is service-role only.
2. Configure exact public origin, session secret, users, Supabase server credentials, private storage, CRM, email, and payment credentials.
3. Verify no service-role or API secret appears in the browser, source maps, logs, or static bundle.
4. Run the complete golden journey with one real controlled job.
5. Reconcile the payment with QuickBooks before the job can become `Paid`.
6. Verify customer tracking exposes job state only, never internal notes or other customer data.
7. Verify backup, retention, deletion, audit, and incident recovery with the owner.

Until all seven pass, the production backend must remain marked **BLOCKED** and must not simulate a successful integration.
