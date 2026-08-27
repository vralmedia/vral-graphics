"use strict";

var test = require("node:test");
var assert = require("node:assert/strict");
var os = require("../lib/company-os");

test("operations snapshot turns normal work into next actions and exceptions", function () {
  var now = Date.parse("2026-08-27T12:00:00.000Z");
  var data = os.snapshot([
    { id: "a", business: "A Studio", status: "New", owner: "Mike", receivedAt: "2026-08-27T10:00:00.000Z", followUpDue: "2026-08-27T11:00:00.000Z", delivery: [] },
    { id: "b", business: "B Studio", status: "Payment Pending", paymentVerified: false, receivedAt: "2026-08-27T09:00:00.000Z", delivery: [{ channel: "crm", status: "FAILED" }] },
    { id: "c", business: "A Studio", status: "Ready", receivedAt: "2026-08-27T08:00:00.000Z", delivery: [] }
  ], now);
  assert.equal(data.metrics.newRequests, 1);
  assert.equal(data.metrics.ready, 1);
  assert.equal(data.metrics.exceptions, 3);
  assert.equal(data.jobs[0].nextAction.code, "contact_customer");
  assert.equal(data.customers.length, 2);
  assert.equal(data.customers[0].active, 2);
});

test("paid is a release gate and never inferred from a pending stage", function () {
  assert.equal(os.nextAction({ status: "Payment Pending", paymentVerified: false }).code, "verify_payment");
  assert.equal(os.nextAction({ status: "Paid", paymentVerified: true }).code, "release_production");
});
