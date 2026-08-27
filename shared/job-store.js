(function (w) {
  "use strict";

  var DRAFT_KEY = "vral-print-job-draft-v1";
  var ACTIVE_KEY = "vral-active-print-job-v1";
  var SAFE_DRAFT = ["product", "sku", "goal", "quantity", "size", "sides", "folding", "width", "height", "install", "artwork", "timing", "neededBy", "fulfillment", "language", "source", "campaign", "rep_id"];

  function read(key) {
    try { return JSON.parse(sessionStorage.getItem(key) || "null"); }
    catch (_) { return null; }
  }

  function write(key, value) {
    try { sessionStorage.setItem(key, JSON.stringify(value)); return true; }
    catch (_) { return false; }
  }

  function draftFrom(source) {
    var next = {};
    SAFE_DRAFT.forEach(function (key) {
      if (source && source[key] !== "" && source[key] != null) next[key] = source[key];
    });
    next.updatedAt = new Date().toISOString();
    return next;
  }

  function saveDraft(source) {
    var current = read(DRAFT_KEY) || {};
    var next = Object.assign({}, current, draftFrom(source));
    write(DRAFT_KEY, next);
    w.dispatchEvent(new CustomEvent("vral:job-draft", { detail: next }));
    return next;
  }

  function loadDraft() { return read(DRAFT_KEY) || {}; }

  function recordAccepted(response, state, label) {
    if (!response || !response.id) return null;
    var now = response.receivedAt || new Date().toISOString();
    var job = {
      id: response.id,
      shortId: String(response.id).slice(0, 8).toUpperCase(),
      status: "request_received",
      product: state.product || "",
      productLabel: label || state.product || "Print request",
      sku: state.sku || "",
      quantity: state.quantity || "",
      artwork: state.artwork || "",
      fulfillment: state.fulfillment || "",
      createdAt: now,
      updatedAt: now,
      nextAction: "human_confirmation",
      trackingToken: response.trackingToken || "",
      events: [
        { type: "request_received", at: now, label: "Request received" },
        { type: "human_review", at: null, label: "Vral review" },
        { type: "proof", at: null, label: "Proof approval" },
        { type: "production", at: null, label: "Production" },
        { type: "fulfillment", at: null, label: "Ready / delivered" }
      ]
    };
    write(ACTIVE_KEY, job);
    w.dispatchEvent(new CustomEvent("vral:job-accepted", { detail: job }));
    return job;
  }

  function active() { return read(ACTIVE_KEY); }
  function updateActive(patch) {
    var current = active();
    if (!current) return null;
    var next = Object.assign({}, current, patch || {}, { updatedAt: patch && patch.updatedAt || new Date().toISOString() });
    write(ACTIVE_KEY, next);
    w.dispatchEvent(new CustomEvent("vral:job-updated", { detail: next }));
    return next;
  }
  function clearDraft() { try { sessionStorage.removeItem(DRAFT_KEY); } catch (_) {} }

  w.VralJobStore = {
    saveDraft: saveDraft,
    loadDraft: loadDraft,
    recordAccepted: recordAccepted,
    active: active,
    updateActive: updateActive,
    clearDraft: clearDraft
  };
})(window);
