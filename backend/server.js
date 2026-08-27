"use strict";

var crypto = require("node:crypto");
var http = require("node:http");
var path = require("node:path");
var adapters = require("./lib/adapters");
var createLeadService = require("./lib/lead-service").createLeadService;
var createAuth = require("./lib/auth").createAuth;
var PIPELINE_STATUSES = require("./lib/pipeline").PIPELINE_STATUSES;
var companyOsEngine = require("./lib/company-os");
var createCompanyOsRepository = require("./lib/company-os-repository").createCompanyOsRepository;

var MAX_ARTWORK_BYTES = 25 * 1024 * 1024;
var ARTWORK_TYPES = ["application/pdf", "image/jpeg", "image/png", "image/webp", "application/postscript"];

function reply(res, code, body, origin, extraHeaders) {
  var headers = { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", vary: "Origin" };
  if (origin) headers["access-control-allow-origin"] = origin;
  if (extraHeaders) Object.keys(extraHeaders).forEach(function (key) { headers[key] = extraHeaders[key]; });
  res.writeHead(code, headers);
  res.end(JSON.stringify(body));
}

function replyFile(res, code, file, origin) {
  var headers = {
    "content-type": file.type || "application/octet-stream",
    "content-length": file.buffer.length,
    "content-disposition": "inline; filename=\"" + String(file.name || "proof").replace(/[\"\r\n]/g, "") + "\"",
    "cache-control": "private, no-store",
    "x-content-type-options": "nosniff",
    vary: "Origin"
  };
  if (origin) headers["access-control-allow-origin"] = origin;
  res.writeHead(code, headers);
  res.end(file.buffer);
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

function readBuffer(req, maxBytes) {
  return new Promise(function (resolve, reject) {
    var bytes = 0, chunks = [], finished = false;
    req.on("data", function (chunk) {
      if (finished) return;
      bytes += chunk.length;
      if (bytes > maxBytes) {
        finished = true;
        reject(httpError("file too large", 413));
        req.destroy();
      } else chunks.push(chunk);
    });
    req.on("end", function () { if (!finished) resolve(Buffer.concat(chunks)); });
    req.on("error", reject);
  });
}

async function readArtwork(req) {
  var type = String(req.headers["content-type"] || "");
  var boundaryMatch = type.match(/boundary=(?:"([^"]+)"|([^;]+))/i);
  if (!/^multipart\/form-data/i.test(type) || !boundaryMatch) throw httpError("multipart artwork required", 415);
  var boundary = boundaryMatch[1] || boundaryMatch[2];
  var raw = await readBuffer(req, MAX_ARTWORK_BYTES + 65536);
  var parts = raw.toString("latin1").split("--" + boundary);
  var file = null;
  parts.some(function (part) {
    var splitAt = part.indexOf("\r\n\r\n");
    if (splitAt < 0 || !/name="file"/i.test(part.slice(0, splitAt))) return false;
    var headers = part.slice(0, splitAt);
    var name = (headers.match(/filename="([^"]*)"/i) || [])[1] || "artwork";
    var mime = (headers.match(/content-type:\s*([^\r\n]+)/i) || [])[1] || "application/octet-stream";
    var body = part.slice(splitAt + 4).replace(/\r\n$/, "");
    file = { name: name, type: mime.toLowerCase(), buffer: Buffer.from(body, "latin1") };
    return true;
  });
  if (!file || !file.buffer.length) throw httpError("artwork file required", 422);
  if (file.buffer.length > MAX_ARTWORK_BYTES) throw httpError("file too large", 413);
  if (ARTWORK_TYPES.indexOf(file.type) === -1) throw httpError("unsupported artwork type", 415);
  return file;
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
  var companyOs = options.companyOs || createCompanyOsRepository(env, request);
  var paymentService = options.paymentService || null;
  var publicRates = new Map();

  function productionRateLimited(key) {
    var now = Date.now(), windowMs = 10 * 60 * 1000, max = 5;
    var recent = (publicRates.get(key) || []).filter(function (at) { return now - at < windowMs; });
    if (recent.length >= max) { publicRates.set(key, recent); return true; }
    recent.push(now); publicRates.set(key, recent); return false;
  }

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
      status: result.lead.status,
      trackingToken: result.trackingToken || null
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
        if (body && body.website) return reply(res, 202, { accepted: true }, gate.origin);
        var printContext = {
          source: body && body.source ? String(body.source).slice(0, 120) : "website",
          clientKey: clientKey(req),
          language: body && body.language,
          campaign: body && body.campaign,
          referral: body && body.referral
        };
        if (companyOs.configured && productionRateLimited(printContext.clientKey)) return reply(res, 429, { error: "rate limit exceeded" }, gate.origin);
        var printResult = companyOs.configured ? await companyOs.intake(body, printContext) : await service.submit(body, printContext);
        return acceptLead(printResult, gate.origin, res);
      } catch (error) {
        return reply(res, error.statusCode || 500, { error: error.statusCode ? error.message : "print request was not recorded" }, gate.origin);
      }
    }

    if (req.method === "POST" && pathname === "/api/checkout") {
      var checkoutGate = sameOrigin(req);
      if (checkoutGate.blocked) return reply(res, 503, { error: "BLOCKED: public origin is not configured" });
      if (checkoutGate.forbidden) return reply(res, 403, { error: "origin not allowed" });
      if (!paymentService || typeof paymentService.createCheckout !== "function") return reply(res, 503, { error: "BLOCKED: QuickBooks hosted checkout is not configured" }, checkoutGate.origin);
      try {
        var checkoutBody = await readJson(req);
        var checkout = await paymentService.createCheckout(checkoutBody);
        return reply(res, 201, checkout, checkoutGate.origin);
      } catch (error) {
        return reply(res, error.statusCode || 500, { error: error.statusCode ? error.message : "checkout could not be created", code: error.code || null }, checkoutGate.origin);
      }
    }

    if (req.method === "GET" && pathname === "/api/jobs/track") {
      var trackGate = sameOrigin(req);
      if (trackGate.blocked) return reply(res, 503, { error: "BLOCKED: public origin is not configured" });
      if (trackGate.forbidden) return reply(res, 403, { error: "origin not allowed" });
      if (!companyOs.configured) return reply(res, 503, { error: "BLOCKED: secure job tracking is not configured" }, trackGate.origin);
      try {
        var tracked = await companyOs.track(req.headers["x-vral-job-token"]);
        if (!tracked) return reply(res, 404, { error: "job not found" }, trackGate.origin);
        return reply(res, 200, tracked, trackGate.origin);
      } catch (error) {
        return reply(res, error.statusCode || 500, { error: error.statusCode ? error.message : "job could not be loaded" }, trackGate.origin);
      }
    }

    var proofMatch = pathname.match(/^\/api\/jobs\/([^/]+)\/proof$/);
    if (proofMatch && req.method === "GET") {
      var proofGate = sameOrigin(req);
      if (proofGate.blocked) return reply(res, 503, { error: "BLOCKED: public origin is not configured" });
      if (proofGate.forbidden) return reply(res, 403, { error: "origin not allowed" });
      if (!companyOs.configured) return reply(res, 503, { error: "BLOCKED: secure proof storage is not configured" }, proofGate.origin);
      try {
        return replyFile(res, 200, await companyOs.latestProof(decodeURIComponent(proofMatch[1]), req.headers["x-vral-job-token"]), proofGate.origin);
      } catch (error) {
        return reply(res, error.statusCode || 500, { error: error.statusCode ? error.message : "proof could not be loaded" }, proofGate.origin);
      }
    }

    var approvalMatch = pathname.match(/^\/api\/jobs\/([^/]+)\/approval$/);
    if (approvalMatch && req.method === "POST") {
      var approvalGate = sameOrigin(req);
      if (approvalGate.blocked) return reply(res, 503, { error: "BLOCKED: public origin is not configured" });
      if (approvalGate.forbidden) return reply(res, 403, { error: "origin not allowed" });
      if (!companyOs.configured) return reply(res, 503, { error: "BLOCKED: proof approval is not configured" }, approvalGate.origin);
      try {
        var approvalBody = await readJson(req);
        var approval = await companyOs.recordApproval(decodeURIComponent(approvalMatch[1]), req.headers["x-vral-job-token"], approvalBody && approvalBody.decision, approvalBody && approvalBody.note);
        return reply(res, 200, approval, approvalGate.origin);
      } catch (error) {
        return reply(res, error.statusCode || 500, { error: error.statusCode ? error.message : "proof decision was not recorded" }, approvalGate.origin);
      }
    }

    var artworkMatch = pathname.match(/^\/api\/print-requests\/([^/]+)\/artwork$/);
    if (artworkMatch && req.method === "POST") {
      var artworkGate = sameOrigin(req);
      if (artworkGate.blocked) return reply(res, 503, { error: "BLOCKED: public origin is not configured" });
      if (artworkGate.forbidden) return reply(res, 403, { error: "origin not allowed" });
      if (!companyOs.configured) return reply(res, 503, { error: "BLOCKED: secure artwork storage is not configured" }, artworkGate.origin);
      try {
        var stored = await companyOs.uploadArtwork(decodeURIComponent(artworkMatch[1]), req.headers["x-vral-job-token"], await readArtwork(req));
        return reply(res, 201, stored, artworkGate.origin);
      } catch (error) {
        return reply(res, error.statusCode || 500, { error: error.statusCode ? error.message : "artwork was not stored" }, artworkGate.origin);
      }
    }

    if (req.method === "POST" && pathname === "/api/internal/payment-verified") {
      if (!env.VG_FORM_API_KEY) return reply(res, 503, { error: "BLOCKED: server authentication is not configured" });
      if (!validBearer(req.headers.authorization, env.VG_FORM_API_KEY)) return reply(res, 401, { error: "unauthorized" });
      try {
        var paymentBody = await readJson(req);
        if (!paymentBody || !paymentBody.leadId || !paymentBody.eventId || !String(paymentBody.eventId).trim()) {
          return reply(res, 400, { error: "leadId and payment eventId are required" });
        }
        var paymentMethod = companyOs.configured ? companyOs.markPaymentVerified : service.markPaymentVerified;
        if (typeof paymentMethod !== "function") return reply(res, 503, { error: "BLOCKED: payment verification is not wired" });
        var paid = await paymentMethod(paymentBody && paymentBody.leadId, paymentBody && paymentBody.eventId);
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
      if (!companyOs.configured && typeof service.list !== "function") return reply(res, 503, { error: "BLOCKED: lead listing is not wired" }, opsOrigin);
      var leads = companyOs.configured ? await companyOs.list(viewer) : await service.list({ owner: viewer.name, role: viewer.role });
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
        var fieldContext = {
          source: "Field",
          owner: "Mike",
          capturedBy: capture.name,
          clientKey: clientKey(req),
          language: fieldBody && fieldBody.language,
          campaign: fieldBody && fieldBody.campaign,
          action: fieldBody && fieldBody.action,
          quickCapture: true
        };
        var fieldResult = companyOs.configured ? await companyOs.intake(fieldBody, fieldContext) : await service.submit(fieldBody, fieldContext);
        return acceptLead(fieldResult, opsOrigin, res);
      } catch (error) {
        return reply(res, error.statusCode || 500, { error: error.statusCode ? error.message : "lead was not recorded" }, opsOrigin);
      }
    }

    if (pathname === "/api/admin/operations" && req.method === "GET") {
      if (opsGate.blocked) return reply(res, 503, { error: "BLOCKED: public origin is not configured" });
      if (opsGate.forbidden) return reply(res, 403, { error: "origin not allowed" });
      var operator = requireSession(req, res, opsOrigin);
      if (!operator) return;
      try {
        if (companyOs.configured) return reply(res, 200, await companyOs.operations(operator), opsOrigin);
        if (typeof service.list !== "function") return reply(res, 503, { error: "BLOCKED: operations storage is not wired" }, opsOrigin);
        return reply(res, 200, companyOsEngine.snapshot(await service.list({ owner: operator.name, role: operator.role })), opsOrigin);
      } catch (error) {
        return reply(res, error.statusCode || 500, { error: error.statusCode ? error.message : "operations could not be loaded" }, opsOrigin);
      }
    }

    var statusMatch = pathname.match(/^\/api\/admin\/leads\/([^/]+)$/);
    if (statusMatch && req.method === "PATCH") {
      if (opsGate.blocked) return reply(res, 503, { error: "BLOCKED: public origin is not configured" });
      if (opsGate.forbidden) return reply(res, 403, { error: "origin not allowed" });
      var editor = requireSession(req, res, opsOrigin);
      if (!editor) return;
      try {
        var patch = await readJson(req);
        if (companyOs.configured) {
          var changed = await companyOs.updateStatus(decodeURIComponent(statusMatch[1]), patch && patch.status, editor.name);
          return reply(res, 200, changed, opsOrigin);
        }
        if (typeof service.updateStatus !== "function" || typeof service.get !== "function") return reply(res, 503, { error: "BLOCKED: lead status updates are not wired" }, opsOrigin);
        var existing = await service.get(decodeURIComponent(statusMatch[1]));
        if (!existing) return reply(res, 404, { error: "lead not found" }, opsOrigin);
        if (editor.role !== "admin" && existing.owner !== editor.name) return reply(res, 403, { error: "forbidden" }, opsOrigin);
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
