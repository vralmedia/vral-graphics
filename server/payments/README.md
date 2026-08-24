# Payment/order integration contract

This directory is the server-side payment boundary for Specials. It never trusts browser prices, never stores card data, never adds a guessed processing-fee percentage, and never returns a paid order before a verified provider event has atomically finalized it.

## Server-owned Specials

- Flyers: 1,000 `$99`, 2,500 `$139`, 5,000 `$159`.
- `flyer_1000_free_when_vral_designs` is `$0` printing only when `designByVral: true`; the customer still pays design.
- Design is `$75` front or `$85` front + back (`$75 + $10`).
- Tax is 7% of printing only. Design is outside the tax base.
- `processingFeeCents` is intentionally `null`; QuickBooks calculates any provider fee.

Use `offers.quoteSpecial(...)` for this catalogue. Use `checkout.createCheckout(...)` only with an injected QuickBooks Payments hosted-checkout adapter and an atomic `orderRepository.reservePending` implementation.

## Integration rules

- Checkout reserves `pending_payment` atomically by idempotency key, then asks the hosted adapter for an HTTPS session. A replay returns the persisted session instead of creating another one.
- Webhooks verify the raw request bytes with HMAC before JSON parsing, then atomically reserve the provider event ID before side effects. Intuit-style base64 and hex HMAC encodings are supported.
- Reconciliation validates provider verification, order identity, USD, and amount before calling `markPaid`. QuickBooks sales-receipt sync is allowed only with a paid order carrying `paymentVerified: true` and a provider event ID.
- CRM delivery is optional and reports `DELIVERED`, `FAILED`, or `BLOCKED`; a missing or failed CRM hook cannot make payment look successful.
