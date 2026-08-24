"use strict";

var crypto = require("node:crypto"); var http = require("node:http"); var path = require("node:path"); var adapters = require("./lib/adapters"); var createLeadService = require("./lib/lead-service").createLeadService;
function reply(res, code, body, origin) { var headers = { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", vary: "Origin" }; if (origin) headers["access-control-allow-origin"] = origin; res.writeHead(code, headers); res.end(JSON.stringify(body)); }
function httpError(message, statusCode) { var error = new Error(message); error.statusCode = statusCode; return error; }
function validBearer(header, secret) { if (typeof header !== "string" || typeof secret !== "string") return false; var supplied = Buffer.from(header), expected = Buffer.from("Bearer " + secret); return supplied.length === expected.length && crypto.timingSafeEqual(supplied, expected); }
function readJson(req) { return new Promise(function (resolve, reject) { var bytes = 0, chunks = [], finished = false; req.on("data", function (chunk) { if (finished) return; bytes += chunk.length; if (bytes > 65536) { finished = true; reject(httpError("body too large", 413)); req.destroy(); } else chunks.push(chunk); }); req.on("end", function () { if (finished) return; try { resolve(JSON.parse(Buffer.concat(chunks).toString("utf8"))); } catch (_) { reject(httpError("invalid JSON", 400)); } }); req.on("error", reject); }); }
function createServer(options) {
  options = options || {}; var env = options.env || process.env, request = options.request || fetch;
  var service = options.service || createLeadService({ storePath: path.resolve(env.LEAD_STORE_PATH || "./data/leads.jsonl"), adapters: [adapters.createCrmAdapter(env, request), adapters.createFlyerEmailAdapter(env, request)] });
  function allowedOrigin(req) { return env.VG_FORM_ALLOWED_ORIGIN && req.headers.origin === env.VG_FORM_ALLOWED_ORIGIN ? env.VG_FORM_ALLOWED_ORIGIN : ""; }
  return http.createServer(async function (req, res) {
    var origin = allowedOrigin(req);
    if (req.method === "OPTIONS" && req.url === "/api/leads") { if (!origin) return reply(res, 403, { error: "origin not allowed" }); res.writeHead(204, { "access-control-allow-origin": origin, "access-control-allow-methods": "POST, OPTIONS", "access-control-allow-headers": "content-type, authorization", vary: "Origin" }); return res.end(); }
    if (req.method !== "POST" || req.url !== "/api/leads") return reply(res, 404, { error: "not found" }, origin);
    if (!env.VG_FORM_ALLOWED_ORIGIN) return reply(res, 503, { error: "BLOCKED: allowed origin is not configured" });
    if (!origin) return reply(res, 403, { error: "origin not allowed" });
    if (!env.VG_FORM_API_KEY) return reply(res, 503, { error: "BLOCKED: server authentication is not configured" }, origin);
    if (!validBearer(req.headers.authorization, env.VG_FORM_API_KEY)) return reply(res, 401, { error: "unauthorized" }, origin);
    if (!/^application\/json(?:\s*;|$)/i.test(req.headers["content-type"] || "")) return reply(res, 415, { error: "content-type must be application/json" }, origin);
    try {
      // The entire approved schema, including `website` honeypot and idempotencyKey, reaches the service unchanged.
      var forwarded = env.VG_TRUST_PROXY === "true" ? String(req.headers["x-forwarded-for"] || "").split(",")[0].trim() : "";
      var result = await service.submit(await readJson(req), { source: req.headers.origin || "direct", clientKey: forwarded || req.socket.remoteAddress || "unknown" });
      if (!result.ok) return reply(res, result.statusCode, { error: "validation failed", details: result.errors }, origin);
      if (result.suppressed) return reply(res, result.statusCode, { accepted: true }, origin);
      return reply(res, result.statusCode, { id: result.lead.id, receivedAt: result.lead.receivedAt, owner: result.lead.owner, persistence: result.duplicate ? "DUPLICATE" : "RECORDED", delivery: result.lead.delivery }, origin);
    } catch (error) { return reply(res, error.statusCode || 500, { error: error.statusCode ? error.message : "lead was not recorded" }, origin); }
  });
}
if (require.main === module) { var env = process.env; createServer().listen(Number(env.PORT || 8787), function () { console.log("Vral Graphics form API listening"); }); }
module.exports = { createServer: createServer };
