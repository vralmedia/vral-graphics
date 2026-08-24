# Payments status — 2026-08-24

Overall: **BLOCKED**

| Surface | Status | Evidence / gate |
|---|---|---|
| Server-owned Specials catalogue and cents math | REAL | `offers.quoteSpecial` contains the four flyer options, $75/$10 design policy, and 7% printing-only tax. |
| Hosted checkout | BLOCKED | Returns 503 until a real `quickbooks_payments` hosted-checkout adapter is injected. No Shopify path exists. |
| Pending order/idempotency persistence | BLOCKED | Requires an atomic `orderRepository.reservePending`; this workspace has no order database. |
| Webhook verification/dedupe | BLOCKED | Code is ready; production requires `PAYMENT_WEBHOOK_SECRET` and an atomic `reserveEvent` repository. |
| QuickBooks Payments | SANDBOX / BLOCKED | Environment defaults to `sandbox`; blocked here because `QUICKBOOKS_REALM_ID` and `QUICKBOOKS_ACCESS_TOKEN` are unset. |
| Paid-order reconciliation | BLOCKED | Requires a real order repository `findById` + atomic `markPaid`, plus verified provider events. |
| QuickBooks paid-order sync | BLOCKED | `createSalesReceipt` refuses anything except a verified paid order; no credentials/transport are configured. |
| Optional CRM hook | BLOCKED | No CRM hook was supplied; this never changes the payment status. |

OAuth is needed before QuickBooks can leave this state. Exact next click: **Intuit Developer Dashboard → My Hub → Apps → Vral Graphics → Keys & credentials → Connect to QuickBooks** (Sandbox), then store the resulting realm ID and access token server-side.

No card data, access token, payment success, or processing-fee percentage was invented or stored in this repository.
