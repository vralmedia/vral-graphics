# Payment/order integration contract

This directory is the server-side payment boundary. It never trusts browser prices, never stores card data, never adds a guessed processing-fee percentage, and never returns a paid order before a verified provider event has atomically finalized it.

## Server-owned catalogue

Business cards are the only checkout-complete family:

- 1,000 `$99`, 2,500 `$139`, 5,000 `$159`.
- `business_card_1000_free_when_vral_designs` is `$0` printing only when `designByVral: true`; the customer still pays design.
- Design is `$75` front or `$85` front + back (`$75 + $10`).
- Tax is 7% of printing only. Design is outside the tax base.
- `processingFeeCents` is intentionally `null`; QuickBooks calculates any provider fee.

Canonical SKUs: `business_card_1000`, `business_card_2500`, `business_card_5000`, `business_card_1000_free_when_vral_designs`. Legacy Specials keys `flyer_1000` / `flyer_2500` / `flyer_5000` were misnamed business cards and still alias to those SKUs. They are not the 4×6 flyer offer.

Quote-only catalogue (show the published print number, then `Request this offer`):

- Brochures or menus 8.5 × 11, folding included: 1,000 `$299`, 2,500 `$399`, 5,000 `$495`.
- Flyers: 5,000 full-color 4 × 6, two sides — `$199` (`flyer_5000_4x6_twosided`).
- Banners: `$6` per square foot.
- Window wraps: `$7` per square foot.
- A-frame: `$199`.
- Packaging: no closed price.

`when we design it for you` on the source flyers does **not** copy the business-card design fee onto other products. Area and installation items never open hosted checkout. Sign Spinners is not in this catalogue.

Use `offers.quoteSpecial(...)` for business-card Specials. Use `offers.quoteOffer(...)` for any SKU. Use `checkout.createCheckout(...)` only with an injected QuickBooks Payments hosted-checkout adapter, an atomic `orderRepository.reservePending` implementation, and a checkout-eligible quote.

## Integration rules

- Checkout reserves `pending_payment` atomically by idempotency key, then asks the hosted adapter for an HTTPS session. A replay returns the persisted session instead of creating another one.
- Quote-only SKUs return `409 OFFER_QUOTE_ONLY` with `action: request_quote`. They never reserve an order.
- Webhooks verify the raw request bytes with HMAC before JSON parsing, then atomically reserve the provider event ID before side effects. Intuit-style base64 and hex HMAC encodings are supported.
- Reconciliation validates provider verification, order identity, USD, and amount before calling `markPaid`. QuickBooks sales-receipt sync is allowed only with a paid order carrying `paymentVerified: true` and a provider event ID.
- `returns.describePaymentReturn` answers success/cancel URLs. Paid is true only after the repository reports a verified paid order.
- CRM delivery is optional and reports `DELIVERED`, `FAILED`, or `BLOCKED`; a missing or failed CRM hook cannot make payment look successful.
