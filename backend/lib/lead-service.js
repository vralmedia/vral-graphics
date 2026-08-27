"use strict";

var crypto = require("node:crypto");
var fs = require("node:fs/promises");
var path = require("node:path");
var pipeline = require("./pipeline");

var MAX_TEXT = 4000;
var DEDUPE_WINDOW_MS = 86400000;
var FOLLOW_UP_MS = 2 * 86400000;

function clean(value, limit) {
  return typeof value === "string" ? value.trim().slice(0, limit || MAX_TEXT) : "";
}

function phoneKey(value) {
  return clean(value, 64).replace(/[^0-9]/g, "");
}

function emailKey(value) {
  return clean(value, 254).toLowerCase();
}

function validate(input, options) {
  input = input && typeof input === "object" ? input : {};
  options = options || {};
  var lead = {
    name: clean(input.name, 160),
    phone: clean(input.phone, 64),
    email: emailKey(input.email),
    address: clean(input.address, 500),
    business: clean(input.business, 200),
    interest: clean(input.interest, 500) || "Printing",
    product: clean(input.product, 120),
    notes: clean(input.notes, 4000),
    language: clean(input.language, 8),
    campaign: clean(input.campaign, 120),
    referral: clean(input.referral, 120),
    action: clean(input.action, 80),
    consent: input.consent === true,
    honeypot: clean(input.website, 200),
    idempotencyKey: clean(input.idempotencyKey, 128)
  };
  var errors = [];
  if (!lead.name) errors.push("name is required");
  if (options.quickCapture) {
    if (!lead.phone && !lead.email) errors.push("phone or email is required");
  } else {
    if (!lead.phone) errors.push("phone is required");
    if (!lead.email) errors.push("email is required");
    if (!lead.address) errors.push("address is required");
  }
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
    var checked = validate(input, { quickCapture: context.quickCapture === true });
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
      owner: clean(context.owner, 80) || "Mike",
      consent: checked.lead.consent,
      consentAt: checked.lead.consent ? receivedAt : null,
      source: clean(context.source, 120) || "website",
      capturedBy: clean(context.capturedBy, 80) || null,
      product: checked.lead.product || null,
      notes: checked.lead.notes || null,
      language: checked.lead.language || clean(context.language, 8) || null,
      campaign: checked.lead.campaign || clean(context.campaign, 120) || null,
      referral: checked.lead.referral || clean(context.referral, 120) || null,
      action: checked.lead.action || clean(context.action, 80) || null,
      followUpDue: new Date(now + FOLLOW_UP_MS).toISOString(),
      paymentVerified: false,
      paymentEventId: null,
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

  function enqueue(work) {
    var task = submissionQueue.then(work);
    submissionQueue = task.catch(function () {});
    return task;
  }

  function publicLead(lead, events) {
    events = events || [];
    var status = pipeline.normalizeStatus(lead.status);
    var deliveryStates = latestDeliveryStates(events, lead);
    var delivery = Object.keys(deliveryStates).length
      ? Object.keys(deliveryStates).map(function (channel) { return deliveryStates[channel]; })
      : (lead.delivery || []);
    var audit = events.filter(function (record) {
      return record.leadId === lead.id && (record.type === "status" || record.type === "payment");
    });
    var lastStatus = audit.filter(function (record) { return record.type === "status"; }).pop();
    return {
      id: lead.id,
      receivedAt: lead.receivedAt,
      updatedAt: lead.updatedAt || (lastStatus && lastStatus.at) || lead.receivedAt,
      status: status,
      owner: lead.owner || "Mike",
      capturedBy: lead.capturedBy || null,
      name: lead.name,
      phone: lead.phone,
      email: lead.email,
      address: lead.address,
      business: lead.business,
      interest: lead.interest,
      product: lead.product || null,
      notes: lead.notes || null,
      language: lead.language || null,
      campaign: lead.campaign || null,
      referral: lead.referral || null,
      source: lead.source || "website",
      action: lead.action || null,
      followUpDue: lead.followUpDue || null,
      paymentVerified: lead.paymentVerified === true,
      paymentEventId: lead.paymentEventId || null,
      delivery: delivery,
      lastContactAt: (lastStatus && lastStatus.at) || lead.receivedAt,
      audit: audit,
      nextAction: nextActionFor(status, lead.paymentVerified === true)
    };
  }

  function nextActionFor(status, paymentVerified) {
    if (status === "New") return "Call or WhatsApp the business";
    if (status === "Contacted") return "Send a quote";
    if (status === "Quoted") return "Wait for approval or collect artwork";
    if (status === "Awaiting Artwork") return "Collect print-ready files";
    if (status === "Awaiting Approval") return "Send proof";
    if (status === "Payment Pending") return paymentVerified ? "Move after verified payment" : "Wait for verified payment webhook";
    if (status === "Paid") return "Release to production";
    if (status === "In Production") return "Print and finish";
    if (status === "Ready") return "Schedule pickup or delivery";
    if (status === "Completed") return "Follow up";
    if (status === "Lost") return "No further action";
    return "Review lead";
  }

  function hydrate(all) {
    var map = {};
    all.forEach(function (record) {
      if (!record) return;
      if (!record.type && record.id) {
        map[record.id] = { lead: record, events: [] };
        return;
      }
      if (record.leadId && map[record.leadId]) map[record.leadId].events.push(record);
    });
    Object.keys(map).forEach(function (id) {
      var entry = map[id];
      entry.events.forEach(function (record) {
        if (record.type === "status") {
          entry.lead.status = record.to;
          entry.lead.updatedAt = record.at;
        }
        if (record.type === "payment") {
          entry.lead.paymentVerified = true;
          entry.lead.paymentEventId = record.eventId || entry.lead.paymentEventId;
          entry.lead.updatedAt = record.at;
        }
      });
    });
    return map;
  }

  async function listInner(filter) {
    filter = filter || {};
    var all = await rows();
    var map = hydrate(all);
    var list = Object.keys(map).map(function (id) { return publicLead(map[id].lead, map[id].events.concat(all)); });
    if (filter.role !== "admin" && filter.owner) {
      list = list.filter(function (lead) { return lead.owner === filter.owner; });
    }
    list.sort(function (a, b) { return Date.parse(b.receivedAt) - Date.parse(a.receivedAt); });
    return list;
  }

  async function getInner(id) {
    var all = await rows();
    var map = hydrate(all);
    var entry = map[id];
    return entry ? publicLead(entry.lead, entry.events.concat(all)) : null;
  }

  async function updateStatusInner(id, status, actor) {
    var current = await getInner(id);
    if (!current) {
      var missing = new Error("lead not found");
      missing.statusCode = 404;
      throw missing;
    }
    var next = pipeline.normalizeStatus(status);
    if (pipeline.paidRequiresVerification(next, current.paymentVerified)) {
      var blocked = new Error("Paid requires a verified payment webhook");
      blocked.statusCode = 409;
      throw blocked;
    }
    if (current.status === next) return current;
    var at = new Date().toISOString();
    await append({ type: "status", leadId: id, from: current.status, to: next, at: at, actor: clean(actor, 80) || "ops" });
    return getInner(id);
  }

  async function markPaymentVerifiedInner(id, eventId) {
    eventId = clean(eventId, 160);
    if (!eventId) {
      var invalid = new Error("payment eventId is required");
      invalid.statusCode = 400;
      throw invalid;
    }
    var current = await getInner(id);
    if (!current) {
      var missing = new Error("lead not found");
      missing.statusCode = 404;
      throw missing;
    }
    var at = new Date().toISOString();
    if (current.paymentVerified !== true) {
      await append({ type: "payment", leadId: id, eventId: eventId, at: at, verified: true, actor: "payment-webhook" });
    }
    if (current.status !== "Paid") {
      await append({ type: "status", leadId: id, from: current.status, to: "Paid", at: at, actor: "payment-webhook" });
    }
    return getInner(id);
  }

  recoveryPromise = recoverPending().catch(function () {});

  return {
    submit: function (input, context) {
      return enqueue(function () { return submitInner(input, context); });
    },
    list: function (filter) {
      return enqueue(function () { return listInner(filter); });
    },
    get: function (id) {
      return enqueue(function () { return getInner(id); });
    },
    updateStatus: function (id, status, actor) {
      return enqueue(function () { return updateStatusInner(id, status, actor); });
    },
    markPaymentVerified: function (id, eventId) {
      return enqueue(function () { return markPaymentVerifiedInner(id, eventId); });
    },
    flushDeliveries: async function () {
      await recoveryPromise;
      await deliveryQueue;
    },
    storePath: storePath
  };
}

module.exports = { createLeadService: createLeadService, validate: validate, PIPELINE_STATUSES: pipeline.PIPELINE_STATUSES };
