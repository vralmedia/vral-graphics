"use strict";

var ACTIVE_STAGES = [
  "New", "Contacted", "Quoted", "Awaiting Artwork", "Awaiting Approval",
  "Payment Pending", "Paid", "In Production", "Ready"
];

function asTime(value) {
  var time = Date.parse(value || "");
  return Number.isFinite(time) ? time : 0;
}

function nextAction(job) {
  var status = job && job.status || "New";
  if (status === "New") return { code: "contact_customer", label: "Contact the customer", owner: job.owner || "Mike" };
  if (status === "Contacted") return { code: "prepare_quote", label: "Prepare the quote", owner: "Operations" };
  if (status === "Quoted") return { code: "confirm_quote", label: "Confirm quote and artwork", owner: job.owner || "Operations" };
  if (status === "Awaiting Artwork") return { code: "collect_artwork", label: "Collect artwork", owner: job.owner || "Operations" };
  if (status === "Awaiting Approval") return { code: "collect_approval", label: "Get proof approval", owner: job.owner || "Operations" };
  if (status === "Payment Pending") return { code: "verify_payment", label: "Wait for verified payment", owner: "System" };
  if (status === "Paid") return { code: "release_production", label: "Release to production", owner: "Operations" };
  if (status === "In Production") return { code: "finish_production", label: "Complete production", owner: "Production" };
  if (status === "Ready") return { code: "fulfill", label: "Coordinate pickup or delivery", owner: "Operations" };
  if (status === "Completed") return { code: "follow_up", label: "Follow up after delivery", owner: job.owner || "Operations" };
  return { code: "none", label: "No action", owner: job.owner || "Operations" };
}

function deliveryExceptions(job) {
  var rows = [];
  (job.delivery || []).forEach(function (delivery) {
    if (delivery.status !== "BLOCKED" && delivery.status !== "FAILED") return;
    rows.push({
      code: delivery.status === "FAILED" ? "integration_failed" : "integration_blocked",
      severity: delivery.status === "FAILED" ? "high" : "medium",
      label: delivery.status === "FAILED" ? "Delivery integration failed" : "Delivery integration is not configured",
      detail: delivery.channel || "integration"
    });
  });
  return rows;
}

function exceptionsFor(job, now) {
  now = Number.isFinite(now) ? now : Date.now();
  var rows = deliveryExceptions(job);
  if (job.followUpDue && asTime(job.followUpDue) < now && job.status !== "Completed" && job.status !== "Lost") {
    rows.push({ code: "follow_up_overdue", severity: "high", label: "Follow-up is overdue", detail: job.followUpDue });
  }
  if (job.status === "Awaiting Artwork") rows.push({ code: "artwork_missing", severity: "medium", label: "Artwork is still needed", detail: "" });
  if (job.status === "Awaiting Approval") rows.push({ code: "approval_waiting", severity: "medium", label: "Customer approval is still needed", detail: "" });
  if (job.status === "Payment Pending" && job.paymentVerified !== true) rows.push({ code: "payment_unverified", severity: "high", label: "Payment is not verified", detail: "" });
  return rows.map(function (row) { return Object.assign({ jobId: job.id }, row); });
}

function customerKey(job) {
  return String(job.organizationId || job.business || job.email || job.phone || job.name || "unknown").toLowerCase();
}

function buildCustomers(jobs) {
  var groups = {};
  jobs.forEach(function (job) {
    var key = customerKey(job);
    if (!groups[key]) groups[key] = { id: job.organizationId || null, name: job.business || job.name || "Unknown", jobs: [], active: 0 };
    groups[key].jobs.push(job.id);
    if (ACTIVE_STAGES.indexOf(job.status) !== -1) groups[key].active += 1;
  });
  return Object.keys(groups).map(function (key) { return groups[key]; }).sort(function (a, b) { return a.name.localeCompare(b.name); });
}

function snapshot(jobs, now) {
  jobs = Array.isArray(jobs) ? jobs.slice() : [];
  now = Number.isFinite(now) ? now : Date.now();
  jobs.sort(function (a, b) { return asTime(b.updatedAt || b.receivedAt) - asTime(a.updatedAt || a.receivedAt); });
  var exceptions = [];
  jobs.forEach(function (job) {
    if (!job.nextAction || typeof job.nextAction !== "object") job.nextAction = nextAction(job);
    exceptions = exceptions.concat(exceptionsFor(job, now));
  });
  var pipeline = {};
  jobs.forEach(function (job) { pipeline[job.status || "New"] = (pipeline[job.status || "New"] || 0) + 1; });
  return {
    generatedAt: new Date(now).toISOString(),
    metrics: {
      needsAttention: exceptions.filter(function (item) { return item.severity === "high"; }).length,
      exceptions: exceptions.length,
      newRequests: pipeline.New || 0,
      inProgress: jobs.filter(function (job) { return ACTIVE_STAGES.indexOf(job.status) > 0 && job.status !== "Ready"; }).length,
      ready: pipeline.Ready || 0,
      active: jobs.filter(function (job) { return ACTIVE_STAGES.indexOf(job.status) !== -1; }).length
    },
    exceptions: exceptions,
    jobs: jobs,
    customers: buildCustomers(jobs),
    pipeline: pipeline
  };
}

module.exports = {
  ACTIVE_STAGES: ACTIVE_STAGES,
  nextAction: nextAction,
  exceptionsFor: exceptionsFor,
  snapshot: snapshot
};
