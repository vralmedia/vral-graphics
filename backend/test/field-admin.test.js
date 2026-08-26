"use strict";

var assert = require("node:assert/strict");
var fs = require("node:fs");
var fsPromises = require("node:fs/promises");
var os = require("node:os");
var path = require("node:path");
var test = require("node:test");
var createServer = require("../server").createServer;
var createLeadService = require("../lib/lead-service").createLeadService;
var PIPELINE_STATUSES = require("../lib/pipeline").PIPELINE_STATUSES;

function listen(server) {
  return new Promise(function (resolve) { server.listen(0, "127.0.0.1", function () { resolve(server.address().port); }); });
}
function close(server) { return new Promise(function (resolve) { server.close(resolve); }); }
function cookie(res) {
  var raw = res.headers.get("set-cookie") || "";
  return raw.split(";")[0];
}

var ORIGIN = "https://vralgraphics.com";
var users = JSON.stringify([
  { username: "mike", password: "mike-pass-123", name: "Mike", role: "rep" },
  { username: "anthony", password: "ant-pass-123", name: "Anthony", role: "admin" }
]);
var form = { name: "Mia", phone: "+1 305 555 0111", email: "mia@example.com", address: "9 Ink Ave", business: "Mia Studio", interest: "Printing", idempotencyKey: "field-key-00000001" };

function envFor(store) {
  return {
    VG_FORM_ALLOWED_ORIGIN: ORIGIN,
    VG_FORM_API_KEY: "server-key",
    VG_FIELD_SESSION_SECRET: "field-secret-16+",
    VG_FIELD_USERS: users,
    LEAD_STORE_PATH: store
  };
}

async function boot() {
  var dir = await fsPromises.mkdtemp(path.join(os.tmpdir(), "vg-field-"));
  var store = path.join(dir, "leads.jsonl");
  var service = createLeadService({ storePath: store, adapters: [] });
  var server = createServer({ env: envFor(store), service: service });
  var port = await listen(server);
  return { server: server, service: service, port: port, store: store };
}

async function login(port, username, password) {
  var res = await fetch("http://127.0.0.1:" + port + "/api/field/login", {
    method: "POST",
    headers: { "content-type": "application/json", origin: ORIGIN },
    body: JSON.stringify({ username: username, password: password })
  });
  return { res: res, cookie: cookie(res), body: await res.json() };
}

test("field login is BLOCKED without credentials and never simulated", async function () {
  var server = createServer({ env: { VG_FORM_ALLOWED_ORIGIN: ORIGIN }, service: { submit: async function () {} } });
  var port = await listen(server);
  var res = await fetch("http://127.0.0.1:" + port + "/api/field/login", {
    method: "POST",
    headers: { "content-type": "application/json", origin: ORIGIN },
    body: JSON.stringify({ username: "mike", password: "x" })
  });
  assert.equal(res.status, 503);
  assert.match((await res.json()).error, /^BLOCKED:/);
  await close(server);
});

test("Mike captures a field lead only after the server records it, and CRM is not claimed saved", async function () {
  var ctx = await boot();
  var session = await login(ctx.port, "mike", "mike-pass-123");
  assert.equal(session.res.status, 200);
  var saved = await fetch("http://127.0.0.1:" + ctx.port + "/api/field/leads", {
    method: "POST",
    headers: { "content-type": "application/json", origin: ORIGIN, cookie: session.cookie },
    body: JSON.stringify(form)
  });
  var body = await saved.json();
  assert.equal(saved.status, 202);
  assert.equal(body.persistence, "RECORDED");
  assert.equal(body.owner, "Mike");
  assert.ok(body.id);
  var listed = await fetch("http://127.0.0.1:" + ctx.port + "/api/field/leads", {
    headers: { origin: ORIGIN, cookie: session.cookie }
  });
  var list = await listed.json();
  assert.equal(list.leads.length, 1);
  assert.equal(list.leads[0].source, "Field");
  assert.equal(list.leads[0].capturedBy, "Mike");
  await close(ctx.server);
});

test("Anthony sees every lead and Mike only sees Mike-owned leads", async function () {
  var ctx = await boot();
  await ctx.service.submit(form, { owner: "Mike", source: "Field", clientKey: "a" });
  await ctx.service.submit(Object.assign({}, form, { email: "other@example.com", name: "Ana", idempotencyKey: "field-key-00000002" }), { owner: "Anthony", source: "website", clientKey: "b" });
  var mike = await login(ctx.port, "mike", "mike-pass-123");
  var anthony = await login(ctx.port, "anthony", "ant-pass-123");
  var mikeList = await (await fetch("http://127.0.0.1:" + ctx.port + "/api/field/leads", { headers: { origin: ORIGIN, cookie: mike.cookie } })).json();
  var anthonyList = await (await fetch("http://127.0.0.1:" + ctx.port + "/api/admin/leads", { headers: { origin: ORIGIN, cookie: anthony.cookie } })).json();
  assert.equal(mikeList.leads.length, 1);
  assert.equal(mikeList.leads[0].owner, "Mike");
  assert.equal(anthonyList.leads.length, 2);
  assert.deepEqual(anthonyList.columns, PIPELINE_STATUSES);
  await close(ctx.server);
});

test("Paid cannot be set from admin before a verified payment webhook", async function () {
  var ctx = await boot();
  var created = await ctx.service.submit(form, { owner: "Mike", source: "Field", clientKey: "c" });
  var anthony = await login(ctx.port, "anthony", "ant-pass-123");
  var blocked = await fetch("http://127.0.0.1:" + ctx.port + "/api/admin/leads/" + created.lead.id, {
    method: "PATCH",
    headers: { "content-type": "application/json", origin: ORIGIN, cookie: anthony.cookie },
    body: JSON.stringify({ status: "Paid" })
  });
  assert.equal(blocked.status, 409);
  var verify = await fetch("http://127.0.0.1:" + ctx.port + "/api/internal/payment-verified", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: "Bearer server-key" },
    body: JSON.stringify({ leadId: created.lead.id, eventId: "evt_1" })
  });
  assert.equal(verify.status, 200);
  var paid = await verify.json();
  assert.equal(paid.status, "Paid");
  assert.equal(paid.paymentVerified, true);
  var board = await (await fetch("http://127.0.0.1:" + ctx.port + "/api/admin/leads", { headers: { origin: ORIGIN, cookie: anthony.cookie } })).json();
  assert.equal(board.leads[0].status, "Paid");
  await close(ctx.server);
});

test("same-origin GET without Origin still lists leads when Sec-Fetch-Site is same-origin", async function () {
  var ctx = await boot();
  await ctx.service.submit(form, { owner: "Mike", source: "Field", clientKey: "g" });
  var mike = await login(ctx.port, "mike", "mike-pass-123");
  var listed = await fetch("http://127.0.0.1:" + ctx.port + "/api/admin/leads", {
    headers: { cookie: mike.cookie, "sec-fetch-site": "same-origin" }
  });
  assert.equal(listed.status, 200);
  assert.equal((await listed.json()).leads.length, 1);
  await close(ctx.server);
});

test("field and admin pages stay private: noindex, data-page, no Mike personal phone, no CRM Saved placeholder", function () {
  var field = fs.readFileSync(path.resolve(__dirname, "../../field/index.html"), "utf8");
  var admin = fs.readFileSync(path.resolve(__dirname, "../../admin/index.html"), "utf8");
  [field, admin].forEach(function (html) {
    assert.match(html, /noindex/);
    assert.match(html, /data-vral-header/);
    assert.match(html, /data-vral-footer/);
    assert.equal(html.includes("17864617465"), false);
    assert.equal(html.includes("(786) 461-7465"), false);
    assert.equal(html.includes("CRM Saved"), false);
  });
  assert.match(field, /data-page="field"/);
  assert.match(admin, /data-page="admin"/);
  assert.deepEqual(PIPELINE_STATUSES, [
    "New", "Contacted", "Quoted", "Awaiting Artwork", "Awaiting Approval",
    "Payment Pending", "Paid", "In Production", "Ready", "Completed", "Lost"
  ]);
});
