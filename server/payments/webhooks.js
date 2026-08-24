"use strict";

var crypto = require("node:crypto");

function verifyHmac(rawBody, receivedSignature, secret) {
  if (!Buffer.isBuffer(rawBody)) throw new TypeError("rawBody must be a Buffer");
  if (typeof receivedSignature !== "string" || !secret) return false;
  var expected = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
  var actual = receivedSignature.replace(/^sha256=/, "");
  var a = Buffer.from(expected, "hex"), b = Buffer.from(actual, "hex");
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function parseVerifiedEvent(rawBody, signature, secret) {
  if (!secret) { var err = new Error("Webhook processing blocked: PAYMENT_WEBHOOK_SECRET is missing"); err.code = "WEBHOOK_BLOCKED"; throw err; }
  if (!verifyHmac(rawBody, signature, secret)) { var invalid = new Error("Invalid webhook signature"); invalid.code = "INVALID_SIGNATURE"; throw invalid; }
  return JSON.parse(rawBody.toString("utf8"));
}

module.exports = { verifyHmac: verifyHmac, parseVerifiedEvent: parseVerifiedEvent };
