"use strict";

var crypto = require("node:crypto");
var fs = require("node:fs/promises");
var path = require("node:path");

var DEFAULT_FLYER_PATH = "/Users/seujao/Downloads/PHOTO-2026-08-22-17-28-58.jpg";
var DEFAULT_OUTBOX_PATH = path.resolve(__dirname, "../../delivery/outbox");
var DEFAULT_TEST_RECIPIENT = "mike+test@example.test";
var FLYER_FILENAME = "PHOTO-2026-08-22-17-28-58.jpg";

function text(value, limit) {
  return typeof value === "string" ? value.trim().slice(0, limit || 4000) : "";
}

function leadPayload(lead) {
  lead = lead || {};
  return {
    id: lead.id,
    receivedAt: lead.receivedAt,
    owner: lead.owner,
    name: lead.name,
    phone: lead.phone || "",
    email: lead.email || "",
    address: lead.address || "",
    business: lead.business || "",
    interest: lead.interest || "",
    source: lead.source
  };
}

function blocked(channel, reason) {
  return { channel: channel, status: "BLOCKED", reason: reason };
}

function configured(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function responseBody(response) {
  return response && typeof response.json === "function" ? response.json().catch(function () { return {}; }) : Promise.resolve({});
}

function genericWebhook(channel, url, token, request, absentReason) {
  if (!configured(url)) {
    return {
      channel: channel,
      configured: false,
      deliver: async function () { return blocked(channel, absentReason || ("No " + channel + " endpoint is configured")); }
    };
  }
  return {
    channel: channel,
    configured: true,
    deliver: async function (lead) {
      try {
        var headers = { "content-type": "application/json" };
        if (configured(token)) headers.authorization = "Bearer " + token;
        var response = await request(url, { method: "POST", headers: headers, body: JSON.stringify(leadPayload(lead)) });
        if (!response || !response.ok) return { channel: channel, status: "FAILED", reason: "configured endpoint returned HTTP " + (response && response.status || "unknown") };
        var body = await responseBody(response);
        return { channel: channel, status: "DELIVERED", externalId: body.id || body.messageId || null };
      } catch (_) {
        return { channel: channel, status: "FAILED", reason: "delivery request failed" };
      }
    }
  };
}

function flyerPath(env) {
  return text(env.VG_FLYER_PATH, 1000) || DEFAULT_FLYER_PATH;
}

function outboxPath(env) {
  return text(env.VG_OUTBOX_DIR, 1000) || DEFAULT_OUTBOX_PATH;
}

function safeTestRecipient(address) {
  address = text(address, 254).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+$/.test(address)) return false;
  var parts = address.split("@");
  var local = parts[0];
  var domain = parts[1];
  return local.indexOf("+test") !== -1 || domain === "example.test" || domain === "example.invalid" || domain === "test.invalid" || domain === "localhost";
}

function header(value) {
  return text(value, 500).replace(/[\r\n]+/g, " ");
}

function htmlEscape(value) {
  return String(value == null ? "" : value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function leadSubject(lead) {
  return "[SANDBOX] New Vral Graphics lead for Mike — " + (text(lead.business, 120) || text(lead.name, 120) || "unnamed business");
}

function messageText(lead) {
  var payload = leadPayload(lead);
  return [
    "SANDBOX — no email was sent to the prospect or customer.",
    "This local message is a delivery proof for Mike.",
    "",
    "Lead ID: " + payload.id,
    "Owner: " + payload.owner,
    "Name: " + payload.name,
    "Phone: " + payload.phone,
    "Prospect email (reply address only; not contacted): " + payload.email,
    "Address: " + payload.address,
    "Business: " + payload.business,
    "Interest: " + payload.interest,
    "Source: " + payload.source
  ].join("\n");
}

function boundary() {
  return "vg_" + crypto.randomBytes(12).toString("hex");
}

function buildEml(lead, recipient, flyer) {
  var mimeBoundary = boundary();
  var body = messageText(lead);
  var html = body.split("\n").map(function (line) { return htmlEscape(line) || "<br>"; }).join("<br>\n");
  var encoded = flyer.data.toString("base64").replace(/.{1,76}/g, "$&\r\n");
  return [
    "From: " + header("Vral Graphics Sandbox <" + (recipient || DEFAULT_TEST_RECIPIENT) + ">"),
    "To: " + header(recipient),
    "Subject: " + header(leadSubject(lead)),
    "Date: " + new Date().toUTCString(),
    "Message-ID: <" + crypto.randomUUID() + "@vral-graphics.sandbox>",
    "X-VG-Delivery-Mode: SANDBOX",
    "X-VG-Sandbox: true",
    "MIME-Version: 1.0",
    "Content-Type: multipart/mixed; boundary=\"" + mimeBoundary + "\"",
    "",
    "--" + mimeBoundary,
    "Content-Type: multipart/alternative; boundary=\"" + mimeBoundary + "_alt\"",
    "",
    "--" + mimeBoundary + "_alt",
    "Content-Type: text/plain; charset=utf-8",
    "Content-Transfer-Encoding: 8bit",
    "",
    body,
    "",
    "--" + mimeBoundary + "_alt",
    "Content-Type: text/html; charset=utf-8",
    "Content-Transfer-Encoding: 8bit",
    "",
    "<p>" + html + "</p>",
    "",
    "--" + mimeBoundary + "_alt--",
    "",
    "--" + mimeBoundary,
    "Content-Type: image/jpeg; name=\"" + FLYER_FILENAME + "\"",
    "Content-Disposition: attachment; filename=\"" + FLYER_FILENAME + "\"",
    "Content-Transfer-Encoding: base64",
    "",
    encoded,
    "",
    "--" + mimeBoundary + "--",
    ""
  ].join("\r\n");
}

async function readFlyer(env) {
  var file = flyerPath(env);
  try {
    var data = await fs.readFile(file);
    return { path: file, data: data };
  } catch (error) {
    return { error: "flyer attachment unavailable at configured path", detail: error.code || "read failed" };
  }
}

function providerConfig(env) {
  var provider = text(env.VG_EMAIL_PROVIDER, 40).toLowerCase();
  if (!provider && configured(env.VG_RESEND_API_KEY || env.RESEND_API_KEY)) provider = "resend";
  if (!provider && configured(env.VG_POSTMARK_SERVER_TOKEN || env.POSTMARK_SERVER_TOKEN)) provider = "postmark";
  if (!provider && configured(env.VG_SENDGRID_API_KEY || env.SENDGRID_API_KEY)) provider = "sendgrid";
  return {
    provider: provider,
    apiKey: env.VG_RESEND_API_KEY || env.RESEND_API_KEY || env.VG_SENDGRID_API_KEY || env.SENDGRID_API_KEY || "",
    postmarkToken: env.VG_POSTMARK_SERVER_TOKEN || env.POSTMARK_SERVER_TOKEN || "",
    from: text(env.VG_EMAIL_FROM, 254),
    to: text(env.VG_EMAIL_TEST_TO || env.VG_MIKE_EMAIL, 254)
  };
}

function providerRequest(config, lead, flyer, request) {
  var recipient = config.to;
  var subject = leadSubject(lead).replace(/^\[SANDBOX\] /, "[TEST] ");
  var body = messageText(lead).replace(/^SANDBOX — no email was sent to the prospect or customer\.\n/, "TEST MODE — recipient is an approved test inbox; the prospect was not contacted.\n");
  var encoded = flyer.data.toString("base64");
  if (config.provider === "resend") {
    return request("https://api.resend.com/emails", {
      method: "POST",
      headers: { authorization: "Bearer " + config.apiKey, "content-type": "application/json" },
      body: JSON.stringify({ from: config.from, to: [recipient], subject: subject, text: body, attachments: [{ filename: FLYER_FILENAME, content: encoded }] })
    });
  }
  if (config.provider === "postmark") {
    return request("https://api.postmarkapp.com/email", {
      method: "POST",
      headers: { "X-Postmark-Server-Token": config.postmarkToken, "content-type": "application/json" },
      body: JSON.stringify({ From: config.from, To: recipient, Subject: subject, TextBody: body, Attachments: [{ Name: FLYER_FILENAME, Content: encoded, ContentType: "image/jpeg" }] })
    });
  }
  if (config.provider === "sendgrid") {
    return request("https://api.sendgrid.com/v3/mail/send", {
      method: "POST",
      headers: { authorization: "Bearer " + config.apiKey, "content-type": "application/json" },
      body: JSON.stringify({ personalizations: [{ to: [{ email: recipient }] }], from: { email: config.from }, subject: subject, content: [{ type: "text/plain", value: body }], attachments: [{ content: encoded, type: "image/jpeg", filename: FLYER_FILENAME, disposition: "attachment" }] })
    });
  }
  return null;
}

async function sandboxEmail(env, lead, recipient, flyer) {
  var directory = outboxPath(env);
  await fs.mkdir(directory, { recursive: true, mode: 0o700 });
  var safeId = text(lead && lead.id, 80).replace(/[^A-Za-z0-9_-]/g, "_") || crypto.randomUUID();
  var filename = safeId + "-attempt-" + String(Date.now()) + ".eml";
  var destination = path.join(directory, filename);
  await fs.writeFile(destination, buildEml(lead, recipient, flyer), { encoding: "utf8", mode: 0o600, flag: "wx" });
  return { channel: "flyer_email", status: "DELIVERED", externalId: "SANDBOX:" + filename, reason: "SANDBOX outbox written; no network email sent" };
}

function createCrmAdapter(env, request) {
  env = env || process.env;
  request = request || fetch;
  // A cloud/operator-owned relay is the only supported CRM write. Without it,
  // report BLOCKED honestly; the lead-service will not claim a CRM delivery.
  return genericWebhook("crm", env.VG_CRM_WEBHOOK_URL, env.VG_CRM_WEBHOOK_TOKEN, request, "No CLOUD CRM store or operator-owned CRM relay is configured");
}

function createFlyerEmailAdapter(env, request) {
  env = env || process.env;
  request = request || fetch;
  var hasDeliveryConfig = configured(env.VG_DELIVERY_MODE) || configured(env.VG_FLYER_PATH) || configured(env.VG_OUTBOX_DIR) || configured(env.VG_EMAIL_TEST_TO) || configured(env.VG_MIKE_EMAIL) || configured(env.VG_EMAIL_PROVIDER) || configured(env.VG_RESEND_API_KEY || env.RESEND_API_KEY) || configured(env.VG_POSTMARK_SERVER_TOKEN || env.POSTMARK_SERVER_TOKEN) || configured(env.VG_SENDGRID_API_KEY || env.SENDGRID_API_KEY);
  if (!hasDeliveryConfig) {
    return {
      channel: "flyer_email",
      configured: false,
      deliver: async function () { return blocked("flyer_email", "No email provider or local SANDBOX delivery is configured"); }
    };
  }
  var mode = text(env.VG_DELIVERY_MODE, 40).toLowerCase() || "sandbox";
  var recipient = text(env.VG_EMAIL_TEST_TO || env.VG_MIKE_EMAIL, 254) || DEFAULT_TEST_RECIPIENT;
  var config = providerConfig(env);
  var providerReady = mode === "provider" && ["resend", "postmark", "sendgrid"].indexOf(config.provider) !== -1 && configured(config.from) && safeTestRecipient(recipient);
  return {
    channel: "flyer_email",
    configured: true,
    deliver: async function (lead) {
      var flyer = await readFlyer(env);
      if (flyer.error) return { channel: "flyer_email", status: "FAILED", reason: flyer.error + " (" + flyer.detail + ")" };
      if (!providerReady) return sandboxEmail(env, lead, recipient, flyer);
      try {
        var response = await providerRequest(config, lead, flyer, request);
        if (!response || !response.ok) return { channel: "flyer_email", status: "FAILED", reason: "test provider returned HTTP " + (response && response.status || "unknown") };
        var body = await responseBody(response);
        return { channel: "flyer_email", status: "DELIVERED", externalId: body.id || body.MessageID || null, reason: "TEST provider accepted message; approved test recipient only" };
      } catch (_) {
        return { channel: "flyer_email", status: "FAILED", reason: "test provider request failed" };
      }
    }
  };
}

module.exports = {
  createCrmAdapter: createCrmAdapter,
  createFlyerEmailAdapter: createFlyerEmailAdapter,
  leadPayload: leadPayload,
  safeTestRecipient: safeTestRecipient,
  buildEml: buildEml
};
