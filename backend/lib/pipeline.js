"use strict";

var PIPELINE_STATUSES = [
  "New",
  "Contacted",
  "Quoted",
  "Awaiting Artwork",
  "Awaiting Approval",
  "Payment Pending",
  "Paid",
  "In Production",
  "Ready",
  "Completed",
  "Lost"
];

var ALIASES = {
  new: "New",
  "follow up": "Contacted",
  followup: "Contacted",
  email: "Contacted",
  contacted: "Contacted",
  quoted: "Quoted",
  "awaiting artwork": "Awaiting Artwork",
  "awaiting approval": "Awaiting Approval",
  "payment pending": "Payment Pending",
  paid: "Paid",
  "in production": "In Production",
  ready: "Ready",
  completed: "Completed",
  lost: "Lost"
};

function normalizeStatus(value) {
  var raw = typeof value === "string" && value.trim() ? value.trim() : "New";
  var mapped = ALIASES[raw.toLowerCase()] || raw;
  if (PIPELINE_STATUSES.indexOf(mapped) === -1) {
    var error = new Error("lead status must be one of the admin pipeline columns");
    error.statusCode = 422;
    throw error;
  }
  return mapped;
}

function paidRequiresVerification(nextStatus, paymentVerified) {
  return nextStatus === "Paid" && paymentVerified !== true;
}

module.exports = {
  PIPELINE_STATUSES: PIPELINE_STATUSES,
  normalizeStatus: normalizeStatus,
  paidRequiresVerification: paidRequiresVerification
};
