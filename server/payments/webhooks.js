"use strict";

var crypto = require("node:crypto");

function verifyHmac(rawBody, receivedSignature, secret) {
  if (!Buffer.isBuffer(rawBody)) throw new TypeError("rawBody must be a Buffer");
  if (typeof receivedSignature !== "string" || !secret) return false;
  var expected = crypto.createHmac("sha256", secret).update(rawBody).digest();
  var actual = receivedSignature.replace(/^sha256=/i, "").trim();
  // Intuit commonly sends base64; hex and sha256=<value> are accepted for
  // generic adapters while comparison remains constant-time.
  return [expected.toString("base64"), expected.toString("hex")].some(function (encoded) {
    var a = Buffer.from(encoded), b = Buffer.from(actual);
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  });
}

function parseVerifiedEvent(rawBody, signature, secret) {
  if (!secret) { var err = new Error("Webhook processing blocked: PAYMENT_WEBHOOK_SECRET is missing"); err.code = "WEBHOOK_BLOCKED"; err.statusCode = 503; throw err; }
  if (!verifyHmac(rawBody, signature, secret)) { var invalid = new Error("Invalid webhook signature"); invalid.code = "INVALID_SIGNATURE"; throw invalid; }
  return JSON.parse(rawBody.toString("utf8"));
}

// The repository must atomically reserve the provider event id before side effects.
async function processVerifiedEvent(rawBody, signature, secret, repository, handler) {
  var event = parseVerifiedEvent(rawBody, signature, secret);
  if (!event || typeof event.id !== "string" || !event.id) throw new TypeError("verified webhook event id is required");
  if (!repository || typeof repository.reserveEvent !== "function") { var err = new Error("Webhook processing blocked: WEBHOOK_EVENT_REPOSITORY is missing"); err.code = "WEBHOOK_REPOSITORY_BLOCKED"; err.statusCode = 503; throw err; }
  if (typeof handler !== "function") throw new TypeError("webhook handler is required");
  var reserved = await repository.reserveEvent(event.id);
  if (!reserved) return { duplicate: true, eventId: event.id };
  await handler(event);
  return { duplicate: false, eventId: event.id };
}

module.exports = { verifyHmac: verifyHmac, parseVerifiedEvent: parseVerifiedEvent, processVerifiedEvent: processVerifiedEvent };
