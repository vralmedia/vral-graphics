# Vral Graphics

Print division of Vral Media.

Local: `python3 -m http.server 4522`
Live source of this landing: blue press identity, official print-swatch mark (`assets/vral-printmark.png`), session brief.

## Copy and journey decisions

- **Approved identity:** Vral Graphics is the print division of Vral Media. Use the official blue-and-black print-swatch mark with eyedropper and the Vral Graphics wordmark only.
- **Canonical source — 2026-08-24:** “Quality Printing for Less.” is the slogan. The primary CTA is “Start a print job,” and the commercial CTA is “View current specials.”
- **Contact:** use the guided print-desk flow and its WhatsApp handoff; do not display a direct phone number on the page.
- **ASR / flyer conflict:** ASR reports **9,000**; the official flyer reports **2,500**. Per the source-priority rule, the flyer wins: **2,500 for $139**.

## Acceptance criteria

1. All start CTAs scroll to `#print-desk`; product cards also preselect their product.
2. The desk requires product, purpose, artwork status, a name, and either phone or email before review.
3. The completed brief identifies the product, purpose, artwork status, contact, and timing, and opens WhatsApp at the official number.
4. The active slogan and primary commercial CTA match the canonical source; the direct phone number stays hidden from the page.
5. `i18n.js` is not loaded by `index.html`; it is an inactive legacy surface and must not be treated as live-site copy without an explicit integration decision.
