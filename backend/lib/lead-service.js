"use strict";

var crypto = require("node:crypto");
var fs = require("node:fs/promises");
var path = require("node:path");

var MAX_TEXT = 4000;
var DEDUPE_WINDOW_MS = 86400000;

function clean(value, limit) {
  return typeof value === "string" ? value.trim().slice(0, limit || MAX_TEXT) : "";
}

function phoneKey(value) {
  return clean(value, 64).replace(/[^0-9]/g, "");
}

function emailKey(value) {
  return clean(value, 254).toLowerCase();
}

function validate(input) {
  input = input && typeof input === "object" ? input : {};
  var lead = {
    name: clean(input.name, 160),
    phone: clean(input.phone, 64),
    email: emailKey(input.email),
    address: clean(input.address, 500),
    business: clean(input.business, 200),
    interest: clean(input.interest, 500) || "Printing",
    consent: input.consent === true,
    honeypot: clean(input.website, 200),
    idempotencyKey: clean(input.idempotencyKey, 128)
  };
  var errors = [];
  if (!lead.name) errors.push("name is required");
  if (!lead.phone) errors.push("phone is required");
  if (!lead.email) errors.push("email is required");
  if (!lead.address) errors.push("address is required");
  if (!lead.business) errors.push("business is required");
  if (lead.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(lead.email)) errors.push("email is invalid");
  if (lead.phone && phoneKey(lead.phone).length < 7) errors.push("phone is invalid");
  if (lead.idempotencyKey && !/^[A-Za-z0-9_-]{16,128}$/.test(lead.idempotencyKey)) errors.push("idempotencyKey is invalid");
  return { errors: errors, lead: lead };
}

function adapterChannel(adapter, index) {
  return clean(adapter && adapter.channel, 80) || "delivery_" + index;
}

function initialDelivery(adapter, index) {
  var channel = adapterChannel(adapter, index);
  if (adapter && adapter.configured === false) {
    return { channel: channel, status: "BLOCKED", reason: "No " + channel + " webhook URL is configured" };
  }
  return { channel: channel, status: "QUEUED", attempts: 0 };
}

function createLeadService(options) {
  options = options || {};
  var storePath = options.storePath;
  var adapters = options.adapters || [];
  var rateLimit = options.rateLimit || { max: 5, windowMs: 600000 };
  var retry = options.retry || { maxAttempts: 3, retryDelayMs: 250 };
  var rates = new Map();
  var submissionQueue = Promise.resolve();
  var deliveryQueue = Promise.resolve();
  var recoveryPromise;

  if (!storePath) throw new Error("storePath is required");

  async function rows() {
    try {
      var contents = await fs.readFile(storePath, "utf8");
      return contents.trim().split("\n").filter(Boolean).map(JSON.parse);
    } catch (error) {
      if (error.code === "ENOENT") return [];
      throw error;
    }
  }

  async function append(record) {
    await fs.mkdir(path.dirname(storePath), { recursive: true });
    await fs.appendFile(storePath, JSON.stringify(record) + "\n", { encoding: "utf8", mode: 0o600 });
  }

  function dedupeKey(lead) {
    return [lead.name.toLowerCase(), phoneKey(lead.phone), lead.email].join("|");
  }

  function limited(clientKey, now) {
    var current = (rates.get(clientKey) || []).filter(function (at) { return now - at < rateLimit.windowMs; });
    if (current.length >= rateLimit.max) {
      rates.set(clientKey, current);
      return true;
    }
    current.push(now);
    rates.set(clientKey, current);
    return false;
  }

  function scheduleDelivery(lead, adapter, index) {
    var task = deliveryQueue.then(function () { return deliverWithRetry(lead, adapter, index); });
    deliveryQueue = task.catch(function () {});
    return task;
  }

  function wait(ms) {
    return new Promise(function (resolve) { setTimeout(resolve, ms); });
  }

  async function deliverWithRetry(lead, adapter, index) {
    var channel = adapterChannel(adapter, index);
    var initial = lead.delivery[index] || initialDelivery(adapter, index);
    if (initial.status === "BLOCKED" || initial.status === "DELIVERED") return initial;

    var maxAttempts = Math.max(1, Number(retry.maxAttempts) || 3);
    var retryDelayMs = Math.max(0, Number(retry.retryDelayMs) || 0);
    var attempt = initial.status === "RETRYING" ? Number(initial.attempts || initial.attempt || 1) : Number(initial.attempts || 0) + 1;

    for (; attempt <= maxAttempts; attempt += 1) {
      await append({ type: "delivery", leadId: lead.id, channel: channel, at: new Date().toISOString(), attempt: attempt, status: "RETRYING" });
      var result;
      try {
        result = await adapter.deliver(lead, { attempt: attempt, maxAttempts: maxAttempts });
      } catch (_) {
        result = { channel: channel, status: "FAILED", reason: "delivery adapter failed" };
      }
      result = Object.assign({ channel: channel }, result || {});
      result.attempts = attempt;
      if (result.status === "DELIVERED" || result.status === "BLOCKED") {
        await append({ type: "delivery", leadId: lead.id, channel: channel, at: new Date().toISOString(), attempt: attempt, status: result.status, reason: result.reason, externalId: result.externalId || null });
        return result;
      }
      if (attempt >= maxAttempts) {
        result.status = "FAILED";
        await append({ type: "delivery", leadId: lead.id, channel: channel, at: new Date().toISOString(), attempt: attempt, status: "FAILED", reason: result.reason || "delivery failed" });
        return result;
      }
      await append({ type: "delivery", leadId: lead.id, channel: channel, at: new Date().toISOString(), attempt: attempt, status: "RETRYING", reason: result.reason || "delivery failed" });
      if (retryDelayMs) await wait(retryDelayMs * Math.pow(2, attempt - 1));
    }
    return { channel: channel, status: "FAILED", reason: "delivery failed", attempts: maxAttempts };
  }

  function latestDeliveryStates(records, lead) {
    var states = {};
    (lead.delivery || []).forEach(function (item) { states[item.channel] = item; });
    records.forEach(function (record) {
      if (record.type !== "delivery" || record.leadId !== lead.id) return;
      if (Array.isArray(record.delivery)) {
        record.delivery.forEach(function (item) { states[item.channel] = item; });
      } else if (record.channel) {
        states[record.channel] = record;
      }
    });
    return states;
  }

  async function recoverPending() {
    var all = await rows();
    var leads = all.filter(function (record) { return !record.type && record.id; });
    leads.forEach(function (lead) {
      var states = latestDeliveryStates(all, lead);
      adapters.forEach(function (adapter, index) {
        var state = states[adapterChannel(adapter, index)];
        if (!state || (state.status !== "QUEUED" && state.status !== "RETRYING")) return;
        var recoveredLead = Object.assign({}, lead, { delivery: [] });
        recoveredLead.delivery[index] = state;
        scheduleDelivery(recoveredLead, adapter, index);
      });
    });
  }

  async function submitInner(input, context) {
    context = context || {};
    var checked = validate(input);
    var now = Date.now();
    if (checked.lead.honeypot) return { ok: true, statusCode: 202, suppressed: "HONEYPOT" };
    if (checked.errors.length) return { ok: false, statusCode: 422, errors: checked.errors };
    if (limited(clean(context.clientKey, 160) || "unknown", now)) return { ok: false, statusCode: 429, errors: ["rate limit exceeded"] };

    var all = await rows();
    var existing;
    if (checked.lead.idempotencyKey) existing = all.find(function (record) { return record.type !== "delivery" && record.idempotencyKey === checked.lead.idempotencyKey; });
    if (!existing) {
      var key = dedupeKey(checked.lead);
      existing = all.find(function (record) { return record.type !== "delivery" && record.dedupeKey === key && now - Date.parse(record.receivedAt) < DEDUPE_WINDOW_MS; });
    }
    if (existing) return { ok: true, statusCode: 200, duplicate: true, lead: existing };

    var receivedAt = new Date(now).toISOString();
    var lead = {
      id: crypto.randomUUID(),
      receivedAt: receivedAt,
      updatedAt: receivedAt,
      status: "new",
      name: checked.lead.name,
      phone: checked.lead.phone,
      email: checked.lead.email,
      address: checked.lead.address,
      business: checked.lead.business,
      interest: checked.lead.interest,
      owner: "Mike",
      consent: checked.lead.consent,
      source: clean(context.source, 120) || "website",
      idempotencyKey: checked.lead.idempotencyKey || null,
      dedupeKey: dedupeKey(checked.lead),
      delivery: adapters.map(initialDelivery)
    };

    // This append is the acceptance boundary. Delivery cannot make a lead look accepted before it is durable.
    await append(lead);
    adapters.forEach(function (adapter, index) {
      if (lead.delivery[index].status !== "BLOCKED") scheduleDelivery(lead, adapter, index);
    });
    return { ok: true, statusCode: 202, lead: lead };
  }

  recoveryPromise = recoverPending().catch(function () {});

  return {
    submit: function (input, context) {
      var work = submissionQueue.then(function () { return submitInner(input, context); });
      submissionQueue = work.catch(function () {});
      return work;
    },
    flushDeliveries: async function () {
      await recoveryPromise;
      await deliveryQueue;
    },
    storePath: storePath
  };
}

module.exports = { createLeadService: createLeadService, validate: validate };
