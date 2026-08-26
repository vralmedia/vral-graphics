# Payments status — 2026-08-26

Overall: **BLOCKED** for live money. Catalogue math and refusal rules are **REAL** in this clone's tests. QuickBooks is not live.

| Surface | Status | Evidence / gate |
|---|---|---|
| Server-owned business-card catalogue and cents math | REAL | `offers.quoteSpecial` / `SPECIALS_CATALOGUE` use `business_card_*` names, $99/$139/$159, free-1,000 when Vral designs, $75/$10 design, 7% printing-only tax. Proven by `tests/payments/*.test.js`. |
| Legacy `flyer_*` Specials SKUs | REAL (alias) | Those keys were misnamed business cards. They alias to `business_card_*`. The real flyer offer is `flyer_5000_4x6_twosided` at $199 and is quote-only. |
| Brochures/menus, 4×6 flyers, A-frame published print prices | REAL (display) / quote-only (checkout) | Prices are in `offers.CATALOGUE`. Checkout throws `OFFER_QUOTE_ONLY` because design fee and/or tax rules are not closed for those families. |
| Banners $6/sq ft and window wraps $7/sq ft | REAL (rate) / quote-only (checkout) | `estimateArea` can compute printing cents. Hosted checkout is refused (`area_or_installation`). |
| Sign Spinners | BLOCKED (excluded) | Rejected by SKU guard. Not a Vral Graphics print special. |
| Hosted checkout | BLOCKED | Returns 503 until a real `quickbooks_payments` hosted-checkout adapter is injected with realm and access token. No Shopify path exists. |
| Pending order/idempotency persistence | BLOCKED | Requires an atomic `orderRepository.reservePending`; this workspace has no order database. |
| Webhook verification/dedupe | BLOCKED | Code is ready; production requires `PAYMENT_WEBHOOK_SECRET` and an atomic `reserveEvent` repository. |
| QuickBooks Payments | SANDBOX / BLOCKED | Environment defaults to `sandbox`; blocked here because `QUICKBOOKS_REALM_ID` and `QUICKBOOKS_ACCESS_TOKEN` are unset. No OAuth was invented. |
| Paid-order reconciliation | BLOCKED | Requires a real order repository `findById` + atomic `markPaid`, plus verified provider events. |
| Success/cancel URL | SANDBOX (honest) | `returns.describePaymentReturn` never asserts paid from the URL alone. |
| QuickBooks paid-order sync | BLOCKED | `createSalesReceipt` refuses anything except a verified paid order; no credentials/transport are configured. |
| Optional CRM hook | BLOCKED | No CRM hook was supplied; this never changes the payment status. |

OAuth is needed before QuickBooks can leave this state. Exact next click: **Intuit Developer Dashboard → My Hub → Apps → Vral Graphics → Keys & credentials → Connect to QuickBooks** (Sandbox), then store the resulting realm ID and access token server-side.

No card data, access token, payment success, or processing-fee percentage was invented or stored in this repository.
