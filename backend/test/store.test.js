"use strict";

var assert = require("node:assert/strict");
var fs = require("node:fs/promises");
var os = require("node:os");
var path = require("node:path");
var test = require("node:test");
var store = require("../lib/store");

var lead = { id: "7d4a3f32-95be-4d3a-92cc-3d9d625fae81", name: "Ava", phone: "3055550100", email: "ava@example.com", address: "123 Main St", business: "Ava Co", idempotencyKey: "same-key-0000001" };

test("uses explicitly labeled SANDBOX JSONL fallback when cloud credentials are absent", async function () {
  var directory = await fs.mkdtemp(path.join(os.tmpdir(), "vg-store-"));
  var file = path.join(directory, "leads.jsonl");
  var created = await store.persistLead(lead, { env: {}, storePath: file });
  assert.equal(created.persistence, "SANDBOX");
  assert.equal(created.owner, "Mike");
  assert.equal(created.interest, "Printing");
  assert.equal(created.status, "New");
  assert.equal((await store.getLead(lead.id, { env: {}, storePath: file })).id, lead.id);
});

test("does not silently downgrade a configured Lovable Cloud URL to JSONL", async function () {
  var instance = store.createStore({ env: { LOVABLE_CLOUD_URL: "https://example.lovable.app" }, storePath: "/tmp/should-not-be-used.jsonl" });
  assert.equal(instance.mode, "CLOUD_REST");
  await assert.rejects(function () { return instance.persistLead(lead); }, /service-role key is missing/);
});
