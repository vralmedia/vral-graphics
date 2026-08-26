"use strict";

// Success/cancel URLs never claim a payment. Paid is true only after the
// order repository reports status paid AND paymentVerified from a webhook.

function blocked(reason) {
  return {
    paid: false,
    asserted: false,
    paymentStatus: "BLOCKED",
    reason: reason
  };
}

function firstDefined() {
  for (var i = 0; i < arguments.length; i += 1) {
    if (arguments[i] !== undefined && arguments[i] !== null && arguments[i] !== "") return arguments[i];
  }
  return null;
}

async function describePaymentReturn(input, dependencies) {
  dependencies = dependencies || {};
  var orderId = firstDefined(input && input.orderId, input && input.orderReference, input && input.id);
  if (!orderId || typeof orderId !== "string") {
    return {
      paid: false,
      asserted: false,
      paymentStatus: "unknown",
      reason: "success or cancel return did not include an order id"
    };
  }
  var repository = dependencies.orderRepository || dependencies.repository;
  if (!repository || typeof repository.findById !== "function") {
    return blocked("ORDER_REPOSITORY is not configured; URL return cannot assert payment");
  }
  var order = await repository.findById(orderId);
  if (!order || typeof order.id !== "string") {
    return {
      paid: false,
      asserted: false,
      paymentStatus: "unknown",
      orderId: orderId,
      reason: "order was not found"
    };
  }
  var verifiedPaid = order.status === "paid" && order.paymentVerified === true;
  return {
    paid: verifiedPaid,
    asserted: verifiedPaid,
    paymentStatus: verifiedPaid ? "paid" : (order.status || "pending_payment"),
    orderId: order.id,
    reason: verifiedPaid
      ? "order is paid after a verified provider event"
      : "URL return is not proof of payment"
  };
}

module.exports = { describePaymentReturn: describePaymentReturn };
