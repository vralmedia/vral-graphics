# Vral Graphics product design contract

## Product promise

One print job, one thread, one clear next action. The experience should feel as easy as a guided consumer product while keeping human confirmation where judgment matters.

## Public experience

- One primary entry: **What do you need?**
- Lead with products, not company exposition.
- Use real product imagery for cards, flyers, menus, banners, windows, and signs.
- Keep each screen to one decision whenever possible.
- Show direct, verified wording; never invent price, turnaround, testimonial, guarantee, or production state.
- Keep the expressive Vral press identity: blue, ink black, registration cyan/pink/periwinkle, physical print layers, and Reggie as a responsive guide.
- Never expose backend, auth, relay, CRM, or infrastructure status on a public marketing page.

## Product surfaces

- Customer-facing: bright, tactile, short, bilingual, mobile-first.
- Field: one-minute capture, large controls, resilient draft, no fake “saved” state.
- Operations: calm and familiar. Normal work becomes a next action; exceptions get visual priority. No display type, decorative mascot, or marketing spectacle in the CRM.
- Customer workspace: job status, next action, proof/artwork actions, and fulfillment only. Internal notes stay private.

## Interaction rules

- Every action has default, hover, active, focus, disabled, loading, success, and error behavior.
- `Paid` is available only after a verified server event.
- Upload success appears only after private storage confirms it.
- A job appears in the workspace only after persistence returns a real ID.
- Reduced-motion users get the same information without continuous motion.
- Keyboard focus is visible; controls are at least 44px; text/background contrast meets WCAG AA.

## Responsive rules

- Mobile is centered and thumb-friendly without hiding essential choices.
- Display headlines are capped; they never consume a full phone screen without an action or useful product context.
- Product images keep their meaning at small sizes and use useful alternative text where the image carries content.
- Operations tables collapse into readable job rows instead of creating horizontal page scroll.

## Copy rules

- Prefer a short verb: Choose, Approve, Get it, Upload, Review, Pay, Ready.
- Explain uncertainty honestly: “We’ll confirm” is preferable to a false promise.
- Do not repeat the same CTA under different labels.
- English and Spanish must represent the same product state and action, not merely literal word swaps.
