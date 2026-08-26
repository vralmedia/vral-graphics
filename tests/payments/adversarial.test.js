"use strict";

var test = require("node:test");
var assert = require("node:assert/strict");
var crypto = require("node:crypto");
var offers = require("../../server/payments/offers");
var checkout = require("../../server/payments/checkout");
var webhooks = require("../../server/payments/webhooks");
var reconciliation = require("../../server/payments/reconciliation");
var returns = require("../../server/payments/returns");
var quickbooks = require("../../server/payments/quickbooks");

test("browser-supplied unitCents and totalCents cannot change a specials quote", function () {
  var honest = offers.quoteSpecial({ printingSku: "business_card_1000", design: "front" });
  var attacked = offers.quoteSpecial({
    printingSku: "business_card_1000",
    design: "front",
    unitCents: 1,
    totalCents: 1,
    taxCents: 0,
    designFeeCents: 0
  });
  assert.equal(attacked.totalCents, honest.totalCents);
  assert.equal(attacked.subtotalCents, 9900);
  assert.equal(attacked.taxCents, 693);
  assert.equal(attacked.designFeeCents, 7500);
  assert.equal(attacked.totalCents, 18093);
});

test("generic quote ignores cart unitCents and uses the catalogue", function () {
  var catalogue = { cards: { active: true, name: "Cards", unitCents: 250 } };
  var result = offers.quote([{ sku: "cards", quantity: 2, unitCents: 1 }], catalogue);
  assert.equal(result.subtotalCents, 500);
});

test("success URL does not assert paid without a verified repository order", async function () {
  var pending = await returns.describePaymentReturn({ orderId: "order_1" }, {
    orderRepository: {
      findById: async function () {
        return { id: "order_1", status: "pending_payment", paymentVerified: false, totalCents: 18093 };
      }
    }
  });
  assert.equal(pending.paid, false);
  assert.equal(pending.asserted, false);
  assert.equal(pending.paymentStatus, "pending_payment");

  var missingRepo = await returns.describePaymentReturn({ orderId: "order_1" }, {});
  assert.equal(missingRepo.paid, false);
  assert.equal(missingRepo.paymentStatus, "BLOCKED");

  var paid = await returns.describePaymentReturn({ orderId: "order_paid" }, {
    orderRepository: {
      findById: async function () {
        return { id: "order_paid", status: "paid", paymentVerified: true };
      }
    }
  });
  assert.equal(paid.paid, true);
  assert.equal(paid.paymentStatus, "paid");
});

test("unverified webhook bodies never reach JSON side effects", function () {
  var body = Buffer.from('{"id":"evt_forge","status":"paid"}');
  assert.throws(function () {
    webhooks.parseVerifiedEvent(body, "deadbeef", "webhook-secret");
  }, { code: "INVALID_SIGNATURE" });
});

test("reconciliation still refuses amount, currency, and unpaid status mismatches", async function () {
  var marked = 0;
  var repository = {
    findById: async function () {
      return { id: "order_guard", status: "pending_payment", totalCents: 18093 };
    },
    markPaid: async function () {
      marked += 1;
      return {};
    }
  };
  await assert.rejects(reconciliation.reconcileVerifiedPayment({
    id: "pay_1",
    orderId: "order_guard",
    status: "succeeded",
    amountCents: 18093,
    currency: "USD"
  }, { orderRepository: repository }), { code: "PAYMENT_NOT_VERIFIED" });
  await assert.rejects(reconciliation.reconcileVerifiedPayment({
    id: "pay_2",
    orderId: "order_guard",
    status: "succeeded",
    amountCents: 1,
    currency: "USD",
    paymentVerified: true
  }, { orderRepository: repository }), /does not match/);
  await assert.rejects(reconciliation.reconcileVerifiedPayment({
    id: "pay_3",
    orderId: "order_guard",
    status: "succeeded",
    amountCents: 18093,
    currency: "EUR",
    paymentVerified: true
  }, { orderRepository: repository }), /currency/);
  assert.equal(marked, 0);
});

test("QuickBooks hosted checkout and sales receipt stay BLOCKED without OAuth secrets", async function () {
  assert.deepEqual(quickbooks.configuration({}), {
    ready: false,
    blocked: true,
    environment: "sandbox",
    missing: ["QUICKBOOKS_REALM_ID", "QUICKBOOKS_ACCESS_TOKEN"]
  });
  var adapter = quickbooks.createHostedCheckoutAdapter({
    createHostedCheckout: async function () { throw new Error("transport must not run"); }
  }, {});
  await assert.rejects(adapter.createHostedCheckout({ amountCents: 18093 }), {
    code: "QUICKBOOKS_BLOCKED",
    statusCode: 503
  });
  await assert.rejects(quickbooks.createSalesReceipt({
    status: "paid",
    paymentVerified: true,
    paymentProviderEventId: "evt",
    lines: []
  }, { post: async function () { return {}; } }, {}), { code: "QUICKBOOKS_BLOCKED" });
});

test("checkout replay never opens a second hosted session", async function () {
  var gatewayCalls = 0;
  var output = await checkout.createSpecialCheckout({
    printingSku: "business_card_2500",
    design: "front_back",
    idempotencyKey: "s".repeat(16),
    totalCents: 1
  }, {
    orderRepository: {
      reservePending: function (record) {
        assert.equal(record.quote.totalCents, 23373);
        assert.equal(record.status, "pending_payment");
        return {
          id: "order_existing",
          status: "pending_payment",
          quote: record.quote,
          checkoutId: "qb_session_1",
          checkoutUrl: "https://payments.example/1"
        };
      }
    },
    gateway: {
      provider: "quickbooks_payments",
      createHostedCheckout: function () { gatewayCalls += 1; }
    }
  });
  assert.equal(output.replayed, true);
  assert.equal(output.status, "pending_payment");
  assert.equal(gatewayCalls, 0);
});

test("HTTP checkout URL is rejected even from an injected adapter", async function () {
  await assert.rejects(checkout.createSpecialCheckout({
    printingSku: "business_card_1000",
    design: "front",
    idempotencyKey: "t".repeat(16)
  }, {
    orderRepository: { reservePending: function () { return { id: "order_http" }; } },
    gateway: {
      provider: "quickbooks_payments",
      createHostedCheckout: function () {
        return { id: "cs_insecure", url: "http://payments.example/insecure" };
      }
    }
  }), /invalid hosted checkout session/);
});
