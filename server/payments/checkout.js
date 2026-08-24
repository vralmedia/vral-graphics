"use strict";

var offers = require("./offers");
var orders = require("./orders");

function missingCredentials(names) {
  var err = new Error("Checkout is blocked: missing " + names.join(", "));
  err.code = "CHECKOUT_BLOCKED";
  err.missing = names;
  return err;
}

// Adapter boundary: deployment injects a real gateway implementation. It never fabricates a paid session.
function createCheckout(input, dependencies) {
  dependencies = dependencies || {};
  if (!input || typeof input.idempotencyKey !== "string" || !/^[A-Za-z0-9_-]{16,128}$/.test(input.idempotencyKey)) {
    throw new TypeError("a 16–128 character idempotencyKey is required");
  }
  var quote = offers.quote(input.cart, dependencies.catalogue, dependencies.pricing);
  var gateway = dependencies.gateway;
  if (!gateway || typeof gateway.createHostedCheckout !== "function") throw missingCredentials(["PAYMENT_GATEWAY_ADAPTER"]);
  return orders.reservePendingOrder({ idempotencyKey: input.idempotencyKey, orderReference: input.orderReference, quote: quote }, dependencies.orderRepository).then(function (order) {
    return Promise.resolve(gateway.createHostedCheckout({
    idempotencyKey: input.idempotencyKey,
    amountCents: quote.totalCents,
    currency: quote.currency,
    lines: quote.lines.map(function (line) { return { sku: line.sku, quantity: line.quantity, unitCents: line.unitCents }; }),
    metadata: { orderReference: order.id }
    })).then(function (session) {
    if (!session || typeof session.id !== "string" || typeof session.url !== "string" || !/^https:\/\//.test(session.url)) {
      throw new Error("Gateway returned an invalid hosted checkout session");
    }
    return { orderId: order.id, status: "pending_payment", checkoutId: session.id, checkoutUrl: session.url, quote: quote };
    });
  });
}

module.exports = { createCheckout: createCheckout, missingCredentials: missingCredentials };
