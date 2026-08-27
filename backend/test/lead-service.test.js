"use strict";
var assert = require("node:assert/strict"); var fs = require("node:fs/promises"); var os = require("node:os"); var path = require("node:path"); var test = require("node:test");
var createLeadService = require("../lib/lead-service").createLeadService; var validate = require("../lib/lead-service").validate; var adapters = require("../lib/adapters");
async function service(options) { var dir = await fs.mkdtemp(path.join(os.tmpdir(), "vg-form-")); return { store: path.join(dir, "leads.jsonl"), instance: createLeadService(Object.assign({ storePath: path.join(dir, "leads.jsonl"), adapters: [] }, options)) }; }
var form = { name: "Ava", phone: "+1 (305) 555-0100", email: "ava@example.com", address: "123 Print St", business: "Ava Co", interest: "Printing" };
test("uses the complete lead schema and assigns Mike", async function () { var s = await service(); var r = await s.instance.submit(form, { source: "test", clientKey: "a" }); assert.equal(r.statusCode, 202); assert.equal(r.lead.owner, "Mike"); assert.equal(r.lead.status, "new"); assert.equal(r.lead.consent, false); assert.ok(r.lead.updatedAt); });
test("idempotency and 24-hour contact dedupe do not create another lead", async function () { var s = await service(); var first = await s.instance.submit(Object.assign({}, form, { idempotencyKey: "same-key-0000001" }), { clientKey: "a" }); var idem = await s.instance.submit(Object.assign({}, form, { idempotencyKey: "same-key-0000001" }), { clientKey: "a" }); var duplicate = await s.instance.submit(Object.assign({}, form, { idempotencyKey: "other-key-000001" }), { clientKey: "a" }); assert.equal(first.statusCode, 202); assert.equal(idem.statusCode, 200); assert.equal(duplicate.statusCode, 200); assert.equal((await fs.readFile(s.store, "utf8")).trim().split("\n").filter(function (x) { return !JSON.parse(x).type; }).length, 1); });
test("honeypot is accepted without persistence and rate limiting rejects excess", async function () { var s = await service({ rateLimit: { max: 1, windowMs: 60000 } }); var bot = await s.instance.submit(Object.assign({}, form, { website: "https://bot.example" }), { clientKey: "bot" }); assert.equal(bot.suppressed, "HONEYPOT"); var one = await s.instance.submit(form, { clientKey: "a" }); var two = await s.instance.submit(Object.assign({}, form, { email: "other@example.com" }), { clientKey: "a" }); assert.equal(one.statusCode, 202); assert.equal(two.statusCode, 429); });
test("generic adapters remain BLOCKED without configuration and never simulate success", async function () { var crm = adapters.createCrmAdapter({}, fetch); var email = adapters.createFlyerEmailAdapter({}, fetch); assert.equal((await crm.deliver({})).status, "BLOCKED"); assert.equal((await email.deliver({})).status, "BLOCKED"); });
test("persists the ordered schema, defaults interest, and survives service recreation", async function () {
  var dir = await fs.mkdtemp(path.join(os.tmpdir(), "vg-form-persist-"));
  var store = path.join(dir, "leads.jsonl");
  var first = createLeadService({ storePath: store, adapters: [] });
  var created = await first.submit({ name: "Mia", phone: "+1 305 555 0111", email: "mia@example.com", address: "9 Ink Ave", business: "Mia Studio" }, { clientKey: "persist-a" });
  assert.equal(created.statusCode, 202);
  assert.equal(created.lead.interest, "Printing");
  assert.equal(created.lead.owner, "Mike");
  var second = createLeadService({ storePath: store, adapters: [] });
  var duplicate = await second.submit({ name: "Mia", phone: "+1 305 555 0111", email: "mia@example.com", address: "9 Ink Ave", business: "Mia Studio" }, { clientKey: "persist-b" });
  assert.equal(duplicate.statusCode, 200);
  var persisted = (await fs.readFile(store, "utf8")).trim().split("\n").map(JSON.parse).filter(function (record) { return !record.type; });
  assert.equal(persisted.length, 1);
  assert.deepEqual(Object.keys(persisted[0]).slice(4, 11), ["name", "phone", "email", "address", "business", "interest", "owner"]);
});

test("persists BLOCKED delivery states when CRM and flyer webhooks are absent", async function () {
  var s = await service({ adapters: [adapters.createCrmAdapter({}, fetch), adapters.createFlyerEmailAdapter({}, fetch)] });
  var result = await s.instance.submit(form, { clientKey: "blocked-a" });
  assert.deepEqual(result.lead.delivery.map(function (item) { return item.status; }), ["BLOCKED", "BLOCKED"]);
  var stored = (await fs.readFile(s.store, "utf8")).trim().split("\n").map(JSON.parse)[0];
  assert.deepEqual(stored.delivery.map(function (item) { return item.status; }), ["BLOCKED", "BLOCKED"]);
});

test("retries configured delivery jobs and records final delivery state", async function () {
  var calls = 0;
  var s = await service({ retry: { maxAttempts: 3, retryDelayMs: 0 }, adapters: [{ channel: "crm", configured: true, deliver: async function () { calls += 1; return calls < 3 ? { status: "FAILED", reason: "temporary" } : { status: "DELIVERED", externalId: "crm-1" }; } }] });
  var result = await s.instance.submit(form, { clientKey: "retry-a" });
  assert.equal(result.lead.delivery[0].status, "QUEUED");
  await s.instance.flushDeliveries();
  assert.equal(calls, 3);
  var events = (await fs.readFile(s.store, "utf8")).trim().split("\n").map(JSON.parse).filter(function (record) { return record.type === "delivery"; });
  assert.equal(events[events.length - 1].status, "DELIVERED");
});

test("rejects missing ordered fields, bad contacts, and malformed idempotency keys", function () { var errors = validate({ name: "", phone: "12", email: "wrong", idempotencyKey: "short" }).errors; assert.ok(errors.length >= 6); assert.match(errors.join("|"), /address is required/); assert.match(errors.join("|"), /idempotencyKey is invalid/); });
test("field quick capture accepts one contact method without inventing address data", async function () { var s = await service(); var result = await s.instance.submit({ name: "Mia", phone: "3055550111", business: "Mia Studio", interest: "Menus" }, { clientKey: "quick", quickCapture: true }); assert.equal(result.statusCode, 202); assert.equal(result.lead.email, ""); assert.equal(result.lead.address, ""); });
