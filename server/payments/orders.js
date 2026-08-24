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
  return Promise.resolve(repository.reservePending({
    idempotencyKey: input.idempotencyKey,
    orderReference: input.orderReference || null,
    status: "pending_payment",
    quote: input.quote
  })).then(function (order) {
    if (!order || typeof order.id !== "string") throw new Error("Order repository returned an invalid reservation");
    return order;
  });
}

module.exports = { reservePendingOrder: reservePendingOrder };
