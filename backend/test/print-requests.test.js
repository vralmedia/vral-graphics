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
