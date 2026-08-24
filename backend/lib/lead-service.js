"use strict";
var crypto = require("node:crypto"); var fs = require("node:fs/promises"); var path = require("node:path"); var MAX_TEXT = 4000;
function clean(value, limit) { return typeof value === "string" ? value.trim().slice(0, limit || MAX_TEXT) : ""; }
function phoneKey(value) { return clean(value, 64).replace(/[^0-9]/g, ""); }
function emailKey(value) { return clean(value, 254).toLowerCase(); }
function validate(input) {
  input = input && typeof input === "object" ? input : {};
  var lead = { name: clean(input.name, 160), phone: clean(input.phone, 64), email: emailKey(input.email), address: clean(input.address, 500), business: clean(input.business, 200), interest: clean(input.interest, 500), consent: input.consent === true, honeypot: clean(input.website, 200), idempotencyKey: clean(input.idempotencyKey, 128) };
  var errors = []; if (!lead.name) errors.push("name is required"); if (!lead.phone) errors.push("phone is required"); if (!lead.email) errors.push("email is required"); if (!lead.address) errors.push("address is required"); if (!lead.business) errors.push("business is required"); if (!lead.interest) errors.push("interest is required"); if (lead.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(lead.email)) errors.push("email is invalid"); if (lead.phone && phoneKey(lead.phone).length < 7) errors.push("phone is invalid"); if (lead.idempotencyKey && !/^[A-Za-z0-9_-]{16,128}$/.test(lead.idempotencyKey)) errors.push("idempotencyKey is invalid"); return { errors: errors, lead: lead };
}
function createLeadService(options) {
  var storePath = options.storePath, adapters = options.adapters || [], rateLimit = options.rateLimit || { max: 5, windowMs: 600000 }, rates = new Map(), queue = Promise.resolve();
  if (!storePath) throw new Error("storePath is required");
  async function rows() { try { return (await fs.readFile(storePath, "utf8")).trim().split("\n").filter(Boolean).map(JSON.parse); } catch (error) { if (error.code === "ENOENT") return []; throw error; } }
  async function append(record) { await fs.mkdir(path.dirname(storePath), { recursive: true }); await fs.appendFile(storePath, JSON.stringify(record) + "\n", { encoding: "utf8", mode: 0o600 }); }
  function dedupeKey(lead) { return [lead.name.toLowerCase(), phoneKey(lead.phone), lead.email].join("|"); }
  function limited(clientKey, now) { var current = (rates.get(clientKey) || []).filter(function (at) { return now - at < rateLimit.windowMs; }); if (current.length >= rateLimit.max) { rates.set(clientKey, current); return true; } current.push(now); rates.set(clientKey, current); return false; }
  async function submitInner(input, context) {
    context = context || {}; var checked = validate(input), now = Date.now();
    if (checked.lead.honeypot) return { ok: true, statusCode: 202, suppressed: "HONEYPOT" };
    if (checked.errors.length) return { ok: false, statusCode: 422, errors: checked.errors };
    var all = await rows(), existing;
    if (checked.lead.idempotencyKey) existing = all.find(function (x) { return x.type !== "delivery" && x.idempotencyKey === checked.lead.idempotencyKey; });
    if (!existing) { var key = dedupeKey(checked.lead); existing = all.find(function (x) { return x.type !== "delivery" && x.dedupeKey === key && now - Date.parse(x.receivedAt) < 86400000; }); }
    if (existing) return { ok: true, statusCode: 200, duplicate: true, lead: existing };
    if (limited(clean(context.clientKey, 160) || "unknown", now)) return { ok: false, statusCode: 429, errors: ["rate limit exceeded"] };
    var lead = { id: crypto.randomUUID(), receivedAt: new Date(now).toISOString(), updatedAt: new Date(now).toISOString(), status: "new", owner: "Mike", name: checked.lead.name, phone: checked.lead.phone, email: checked.lead.email, address: checked.lead.address, business: checked.lead.business, interest: checked.lead.interest, consent: checked.lead.consent, source: clean(context.source, 120) || "website", idempotencyKey: checked.lead.idempotencyKey || null, dedupeKey: dedupeKey(checked.lead), delivery: [] };
    await append(lead); for (var i = 0; i < adapters.length; i += 1) lead.delivery.push(await adapters[i].deliver(lead)); await append({ type: "delivery", leadId: lead.id, at: new Date().toISOString(), delivery: lead.delivery }); return { ok: true, statusCode: 202, lead: lead };
  }
  return { submit: function (input, context) { var work = queue.then(function () { return submitInner(input, context); }); queue = work.catch(function () {}); return work; } };
}
module.exports = { createLeadService: createLeadService, validate: validate };
