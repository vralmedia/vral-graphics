# Payment/order integration status

The current repository has no deployed backend, payment provider account, product-price catalogue, order database, or QuickBooks credentials. Therefore this directory supplies only safe server-side adapters and validation; it does not make a real checkout or accounting claim.

All amounts are integer USD cents. Tax is rounded once on the product subtotal only; shipping and the server-policy `designFeeCents` are outside the tax base.

## BLOCKED before production

- [ ] Configure a server-owned, versioned catalogue and tax/shipping policy (never accept browser prices).
- [ ] Implement a real payment gateway adapter, secret storage, and an atomic `orderRepository.reservePending` idempotency store.
- [ ] Set `PAYMENT_WEBHOOK_SECRET`; verify raw request bytes before parsing; deduplicate provider event IDs transactionally.
- [ ] Set `QUICKBOOKS_REALM_ID` and short-lived `QUICKBOOKS_ACCESS_TOKEN`; add an Intuit transport and only sync an order after verified payment.
- [ ] Add authorization, audit logs, PII retention/deletion policy, rate limits, monitoring, and live-provider sandbox/live verification.
