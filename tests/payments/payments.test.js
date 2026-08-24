"use strict";

var test = require("node:test");
var assert = require("node:assert/strict");
var crypto = require("node:crypto");
var offerModule = require("../../server/payments/offers");
var quote = offerModule.quote;
var quoteSpecial = offerModule.quoteSpecial;
var checkout = require("../../server/payments/checkout");
var quickbooks = require("../../server/payments/quickbooks");
var webhooks = require("../../server/payments/webhooks");
var reconciliation = require("../../server/payments/reconciliation");

var catalogue = { cards: { active: true, name: "Cards", unitCents: 250 } };

test("quote trusts only the server catalogue and calculates integer cents", function () {
  var result = quote([{ sku: "cards", quantity: 3, unitCents: 1 }], catalogue, { taxRateBps: 750, shippingCents: 125 });
  assert.equal(result.subtotalCents, 750);
  assert.equal(result.taxCents, 56);
  assert.equal(result.totalCents, 931);
});

test("taxes the 99-dollar base but not 75-dollar shipping", function () {
  var pricedCatalogue = { base: { active: true, name: "Base", unitCents: 9900 } };
  var result = quote([{ sku: "base", quantity: 1 }], pricedCatalogue, { taxRateBps: 700, shippingCents: 7500 });
  assert.equal(result.taxableCents, 9900);
  assert.equal(result.taxCents, 693); // $6.93
  assert.equal(result.totalCents, 18093); // $180.93
});

test("calculates the exact requested 7-percent offer taxes in cents", function () {
  var pricedCatalogue = {
    offer139: { active: true, name: "Offer 139", unitCents: 13900 },
    offer159: { active: true, name: "Offer 159", unitCents: 15900 },
    promo: { active: true, name: "Promo", unitCents: 0 }
  };
  assert.equal(quote([{ sku: "offer139", quantity: 1 }], pricedCatalogue, { taxRateBps: 700, shippingCents: 8500 }).taxCents, 973); // $9.73
  assert.equal(quote([{ sku: "offer159", quantity: 1 }], pricedCatalogue, { taxRateBps: 700, shippingCents: 8500 }).taxCents, 1113); // $11.13
  var promo = quote([{ sku: "promo", quantity: 1 }], pricedCatalogue, { taxRateBps: 700, shippingCents: 7500 });
  assert.equal(promo.taxCents, 0);
  assert.equal(promo.totalCents, 7500);
});

test("server design fee increases total but remains outside the tax base", function () {
  var result = quote([{ sku: "base", quantity: 1 }], { base: { active: true, name: "Base", unitCents: 9900 } }, { taxRateBps: 700, shippingCents: 7500, designFeeCents: 2500 });
  assert.equal(result.taxableCents, 9900);
  assert.equal(result.taxCents, 693);
  assert.equal(result.totalCents, 20593);
});

test("quote rejects unlisted products and invalid quantity", function () {
  assert.throws(function () { quote([{ sku: "not-real", quantity: 1 }], catalogue); }, /unavailable/);
  assert.throws(function () { quote([{ sku: "cards", quantity: 1.5 }], catalogue); }, /quantity/);
});

test("checkout blocks rather than claiming a session without a gateway", async function () {
  assert.throws(function () { checkout.createCheckout({ cart: [{ sku: "cards", quantity: 1 }], idempotencyKey: "a".repeat(16) }, { catalogue: catalogue }); }, { code: "CHECKOUT_BLOCKED" });
});

test("checkout uses recalculated totals and requires an HTTPS gateway URL", async function () {
  var output = await checkout.createCheckout({ cart: [{ sku: "cards", quantity: 2, unitCents: 1 }], idempotencyKey: "b".repeat(16) }, { catalogue: catalogue, orderRepository: { reservePending: function (order) { assert.equal(order.quote.totalCents, 500); return { id: "order_1" }; } }, gateway: { createHostedCheckout: function (request) { assert.equal(request.amountCents, 500); assert.equal(request.metadata.orderReference, "order_1"); return { id: "cs_adapter_example", url: "https://gateway.example/checkout" }; } } });
  assert.equal(output.status, "pending_payment");
});

test("checkout blocks when no atomic order repository is configured", function () {
  assert.throws(function () { checkout.createCheckout({ cart: [{ sku: "cards", quantity: 1 }], idempotencyKey: "c".repeat(16) }, { catalogue: catalogue, gateway: { createHostedCheckout: function () {} } }); }, { code: "ORDER_PERSISTENCE_BLOCKED" });
});

test("QuickBooks configuration explicitly exposes missing credentials and sandbox default", function () {
  assert.deepEqual(quickbooks.configuration({}), { ready: false, blocked: true, environment: "sandbox", missing: ["QUICKBOOKS_REALM_ID", "QUICKBOOKS_ACCESS_TOKEN"] });
});

test("QuickBooks refuses an unverified paid status", async function () {
  await assert.rejects(quickbooks.createSalesReceipt({ status: "paid", lines: [] }, { post: async function () {} }, { QUICKBOOKS_REALM_ID: "realm", QUICKBOOKS_ACCESS_TOKEN: "token" }), /verified paid order/);
});

test("verified webhook events are atomically deduplicated", async function () {
  var body = Buffer.from('{"id":"evt_once"}'), secret = "webhook-secret", signature = crypto.createHmac("sha256", secret).update(body).digest("hex"), seen = new Set(), handled = 0;
  var repository = { reserveEvent: async function (id) { if (seen.has(id)) return false; seen.add(id); return true; } };
  var first = await webhooks.processVerifiedEvent(body, signature, secret, repository, async function () { handled += 1; });
  var second = await webhooks.processVerifiedEvent(body, signature, secret, repository, async function () { handled += 1; });
  assert.equal(first.duplicate, false); assert.equal(second.duplicate, true); assert.equal(handled, 1);
});

test("missing external payment dependencies expose BLOCKED/503", async function () {
  assert.throws(function () { checkout.createCheckout({ cart: [{ sku: "cards", quantity: 1 }], idempotencyKey: "z".repeat(16) }, { catalogue: catalogue }); }, { code: "CHECKOUT_BLOCKED", statusCode: 503 });
  await assert.rejects(quickbooks.createSalesReceipt({ status: "paid", lines: [] }, {}, {}), { code: "QUICKBOOKS_BLOCKED", statusCode: 503 });
  await assert.rejects(webhooks.processVerifiedEvent(Buffer.from('{"id":"evt"}'), crypto.createHmac("sha256", "x").update(Buffer.from('{"id":"evt"}')).digest("hex"), "x", null, async function () {}), { code: "WEBHOOK_REPOSITORY_BLOCKED", statusCode: 503 });
});

test("webhook verifies an HMAC before JSON parsing", function () {
  var body = Buffer.from('{"id":"evt_1"}');
  var secret = "webhook-secret";
  var signature = crypto.createHmac("sha256", secret).update(body).digest("hex");
  assert.deepEqual(webhooks.parseVerifiedEvent(body, "sha256=" + signature, secret), { id: "evt_1" });
  assert.throws(function () { webhooks.parseVerifiedEvent(body, "bad", secret); }, { code: "INVALID_SIGNATURE" });
  assert.throws(function () { webhooks.parseVerifiedEvent(body, signature, ""); }, { code: "WEBHOOK_BLOCKED" });
});

test("server Specials catalogue prices 2,500 at 139 dollars and taxes printing only", function () {
  var result = quoteSpecial({ printingSku: "flyer_2500", design: "front_back" });
  assert.equal(result.subtotalCents, 13900);
  assert.equal(result.taxableCents, 13900);
  assert.equal(result.taxCents, 973);
  assert.equal(result.designFrontCents, 7500);
  assert.equal(result.designBackCents, 1000);
  assert.equal(result.totalCents, 23373);
  assert.equal(result.processingFeeCents, null);
});

test("free 1,000 printing requires Vral design and still charges design", function () {
  assert.throws(function () { quoteSpecial({ printingSku: "flyer_1000_free", design: "front" }); }, /requires Vral design/);
  var result = quoteSpecial({ quantity: 1000, design: "front", designByVral: true });
  assert.equal(result.printingSku, "flyer_1000_free_when_vral_designs");
  assert.equal(result.subtotalCents, 0);
  assert.equal(result.taxCents, 0);
  assert.equal(result.designFeeCents, 7500);
  assert.equal(result.totalCents, 7500);
});

test("checkout replays an atomically reserved hosted session by idempotency key", async function () {
  var gatewayCalls = 0;
  var output = await checkout.createCheckout({ cart: [{ sku: "cards", quantity: 1 }], idempotencyKey: "d".repeat(16) }, {
    catalogue: catalogue,
    orderRepository: { reservePending: function () { return { id: "order_existing", status: "pending_payment", quote: { totalCents: 250 }, checkoutId: "qb_session_1", checkoutUrl: "https://payments.example/1" }; } },
    gateway: { provider: "quickbooks_payments", createHostedCheckout: function () { gatewayCalls += 1; } }
  });
  assert.equal(output.replayed, true);
  assert.equal(output.checkoutId, "qb_session_1");
  assert.equal(gatewayCalls, 0);
});

test("Specials checkout sends the server quote to QuickBooks Payments", async function () {
  var captured;
  var output = await checkout.createSpecialCheckout({ printingSku: "flyer_2500", design: "front_back", idempotencyKey: "e".repeat(16) }, {
    orderRepository: { reservePending: function (record) { assert.equal(record.quote.totalCents, 23373); return { id: "order_special" }; } },
    gateway: { provider: "quickbooks_payments", createHostedCheckout: function (request) { captured = request; return { id: "qb_session_special", url: "https://payments.example/special" }; } }
  });
  assert.equal(output.status, "pending_payment");
  assert.equal(captured.provider, "quickbooks_payments");
  assert.equal(captured.amountCents, 23373);
});

test("QuickBooks hosted adapter is blocked without realm and access token", async function () {
  var adapter = quickbooks.createHostedCheckoutAdapter({ createHostedCheckout: async function () { throw new Error("must not call transport"); } }, {});
  await assert.rejects(adapter.createHostedCheckout({ amountCents: 1 }), { code: "QUICKBOOKS_BLOCKED", statusCode: 503 });
});

test("webhook accepts Intuit-style base64 HMAC after raw-body verification", function () {
  var body = Buffer.from('{"id":"evt_b64"}'), secret = "webhook-secret";
  var signature = crypto.createHmac("sha256", secret).update(body).digest("base64");
  assert.deepEqual(webhooks.parseVerifiedEvent(body, signature, secret), { id: "evt_b64" });
});

test("verified payment marks the order paid before optional CRM delivery", async function () {
  var calls = [];
  var order = { id: "order_paid", status: "pending_payment", paymentVerified: false, totalCents: 23373 };
  var result = await reconciliation.reconcileVerifiedPayment({ id: "pay_evt_1", orderId: "order_paid", status: "succeeded", amountCents: 23373, currency: "USD", paymentVerified: true }, {
    orderRepository: {
      findById: async function () { return order; },
      markPaid: async function (id, patch) { calls.push(["markPaid", id]); order = Object.assign({}, order, patch); return order; }
    },
    crmHook: async function (paid) { calls.push(["crm", paid.status]); return { ok: true }; }
  });
  assert.deepEqual(calls, [["markPaid", "order_paid"], ["crm", "paid"]]);
  assert.equal(result.status, "paid");
  assert.equal(result.order.paymentVerified, true);
  assert.equal(result.crm.status, "DELIVERED");
  assert.equal(result.quickbooks.status, "BLOCKED");
});

test("unverified or mismatched payments never call markPaid", async function () {
  var marked = 0;
  var repository = { findById: async function () { return { id: "order_guard", status: "pending_payment", totalCents: 1000 }; }, markPaid: async function () { marked += 1; return {}; } };
  await assert.rejects(reconciliation.reconcileVerifiedPayment({ id: "pay_bad", orderId: "order_guard", status: "succeeded", amountCents: 999, currency: "USD" }, { orderRepository: repository }), { code: "PAYMENT_NOT_VERIFIED" });
  await assert.rejects(reconciliation.reconcileVerifiedPayment({ id: "pay_wrong_amount", orderId: "order_guard", status: "succeeded", amountCents: 999, currency: "USD", paymentVerified: true }, { orderRepository: repository }), /does not match/);
  assert.equal(marked, 0);
});
