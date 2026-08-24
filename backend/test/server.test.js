"use strict";
var assert = require("node:assert/strict"); var test = require("node:test"); var createServer = require("../server").createServer;
function listen(server) { return new Promise(function (resolve) { server.listen(0, "127.0.0.1", function () { resolve(server.address().port); }); }); }
function close(server) { return new Promise(function (resolve) { server.close(resolve); }); }
test("server boots with missing or configured generic adapters", function () {
  assert.doesNotThrow(function () { createServer({ env: { VG_FORM_API_KEY: "key" } }); });
  assert.doesNotThrow(function () { createServer({ env: { VG_FORM_API_KEY: "key", VG_CRM_WEBHOOK_URL: "https://crm.example/lead", VG_FLYER_EMAIL_WEBHOOK_URL: "https://mail.example/lead" }, request: async function () { return { ok: true, json: async function () { return {}; } }; } }); });
});
test("HTTP server forwards ordered fields, idempotency key, and honeypot to intake", async function () {
  var captured; var fake = { submit: async function (body, context) { captured = { body: body, context: context }; return { ok: true, statusCode: 202, suppressed: "HONEYPOT" }; } };
  var server = createServer({ env: { VG_FORM_API_KEY: "key", VG_FORM_ALLOWED_ORIGIN: "https://vralgraphics.com" }, service: fake }); var port = await listen(server);
  var response = await fetch("http://127.0.0.1:" + port + "/api/leads", { method: "POST", headers: { authorization: "Bearer key", "content-type": "application/json", origin: "https://vralgraphics.com" }, body: JSON.stringify({ name: "Ava", phone: "1", email: "ava@example.com", address: "123 St", business: "Ava Co", interest: "Flyers", idempotencyKey: "idem-1", website: "bot" }) });
  assert.equal(response.status, 202); assert.deepEqual(Object.keys(captured.body), ["name", "phone", "email", "address", "business", "interest", "idempotencyKey", "website"]); assert.equal(captured.body.website, "bot"); assert.equal(captured.context.source, "https://vralgraphics.com"); await close(server);
});
test("HTTP server requires exact CORS origin, Bearer auth, and JSON", async function () {
  var fake = { submit: async function () { throw new Error("must not submit"); } };
  var server = createServer({ env: { VG_FORM_API_KEY: "key", VG_FORM_ALLOWED_ORIGIN: "https://vralgraphics.com" }, service: fake }); var port = await listen(server), url = "http://127.0.0.1:" + port + "/api/leads";
  var wrongOrigin = await fetch(url, { method: "POST", headers: { authorization: "Bearer key", "content-type": "application/json", origin: "https://evil.example" }, body: "{}" }); assert.equal(wrongOrigin.status, 403); assert.equal(wrongOrigin.headers.get("access-control-allow-origin"), null);
  var noAuth = await fetch(url, { method: "POST", headers: { "content-type": "application/json", origin: "https://vralgraphics.com" }, body: "{}" }); assert.equal(noAuth.status, 401);
  var wrongType = await fetch(url, { method: "POST", headers: { authorization: "Bearer key", "content-type": "text/plain", origin: "https://vralgraphics.com" }, body: "{}" }); assert.equal(wrongType.status, 415);
  await close(server);
});
test("HTTP server reports missing origin configuration as BLOCKED/503", async function () {
  var server = createServer({ env: { VG_FORM_API_KEY: "key" }, service: { submit: async function () { throw new Error("must not submit"); } } }); var port = await listen(server);
  var response = await fetch("http://127.0.0.1:" + port + "/api/leads", { method: "POST", headers: { authorization: "Bearer key", "content-type": "application/json", origin: "https://vralgraphics.com" }, body: "{}" });
  assert.equal(response.status, 503); assert.match((await response.json()).error, /^BLOCKED:/); await close(server);
});
