"use strict";

var RULES = {
  request_received: [
    { type: "sync_crm", owner: "System", integration: "crm", human: false },
    { type: "assign_follow_up", owner: "Mike", dueMinutes: 240, human: false },
    { type: "send_received_message", owner: "System", integration: "email_or_whatsapp", human: false }
  ],
  quote_sent: [
    { type: "schedule_quote_follow_up", owner: "Mike", dueMinutes: 2880, human: false }
  ],
  artwork_stored: [
    { type: "preflight_artwork", owner: "Design", dueMinutes: 480, human: true }
  ],
  proof_sent: [
    { type: "schedule_proof_reminder", owner: "System", dueMinutes: 1440, human: false }
  ],
  proof_approved: [
    { type: "prepare_payment_request", owner: "Operations", integration: "quickbooks", human: true }
  ],
  payment_verified: [
    { type: "release_production", owner: "Operations", human: true }
  ],
  production_complete: [
    { type: "coordinate_fulfillment", owner: "Operations", human: true }
  ],
  fulfillment_complete: [
    { type: "schedule_customer_follow_up", owner: "Mike", dueMinutes: 2880, human: false }
  ]
};

function idempotency(jobId, eventId, type) {
  return [jobId || "job", eventId || "event", type].join(":");
}

function plan(event, job, connections, now) {
  event = event || {};
  job = job || {};
  connections = connections || {};
  now = Number.isFinite(now) ? now : Date.now();
  return (RULES[event.type] || []).map(function (rule) {
    var connection = rule.integration ? connections[rule.integration] : null;
    var blocked = Boolean(rule.integration && (!connection || connection.status !== "connected"));
    return {
      type: rule.type,
      owner: rule.owner,
      status: blocked ? "blocked" : (rule.human ? "waiting_human" : "queued"),
      requiresHumanConfirmation: rule.human === true,
      dueAt: rule.dueMinutes ? new Date(now + rule.dueMinutes * 60000).toISOString() : null,
      integration: rule.integration || null,
      blockedReason: blocked ? "integration_not_connected" : null,
      idempotencyKey: idempotency(job.id, event.id, rule.type)
    };
  });
}

module.exports = { RULES: RULES, plan: plan, idempotency: idempotency };
