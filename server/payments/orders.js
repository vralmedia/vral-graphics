"use strict";

// Repository boundary: the implementation must atomically reserve by idempotency key.
// This prevents duplicate orders when a browser retries checkout.
function reservePendingOrder(input, repository) {
  if (!repository || typeof repository.reservePending !== "function") {
    var err = new Error("Order persistence is blocked: ORDER_REPOSITORY is not configured");
    err.code = "ORDER_PERSISTENCE_BLOCKED";
    err.statusCode = 503;
    throw err;
  }
  if (!input || typeof input.idempotencyKey !== "string" || !input.quote) throw new TypeError("idempotencyKey and quote are required");
  return Promise.resolve(repository.reservePending({
    idempotencyKey: input.idempotencyKey,
    orderReference: input.orderReference || null,
    status: "pending_payment",
    paymentProvider: "quickbooks_payments",
    quote: input.quote
  })).then(function (order) {
    if (!order || typeof order.id !== "string") throw new Error("Order repository returned an invalid reservation");
    if (order.status && order.status !== "pending_payment") throw new Error("Order repository returned a non-pending reservation");
    return order;
  });
}

function markPaidOrder(input, repository) {
  if (!repository || typeof repository.markPaid !== "function") {
    var err = new Error("Order payment finalization is blocked: ORDER_REPOSITORY.markPaid is not configured");
    err.code = "ORDER_FINALIZATION_BLOCKED";
    err.statusCode = 503;
    throw err;
  }
  if (!input || typeof input.orderId !== "string" || !input.paymentProviderEventId || input.paymentVerified !== true) {
    throw new TypeError("only a verified provider event can mark an order paid");
  }
  return Promise.resolve(repository.markPaid(input.orderId, {
    status: "paid",
    paymentVerified: true,
    paymentProvider: "quickbooks_payments",
    paymentProviderEventId: input.paymentProviderEventId,
    paidAt: input.paidAt || new Date().toISOString()
  })).then(function (order) {
    if (!order || typeof order.id !== "string" || order.status !== "paid" || order.paymentVerified !== true) {
      throw new Error("Order repository did not confirm a verified paid order");
    }
    return order;
  });
}

module.exports = { reservePendingOrder: reservePendingOrder, markPaidOrder: markPaidOrder };
