# Company Product OS

## The single object

Everything revolves around a **Print Job**. The website creates it, Field can create it, Operations manages it, the customer follows it, and automations react to its event history. Customer, artwork, quote, approval, payment, production, and fulfillment are attached to that same job instead of living in disconnected forms.

## Golden journey

1. A customer or field rep chooses the product and shares only the essentials.
2. The server persists the job before the interface says it was saved.
3. Operations sees the next useful action, not a wall of raw fields.
4. Vral confirms scope and issues a versioned quote.
5. Artwork enters private storage and every version stays attached to the job.
6. A proof is sent; approval or requested changes become auditable events.
7. Payment is accepted only from a verified provider event.
8. Production and finishing advance with clear ownership.
9. Pickup, delivery, or installation closes the job with proof of fulfillment.
10. Follow-up becomes a task; the next order starts from the customer record instead of zero.

## Automation boundary

Automate copying, routing, reminders, retries, event logging, document generation, and status synchronization. Keep pricing exceptions, design judgment, proof approval, production release, refunds, and relationship-sensitive communication behind a human confirmation gate.

## System boundaries

- The browser receives no admin database credential.
- Customer tracking uses a high-entropy capability token; only its hash is stored.
- Artwork is private and bound to the job after token verification.
- Webhooks are signature-verified and deduplicated before side effects.
- External integrations can be `connected`, `degraded`, or `blocked`; they never pretend to have delivered work.
- Every important state change creates a job event so the team can reconstruct what happened.

## What remains external

Production activation requires credentials and owner decisions for Supabase, CRM, email, QuickBooks, hosting/runtime, backup/retention, and the real production-vendor workflow. The repository provides the contracts and fails closed until those are supplied.
