"use strict";

function blocked(channel, reason) { return { channel: channel, status: "BLOCKED", reason: reason }; }
function safeError(error) { return error && error.message ? error.message.slice(0, 240) : "unknown delivery error"; }
function leadPayload(lead) { return { id: lead.id, receivedAt: lead.receivedAt, owner: lead.owner, name: lead.name, phone: lead.phone || "", email: lead.email || "", address: lead.address || "", business: lead.business || "", interest: lead.interest || "", source: lead.source }; }

function genericWebhook(channel, url, token, request) {
  if (!url) return { deliver: async function () { return blocked(channel, "No " + channel + " webhook URL is configured"); } };
  return { deliver: async function (lead) {
    try {
      var headers = { "content-type": "application/json" }; if (token) headers.authorization = "Bearer " + token;
      var response = await request(url, { method: "POST", headers: headers, body: JSON.stringify(leadPayload(lead)) });
      if (!response.ok) return { channel: channel, status: "FAILED", reason: "configured endpoint returned HTTP " + response.status };
      var body = await response.json().catch(function () { return {}; }); return { channel: channel, status: "DELIVERED", externalId: body.id || null };
    } catch (error) { return { channel: channel, status: "FAILED", reason: safeError(error) }; }
  } };
}

// URLs must be real, operator-owned relays. No vendor-specific CRM/email behavior is assumed.
function createCrmAdapter(env, request) { return genericWebhook("crm", env.VG_CRM_WEBHOOK_URL, env.VG_CRM_WEBHOOK_TOKEN, request); }
function createFlyerEmailAdapter(env, request) { return genericWebhook("flyer_email", env.VG_FLYER_EMAIL_WEBHOOK_URL, env.VG_FLYER_EMAIL_WEBHOOK_TOKEN, request); }
module.exports = { createCrmAdapter: createCrmAdapter, createFlyerEmailAdapter: createFlyerEmailAdapter, leadPayload: leadPayload };
