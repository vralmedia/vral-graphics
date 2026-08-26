"use strict";

var crypto = require("node:crypto");
var http = require("node:http");
var path = require("node:path");
var adapters = require("./lib/adapters");
var createLeadService = require("./lib/lead-service").createLeadService;
var createAuth = require("./lib/auth").createAuth;
var PIPELINE_STATUSES = require("./lib/pipeline").PIPELINE_STATUSES;

function reply(res, code, body, origin, extraHeaders) {
  var headers = { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", vary: "Origin" };
  if (origin) headers["access-control-allow-origin"] = origin;
  if (extraHeaders) Object.keys(extraHeaders).forEach(function (key) { headers[key] = extraHeaders[key]; });
  res.writeHead(code, headers);
  res.end(JSON.stringify(body));
}

function httpError(message, statusCode) {
  var error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function validBearer(header, secret) {
  if (typeof header !== "string" || typeof secret !== "string") return false;
  var supplied = Buffer.from(header), expected = Buffer.from("Bearer " + secret);
  return supplied.length === expected.length && crypto.timingSafeEqual(supplied, expected);
}

function readJson(req) {
  return new Promise(function (resolve, reject) {
    var bytes = 0, chunks = [], finished = false;
    req.on("data", function (chunk) {
      if (finished) return;
      bytes += chunk.length;
      if (bytes > 65536) {
        finished = true;
        reject(httpError("body too large", 413));
        req.destroy();
      } else chunks.push(chunk);
    });
    req.on("end", function () {
      if (finished) return;
      try { resolve(JSON.parse(Buffer.concat(chunks).toString("utf8") || "null")); } catch (_) { reject(httpError("invalid JSON", 400)); }
    });
    req.on("error", reject);
  });
}

function pathnameOf(req) {
  try { return new URL(req.url, "http://127.0.0.1").pathname; } catch (_) { return req.url || ""; }
}

function publicOrigin(env) {
  return env.VG_PUBLIC_ORIGIN || env.VG_FORM_ALLOWED_ORIGIN || "";
}

function createServer(options) {
  options = options || {};
  var env = options.env || process.env, request = options.request || fetch;
  var defaultStorePath = path.join(__dirname, "data", "leads.jsonl");
  var service = options.service || createLeadService({
    storePath: path.resolve(env.LEAD_STORE_PATH || defaultStorePath),
    retry: { maxAttempts: Number(env.VG_DELIVERY_MAX_ATTEMPTS || 3), retryDelayMs: Number(env.VG_DELIVERY_RETRY_DELAY_MS || 250) },
    adapters: [adapters.createCrmAdapter(env, request), adapters.createFlyerEmailAdapter(env, request)]
  });
  var auth = options.auth || createAuth(env);

  function allowedOrigin(req) {
    return env.VG_FORM_ALLOWED_ORIGIN && req.headers.origin === env.VG_FORM_ALLOWED_ORIGIN ? env.VG_FORM_ALLOWED_ORIGIN : "";
  }

  function sameOrigin(req) {
    var allowed = publicOrigin(env);
    if (!allowed) return { blocked: true };
    var origin = req.headers.origin;
    if (origin) return origin === allowed ? { origin: allowed } : { forbidden: true };
    var site = String(req.headers["sec-fetch-site"] || "");
    if (site === "same-origin" || site === "same-site") return { origin: allowed };
    var referer = String(req.headers.referer || "");
    if (referer === allowed || referer.indexOf(allowed + "/") === 0) return { origin: allowed };
    return { forbidden: true };
  }

  function clientKey(req) {
    var forwarded = env.VG_TRUST_PROXY === "true" ? String(req.headers["x-forwarded-for"] || "").split(",")[0].trim() : "";
    return forwarded || req.socket.remoteAddress || "unknown";
  }

  function requireSession(req, res, origin) {
    var session = auth.read(req.headers.cookie);
    if (!session) {
      reply(res, 401, { error: "login required" }, origin);
      return null;
    }
    return session;
  }

  function acceptLead(result, origin, res) {
    if (!result.ok) return reply(res, result.statusCode, { error: "validation failed", details: result.errors }, origin);
    if (result.suppressed) return reply(res, result.statusCode, { accepted: true }, origin);
    return reply(res, result.statusCode, {
      id: result.lead.id,
      receivedAt: result.lead.receivedAt,
      owner: result.lead.owner,
      persistence: result.duplicate ? "DUPLICATE" : "RECORDED",
      delivery: result.lead.delivery,
      followUpDue: result.lead.followUpDue || null,
      status: result.lead.status
    }, origin);
  }

  return http.createServer(async function (req, res) {
    var pathname = pathnameOf(req);
    var leadsOrigin = allowedOrigin(req);

    if (req.method === "OPTIONS" && pathname === "/api/leads") {
      if (!leadsOrigin) return reply(res, 403, { error: "origin not allowed" });
      res.writeHead(204, {
        "access-control-allow-origin": leadsOrigin,
        "access-control-allow-methods": "POST, OPTIONS",
        "access-control-allow-headers": "content-type, authorization",
        vary: "Origin"
      });
      return res.end();
    }

    if (req.method === "OPTIONS" && pathname === "/api/print-requests") {
      var preflight = sameOrigin(req);
      if (preflight.blocked) return reply(res, 503, { error: "BLOCKED: public origin is not configured" });
      if (preflight.forbidden) return reply(res, 403, { error: "origin not allowed" });
      res.writeHead(204, {
        "access-control-allow-origin": preflight.origin,
        "access-control-allow-methods": "POST, OPTIONS",
        "access-control-allow-headers": "content-type",
        vary: "Origin"
      });
      return res.end();
    }

    if (req.method === "POST" && pathname === "/api/leads") {
      if (!env.VG_FORM_ALLOWED_ORIGIN) return reply(res, 503, { error: "BLOCKED: allowed origin is not configured" });
      if (!leadsOrigin) return reply(res, 403, { error: "origin not allowed" });
      if (!env.VG_FORM_API_KEY) return reply(res, 503, { error: "BLOCKED: server authentication is not configured" }, leadsOrigin);
      if (!validBearer(req.headers.authorization, env.VG_FORM_API_KEY)) return reply(res, 401, { error: "unauthorized" }, leadsOrigin);
      if (!/^application\/json(?:\s*;|$)/i.test(req.headers["content-type"] || "")) return reply(res, 415, { error: "content-type must be application/json" }, leadsOrigin);
      try {
        var forwarded = env.VG_TRUST_PROXY === "true" ? String(req.headers["x-forwarded-for"] || "").split(",")[0].trim() : "";
        var result = await service.submit(await readJson(req), { source: req.headers.origin || "direct", clientKey: forwarded || req.socket.remoteAddress || "unknown" });
        return acceptLead(result, leadsOrigin, res);
      } catch (error) {
        return reply(res, error.statusCode || 500, { error: error.statusCode ? error.message : "lead was not recorded" }, leadsOrigin);
      }
    }

    if (req.method === "POST" && pathname === "/api/print-requests") {
      var gate = sameOrigin(req);
      if (gate.blocked) return reply(res, 503, { error: "BLOCKED: public origin is not configured" });
      if (gate.forbidden) return reply(res, 403, { error: "origin not allowed" }, "");
      if (!/^application\/json(?:\s*;|$)/i.test(req.headers["content-type"] || "")) return reply(res, 415, { error: "content-type must be application/json" }, gate.origin);
      try {
        var body = await readJson(req);
        var printResult = await service.submit(body, {
          source: body && body.source ? String(body.source).slice(0, 120) : "website",
          clientKey: clientKey(req),
          language: body && body.language,
          campaign: body && body.campaign,
          referral: body && body.referral
        });
        return acceptLead(printResult, gate.origin, res);
      } catch (error) {
        return reply(res, error.statusCode || 500, { error: error.statusCode ? error.message : "print request was not recorded" }, gate.origin);
      }
    }

    if (req.method === "POST" && pathname === "/api/internal/payment-verified") {
      if (!env.VG_FORM_API_KEY) return reply(res, 503, { error: "BLOCKED: server authentication is not configured" });
      if (!validBearer(req.headers.authorization, env.VG_FORM_API_KEY)) return reply(res, 401, { error: "unauthorized" });
      try {
        var paymentBody = await readJson(req);
        if (typeof service.markPaymentVerified !== "function") return reply(res, 503, { error: "BLOCKED: payment verification is not wired" });
        var paid = await service.markPaymentVerified(paymentBody && paymentBody.leadId, paymentBody && paymentBody.eventId);
        return reply(res, 200, { id: paid.id, status: paid.status, paymentVerified: paid.paymentVerified, paymentEventId: paid.paymentEventId });
      } catch (error) {
        return reply(res, error.statusCode || 500, { error: error.statusCode ? error.message : "payment was not verified" });
      }
    }

    var opsGate = sameOrigin(req);
    var opsOrigin = opsGate.origin || "";

    if (pathname === "/api/field/login" && req.method === "POST") {
      if (opsGate.blocked) return reply(res, 503, { error: "BLOCKED: public origin is not configured" });
      if (opsGate.forbidden) return reply(res, 403, { error: "origin not allowed" });
      if (!auth.configured) return reply(res, 503, { error: "BLOCKED: field login is not configured" }, opsOrigin);
      try {
        var creds = await readJson(req);
        var logged = auth.login(creds && creds.username, creds && creds.password);
        if (!logged) return reply(res, 401, { error: "unauthorized" }, opsOrigin);
        return reply(res, 200, { name: logged.session.name, role: logged.session.role }, opsOrigin, { "set-cookie": auth.setCookie(logged.token) });
      } catch (error) {
        return reply(res, error.statusCode || 500, { error: error.statusCode ? error.message : "login failed" }, opsOrigin);
      }
    }

    if (pathname === "/api/field/logout" && req.method === "POST") {
      if (opsGate.blocked) return reply(res, 503, { error: "BLOCKED: public origin is not configured" });
      if (opsGate.forbidden) return reply(res, 403, { error: "origin not allowed" });
      return reply(res, 200, { ok: true }, opsOrigin, { "set-cookie": auth.clearCookie() });
    }

    if (pathname === "/api/field/session" && req.method === "GET") {
      if (opsGate.blocked) return reply(res, 503, { error: "BLOCKED: public origin is not configured" });
      if (opsGate.forbidden) return reply(res, 403, { error: "origin not allowed" });
      var current = auth.read(req.headers.cookie);
      if (!current) return reply(res, 401, { error: "login required" }, opsOrigin);
      return reply(res, 200, { name: current.name, role: current.role }, opsOrigin);
    }

    if ((pathname === "/api/field/leads" || pathname === "/api/admin/leads") && req.method === "GET") {
      if (opsGate.blocked) return reply(res, 503, { error: "BLOCKED: public origin is not configured" });
      if (opsGate.forbidden) return reply(res, 403, { error: "origin not allowed" });
      var viewer = requireSession(req, res, opsOrigin);
      if (!viewer) return;
      if (typeof service.list !== "function") return reply(res, 503, { error: "BLOCKED: lead listing is not wired" }, opsOrigin);
      var leads = await service.list({ owner: viewer.name, role: viewer.role });
      return reply(res, 200, { viewer: { name: viewer.name, role: viewer.role }, columns: PIPELINE_STATUSES, leads: leads }, opsOrigin);
    }

    if (pathname === "/api/field/leads" && req.method === "POST") {
      if (opsGate.blocked) return reply(res, 503, { error: "BLOCKED: public origin is not configured" });
      if (opsGate.forbidden) return reply(res, 403, { error: "origin not allowed" });
      var capture = requireSession(req, res, opsOrigin);
      if (!capture) return;
      if (!/^application\/json(?:\s*;|$)/i.test(req.headers["content-type"] || "")) return reply(res, 415, { error: "content-type must be application/json" }, opsOrigin);
      try {
        var fieldBody = await readJson(req);
        var fieldResult = await service.submit(fieldBody, {
          source: "Field",
          owner: "Mike",
          capturedBy: capture.name,
          clientKey: clientKey(req),
          language: fieldBody && fieldBody.language,
          campaign: fieldBody && fieldBody.campaign,
          action: fieldBody && fieldBody.action
        });
        return acceptLead(fieldResult, opsOrigin, res);
      } catch (error) {
        return reply(res, error.statusCode || 500, { error: error.statusCode ? error.message : "lead was not recorded" }, opsOrigin);
      }
    }

    var statusMatch = pathname.match(/^\/api\/admin\/leads\/([^/]+)$/);
    if (statusMatch && req.method === "PATCH") {
      if (opsGate.blocked) return reply(res, 503, { error: "BLOCKED: public origin is not configured" });
      if (opsGate.forbidden) return reply(res, 403, { error: "origin not allowed" });
      var editor = requireSession(req, res, opsOrigin);
      if (!editor) return;
      if (typeof service.updateStatus !== "function" || typeof service.get !== "function") return reply(res, 503, { error: "BLOCKED: lead status updates are not wired" }, opsOrigin);
      try {
        var existing = await service.get(decodeURIComponent(statusMatch[1]));
        if (!existing) return reply(res, 404, { error: "lead not found" }, opsOrigin);
        if (editor.role !== "admin" && existing.owner !== editor.name) return reply(res, 403, { error: "forbidden" }, opsOrigin);
        var patch = await readJson(req);
        var updated = await service.updateStatus(existing.id, patch && patch.status, editor.name);
        return reply(res, 200, updated, opsOrigin);
      } catch (error) {
        return reply(res, error.statusCode || 500, { error: error.statusCode ? error.message : "status was not updated" }, opsOrigin);
      }
    }

    return reply(res, 404, { error: "not found" }, leadsOrigin);
  });
}

if (require.main === module) {
  var env = process.env;
  createServer().listen(Number(env.PORT || 8787), function () {
    console.log("Vral Graphics form API listening");
  });
}

module.exports = { createServer: createServer };
