# Payment truth matrix — 2026-08-26 Agent D

Clone: `/Users/seujao/Documents/Codex/2026-08-25/aonde/work/vral-graphics-github`  
Remote: `git@github.com:vralmedia/vral-graphics.git`  
Branch: `main`  
HEAD at D start: `fe97917efcc1504d36575af63c6c861c02377cf3`  
Push: no. Publish: no.

| Item | Label | Why |
|---|---|---|
| Business-card SKU names, cents, $75/$10 design, 7% printing tax | REAL | `server/payments/offers.js` + `node --test tests/payments/*.test.js` (38/38) |
| Legacy `flyer_1000/2500/5000` aliases | REAL (compat) | Aliases resolve to `business_card_*`. They are not the 4×6 flyer. |
| Flyer 5,000 4×6 two sides $199 | REAL (price on server) / BLOCKED (checkout) | `flyer_5000_4x6_twosided`; `OFFER_QUOTE_ONLY` |
| Brochures/menus $299/$399/$495 | REAL (price on server) / BLOCKED (checkout) | Design fee and tax rules not closed |
| Banner $6/sq ft, window wrap $7/sq ft | REAL (rate) / BLOCKED (checkout) | Area/installation |
| A-frame $199 | REAL (price on server) / BLOCKED (checkout) | Tax/spec not closed |
| Sign Spinners | BLOCKED (excluded) | Rejected; not a print special |
| Hosted QuickBooks checkout | BLOCKED | `QUICKBOOKS_REALM_ID` and `QUICKBOOKS_ACCESS_TOKEN` unset in this environment |
| Order repository / pending persistence | BLOCKED | No atomic store in this workspace |
| Webhook HMAC + event dedupe | SANDBOX (code) / BLOCKED (prod) | Tests pass with injected secret; `PAYMENT_WEBHOOK_SECRET` unset |
| Paid status | BLOCKED until verified event | URL success/cancel cannot assert paid (`server/payments/returns.js`) |
| CRM after payment | BLOCKED | No hook |
| Card data in browser | not present | No card fields; no access token returned |

Command:

```sh
node --test tests/payments/*.test.js
```

Result on 2026-08-26: 38 pass, 0 fail.
