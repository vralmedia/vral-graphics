# Live Print Desk verification — 2026-08-27

## Scope

- Canonical source: `vralmedia/vral-graphics`, branch `main`.
- Homepage rebuilt as one interactive Live Print Desk.
- Six generated raster product assets: cards, flyers, menus, banners, windows, signs.
- Known-product request path reduced to two steps; unknown-product path to three.
- Artwork upload is offered only after the print request has been saved.
- Offers use the same raster product assets instead of code-drawn primary product art.
- Privacy, terms, accessibility, and payment terms moved to dedicated routes.

## Automated verification

- `git diff --check`: pass.
- `npm test`: 73/73 pass.
- `npm run build`: pass.
- Production bundle contains `dist/assets/products/*.webp` and all four legal pages.

## Browser verification

- Home: all six product images loaded; each selection updated title, image, offer, CTA, and `aria-pressed`.
- EN/ES: language, headline, product copy, and CTA changed without navigation.
- Request funnel: known product = 2 steps; no product = 3 steps; six real product images loaded.
- Offers: six real product images loaded; keyboard/click selection retained; old code-drawn primary pieces absent.
- Field/Admin: no horizontal overflow at desktop; both remain `noindex,nofollow` and fail closed when auth is unavailable.
- Legal: four dedicated routes load through the shared navigation/footer.
- Responsive: no horizontal overflow on the final home or quote surface at mobile and desktop browser widths.
- Contrast audit: zero detected visible leaf-text failures against WCAG AA thresholds on home and quote.
- Production-build preview: all six dynamic `/assets/products/*.webp` paths loaded successfully.

## Evidence

- Before: `checkpoint-proofs/2026-08-27-live-print-desk/baseline/`
- After: `checkpoint-proofs/2026-08-27-live-print-desk/after/`

## Honest external states

- A public request is never shown as saved until `/api/print-requests` accepts it.
- An artwork filename is never shown as uploaded until the upload endpoint stores it.
- Payment is never shown as paid without a verified provider event.
- CRM/payment configuration may remain `BLOCKED`; the UI exposes a truthful WhatsApp fallback instead of simulating success.
