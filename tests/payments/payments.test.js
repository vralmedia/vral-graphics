"use strict";

var test = require("node:test");
var assert = require("node:assert/strict");
var crypto = require("node:crypto");
var quote = require("../../server/payments/offers").quote;
var checkout = require("../../server/payments/checkout");
var quickbooks = require("../../server/payments/quickbooks");
var webhooks = require("../../server/payments/webhooks");

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

test("QuickBooks configuration explicitly exposes missing credentials", function () {
  assert.deepEqual(quickbooks.configuration({}), { ready: false, blocked: true, missing: ["QUICKBOOKS_REALM_ID", "QUICKBOOKS_ACCESS_TOKEN"] });
});

test("webhook verifies an HMAC before JSON parsing", function () {
  var body = Buffer.from('{"id":"evt_1"}');
  var secret = "webhook-secret";
  var signature = crypto.createHmac("sha256", secret).update(body).digest("hex");
  assert.deepEqual(webhooks.parseVerifiedEvent(body, "sha256=" + signature, secret), { id: "evt_1" });
  assert.throws(function () { webhooks.parseVerifiedEvent(body, "bad", secret); }, { code: "INVALID_SIGNATURE" });
  assert.throws(function () { webhooks.parseVerifiedEvent(body, signature, ""); }, { code: "WEBHOOK_BLOCKED" });
});
