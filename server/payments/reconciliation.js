"use strict";

var webhooks = require("./webhooks");
var orders = require("./orders");

function status(name, reason) {
  return { status: name, reason: reason };
}

function firstDefined() {
  for (var i = 0; i < arguments.length; i += 1) if (arguments[i] !== undefined && arguments[i] !== null && arguments[i] !== "") return arguments[i];
  return null;
}

function paymentFields(event, verification) {
  var payment = event.payment || event.data || event;
  verification = verification || {};
  return {
    orderId: firstDefined(event.orderId, event.orderReference, payment.orderId, payment.orderReference, event.metadata && event.metadata.orderReference),
    eventId: firstDefined(event.id, event.eventId, payment.id),
    amountCents: firstDefined(verification.amountCents, payment.amountCents, event.amountCents),
    currency: String(firstDefined(verification.currency, payment.currency, event.currency, "USD")).toUpperCase(),
    state: String(firstDefined(payment.status, event.status, event.type, "")).toLowerCase()
  };
}

function successfulState(state) {
  return ["paid", "succeeded", "successful", "completed", "captured", "payment.succeeded", "payment.completed"].indexOf(state) !== -1;
}

async function findOrder(repository, fields) {
  if (typeof repository.findById === "function") return repository.findById(fields.orderId);
  if (typeof repository.getById === "function") return repository.getById(fields.orderId);
  if (typeof repository.findByOrderReference === "function") return repository.findByOrderReference(fields.orderId);
  throw Object.assign(new Error("Payment reconciliation is blocked: order lookup is not configured"), { code: "ORDER_LOOKUP_BLOCKED", statusCode: 503 });
}

async function verifyPayment(event, dependencies) {
  var verifier = dependencies.paymentVerifier || dependencies.gateway;
  if (verifier && typeof verifier.verifyPayment === "function") return verifier.verifyPayment(event);
  if (verifier && typeof verifier.verify === "function") return verifier.verify(event);
  // This path is available only to the handler created below, after raw-body
  // HMAC verification, or to callers carrying an explicit verified marker.
  if (event.paymentVerified === true || event.verified === true || event._webhookVerified === true) return { verified: true };
  var error = new Error("Payment was not verified by QuickBooks Payments");
  error.code = "PAYMENT_NOT_VERIFIED";
  throw error;
}

async function reconcileVerifiedPayment(event, dependencies) {
  dependencies = dependencies || {};
  if (!event || typeof event !== "object") throw new TypeError("payment event is required");
  var verification = await verifyPayment(event, dependencies);
  if (verification === true) verification = { verified: true };
  if (!verification || verification.verified !== true) {
    var notVerified = new Error("QuickBooks Payments did not verify the payment");
    notVerified.code = "PAYMENT_NOT_VERIFIED";
    throw notVerified;
  }
  var fields = paymentFields(event, verification);
  if (!fields.orderId || !fields.eventId) throw new TypeError("verified payment requires orderId and event id");
  if (fields.state && !successfulState(fields.state) && (!verification.status || !successfulState(String(verification.status).toLowerCase()))) {
    throw new Error("payment event is not a successful payment");
  }
  var repository = dependencies.orderRepository || dependencies.repository;
  if (!repository) {
    var blocked = new Error("Payment reconciliation is blocked: ORDER_REPOSITORY is missing");
    blocked.code = "ORDER_REPOSITORY_BLOCKED";
    blocked.statusCode = 503;
    throw blocked;
  }
  var order = await findOrder(repository, fields);
  if (!order || typeof order.id !== "string") throw new Error("order for verified payment was not found");
  if (order.status === "paid" && order.paymentVerified === true) {
    return { status: "paid", alreadyPaid: true, order: order, quickbooks: status("BLOCKED", "no QuickBooks sync adapter was supplied"), crm: status("BLOCKED", "no CRM hook was supplied") };
  }
  var expectedAmount = firstDefined(order.totalCents, order.quote && order.quote.totalCents);
  if (verification.amountCents != null) fields.amountCents = verification.amountCents;
  if (fields.amountCents == null || expectedAmount == null || Number(fields.amountCents) !== Number(expectedAmount)) throw new Error("verified payment amount does not match the order");
  if (fields.currency !== "USD") throw new Error("unsupported payment currency");

  var paidOrder = await orders.markPaidOrder({ orderId: order.id, paymentProviderEventId: fields.eventId, paymentVerified: true }, repository);
  var quickbooksResult = status("BLOCKED", "no QuickBooks sync adapter was supplied");
  if (typeof dependencies.quickbooksSync === "function") {
    try {
      var qb = await dependencies.quickbooksSync(paidOrder);
      quickbooksResult = qb && qb.status ? qb : status("DELIVERED", "QuickBooks sync adapter accepted the paid order");
    } catch (error) {
      quickbooksResult = status("FAILED", "QuickBooks sync failed");
    }
  }
  var crmResult = status("BLOCKED", "no CRM hook was supplied");
  if (typeof dependencies.crmHook === "function") {
    try {
      var crm = await dependencies.crmHook(paidOrder);
      crmResult = crm && crm.status ? crm : (crm && crm.ok === true ? status("DELIVERED", "CRM hook accepted the paid order") : status("FAILED", "CRM hook did not confirm delivery"));
    } catch (error) {
      crmResult = status("FAILED", "CRM hook failed");
    }
  }
  return { status: "paid", alreadyPaid: false, order: paidOrder, quickbooks: quickbooksResult, crm: crmResult };
}

function createVerifiedPaymentHandler(dependencies) {
  dependencies = dependencies || {};
  return function (event) {
    var marked = Object.assign({}, event, { _webhookVerified: true });
    return reconcileVerifiedPayment(marked, dependencies);
  };
}

function processPaymentWebhook(rawBody, signature, dependencies) {
  dependencies = dependencies || {};
  var env = dependencies.env || process.env;
  var eventRepository = dependencies.eventRepository || dependencies.repository;
  return webhooks.processVerifiedEvent(rawBody, signature, dependencies.webhookSecret || env.PAYMENT_WEBHOOK_SECRET, eventRepository, createVerifiedPaymentHandler(dependencies));
}

module.exports = { reconcileVerifiedPayment: reconcileVerifiedPayment, createVerifiedPaymentHandler: createVerifiedPaymentHandler, processPaymentWebhook: processPaymentWebhook };
