"use strict";

var assert = require("node:assert/strict");
var fs = require("node:fs/promises");
var os = require("node:os");
var path = require("node:path");
var test = require("node:test");
var createServer = require("../server").createServer;
var createLeadService = require("../lib/lead-service").createLeadService;

function listen(server) {
  return new Promise(function (resolve) { server.listen(0, "127.0.0.1", function () { resolve(server.address().port); }); });
}
function close(server) { return new Promise(function (resolve) { server.close(resolve); }); }

var ORIGIN = "https://vralgraphics.com";
var form = { name: "Ava", phone: "+1 (305) 555-0100", email: "ava@example.com", address: "123 Print St", business: "Ava Co", interest: "Printing" };

test("POST /api/print-requests is same-origin, has no browser Authorization, and persists through lead-service", async function () {
  var dir = await fs.mkdtemp(path.join(os.tmpdir(), "vg-print-"));
  var store = path.join(dir, "leads.jsonl");
  var server = createServer({
    env: { VG_FORM_ALLOWED_ORIGIN: ORIGIN, LEAD_STORE_PATH: store },
    service: createLeadService({ storePath: store, adapters: [] })
  });
  var port = await listen(server);
  var response = await fetch("http://127.0.0.1:" + port + "/api/print-requests", {
    method: "POST",
    headers: { "content-type": "application/json", origin: ORIGIN },
    body: JSON.stringify(form)
  });
  var body = await response.json();
  assert.equal(response.status, 202);
  assert.equal(body.persistence, "RECORDED");
  assert.equal(body.owner, "Mike");
  assert.ok(body.id);
  var rows = (await fs.readFile(store, "utf8")).trim().split("\n").map(JSON.parse);
  assert.equal(rows[0].name, "Ava");
  assert.equal(rows[0].source, "website");
  await close(server);
});

test("POST /api/print-requests rejects other origins and stays BLOCKED without origin config", async function () {
  var fake = { submit: async function () { throw new Error("must not submit"); } };
  var open = createServer({ env: { VG_FORM_ALLOWED_ORIGIN: ORIGIN }, service: fake });
  var port = await listen(open);
  var wrong = await fetch("http://127.0.0.1:" + port + "/api/print-requests", {
    method: "POST",
    headers: { "content-type": "application/json", origin: "https://evil.example" },
    body: "{}"
  });
  assert.equal(wrong.status, 403);
  await close(open);

  var blocked = createServer({ env: {}, service: fake });
  var blockedPort = await listen(blocked);
  var missing = await fetch("http://127.0.0.1:" + blockedPort + "/api/print-requests", {
    method: "POST",
    headers: { "content-type": "application/json", origin: ORIGIN },
    body: "{}"
  });
  assert.equal(missing.status, 503);
  assert.match((await missing.json()).error, /^BLOCKED:/);
  await close(blocked);
});

test("POST /api/leads still requires Bearer and does not become a browser route", async function () {
  var fake = { submit: async function () { throw new Error("must not submit"); } };
  var server = createServer({ env: { VG_FORM_API_KEY: "key", VG_FORM_ALLOWED_ORIGIN: ORIGIN }, service: fake });
  var port = await listen(server);
  var noAuth = await fetch("http://127.0.0.1:" + port + "/api/leads", {
    method: "POST",
    headers: { "content-type": "application/json", origin: ORIGIN },
    body: "{}"
  });
  assert.equal(noAuth.status, 401);
  var printNoAuth = await fetch("http://127.0.0.1:" + port + "/api/print-requests", {
    method: "POST",
    headers: { "content-type": "application/json", origin: ORIGIN },
    body: JSON.stringify(form)
  });
  assert.notEqual(printNoAuth.status, 401);
  await close(server);
});

test("checkout HTTP boundary is explicit and fail-closed without QuickBooks", async function () {
  var blockedServer = createServer({ env: { VG_FORM_ALLOWED_ORIGIN: ORIGIN }, service: { submit: async function () {} } });
  var blockedPort = await listen(blockedServer);
  var blocked = await fetch("http://127.0.0.1:" + blockedPort + "/api/checkout", { method: "POST", headers: { origin: ORIGIN, "content-type": "application/json" }, body: "{}" });
  assert.equal(blocked.status, 503);
  assert.match((await blocked.json()).error, /^BLOCKED:/);
  await close(blockedServer);

  var liveServer = createServer({ env: { VG_FORM_ALLOWED_ORIGIN: ORIGIN }, service: { submit: async function () {} }, paymentService: { createCheckout: async function () { return { status: "pending_payment", checkoutUrl: "https://payments.example.test/session" }; } } });
  var livePort = await listen(liveServer);
  var live = await fetch("http://127.0.0.1:" + livePort + "/api/checkout", { method: "POST", headers: { origin: ORIGIN, "content-type": "application/json" }, body: JSON.stringify({ sku: "business_card_1000" }) });
  assert.equal(live.status, 201);
  assert.equal((await live.json()).status, "pending_payment");
  await close(liveServer);
});

test("print-requests keep honeypot, idempotency and BLOCKED CRM without a URL", async function () {
  var dir = await fs.mkdtemp(path.join(os.tmpdir(), "vg-print-hp-"));
  var store = path.join(dir, "leads.jsonl");
  var adapters = require("../lib/adapters");
  var server = createServer({
    env: { VG_FORM_ALLOWED_ORIGIN: ORIGIN, LEAD_STORE_PATH: store },
    service: createLeadService({ storePath: store, adapters: [adapters.createCrmAdapter({}, fetch), adapters.createFlyerEmailAdapter({}, fetch)] })
  });
  var port = await listen(server);
  var bot = await fetch("http://127.0.0.1:" + port + "/api/print-requests", {
    method: "POST",
    headers: { "content-type": "application/json", origin: ORIGIN },
    body: JSON.stringify(Object.assign({}, form, { website: "https://bot.example" }))
  });
  assert.equal(bot.status, 202);
  assert.deepEqual(await bot.json(), { accepted: true });
  var first = await fetch("http://127.0.0.1:" + port + "/api/print-requests", {
    method: "POST",
    headers: { "content-type": "application/json", origin: ORIGIN },
    body: JSON.stringify(Object.assign({}, form, { idempotencyKey: "print-key-00000001" }))
  });
  var again = await fetch("http://127.0.0.1:" + port + "/api/print-requests", {
    method: "POST",
    headers: { "content-type": "application/json", origin: ORIGIN },
    body: JSON.stringify(Object.assign({}, form, { idempotencyKey: "print-key-00000001" }))
  });
  assert.equal(first.status, 202);
  assert.equal(again.status, 200);
  var created = await first.json();
  assert.deepEqual(created.delivery.map(function (item) { return item.status; }), ["BLOCKED", "BLOCKED"]);
  var stored = (await fs.readFile(store, "utf8")).trim().split("\n").map(JSON.parse).filter(function (row) { return !row.type; });
  assert.equal(stored.length, 1);
  await close(server);
});

test("configured Company OS returns a secure tracking capability and tracking stays token-gated", async function () {
  var calls = [];
  var companyOs = {
    configured: true,
    intake: async function (body) {
      calls.push(body);
      return { ok: true, statusCode: 202, trackingToken: "secure-token-123456789012345678901234567890", lead: { id: "job-1", receivedAt: "2026-08-27T12:00:00Z", owner: "Mike", status: "New", delivery: [] } };
    },
    track: async function (token) {
      assert.equal(token, "secure-token-123456789012345678901234567890");
      return { id: "job-1", status: "New", events: [] };
    },
    latestProof: async function (id, token) {
      assert.equal(id, "job-1");
      assert.equal(token, "secure-token-123456789012345678901234567890");
      return { buffer: Buffer.from("proof"), type: "application/pdf", name: "proof.pdf" };
    },
    recordApproval: async function (id, token, decision) {
      assert.equal(id, "job-1");
      assert.equal(token, "secure-token-123456789012345678901234567890");
      assert.equal(decision, "approved");
      return { id: "approval-1", decision: decision };
    }
  };
  var server = createServer({ env: { VG_FORM_ALLOWED_ORIGIN: ORIGIN }, companyOs: companyOs, service: { submit: async function () { throw new Error("sandbox must not accept production job"); } } });
  var port = await listen(server);
  var accepted = await fetch("http://127.0.0.1:" + port + "/api/print-requests", { method: "POST", headers: { "content-type": "application/json", origin: ORIGIN }, body: JSON.stringify(form) });
  var body = await accepted.json();
  assert.equal(accepted.status, 202);
  assert.equal(body.trackingToken, "secure-token-123456789012345678901234567890");
  assert.equal(calls.length, 1);
  var denied = await fetch("http://127.0.0.1:" + port + "/api/jobs/track", { headers: { origin: ORIGIN } });
  assert.notEqual(denied.status, 200);
  var tracked = await fetch("http://127.0.0.1:" + port + "/api/jobs/track", { headers: { origin: ORIGIN, "x-vral-job-token": body.trackingToken } });
  assert.equal(tracked.status, 200);
  assert.equal((await tracked.json()).id, "job-1");
  var proof = await fetch("http://127.0.0.1:" + port + "/api/jobs/job-1/proof", { headers: { origin: ORIGIN, "x-vral-job-token": body.trackingToken } });
  assert.equal(proof.status, 200);
  assert.equal(await proof.text(), "proof");
  var approval = await fetch("http://127.0.0.1:" + port + "/api/jobs/job-1/approval", { method: "POST", headers: { origin: ORIGIN, "content-type": "application/json", "x-vral-job-token": body.trackingToken }, body: JSON.stringify({ decision: "approved" }) });
  assert.equal(approval.status, 200);
  assert.equal((await approval.json()).decision, "approved");
  await close(server);
});
