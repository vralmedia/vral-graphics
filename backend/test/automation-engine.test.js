"use strict";

var test = require("node:test");
var assert = require("node:assert/strict");
var engine = require("../lib/automation-engine");

test("automation queues admin work but fails closed on disconnected integrations", function () {
  var actions = engine.plan({ id: "evt-1", type: "request_received" }, { id: "job-1" }, { crm: { status: "blocked" }, email_or_whatsapp: { status: "connected" } }, Date.parse("2026-08-27T12:00:00Z"));
  assert.equal(actions[0].type, "sync_crm");
  assert.equal(actions[0].status, "blocked");
  assert.equal(actions[1].status, "queued");
  assert.equal(actions[2].status, "queued");
  assert.equal(new Set(actions.map(function (row) { return row.idempotencyKey; })).size, actions.length);
});

test("judgment and money gates always wait for a human", function () {
  var approval = engine.plan({ id: "evt-2", type: "proof_approved" }, { id: "job-2" }, { quickbooks: { status: "connected" } });
  var payment = engine.plan({ id: "evt-3", type: "payment_verified" }, { id: "job-2" }, {});
  assert.equal(approval[0].status, "waiting_human");
  assert.equal(approval[0].requiresHumanConfirmation, true);
  assert.equal(payment[0].type, "release_production");
  assert.equal(payment[0].status, "waiting_human");
});
