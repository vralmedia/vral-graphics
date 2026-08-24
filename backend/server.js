"use strict";

var http = require("node:http"); var path = require("node:path"); var adapters = require("./lib/adapters"); var createLeadService = require("./lib/lead-service").createLeadService;
function reply(res, code, body, origin) { var headers = { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" }; if (origin) headers["access-control-allow-origin"] = origin; res.writeHead(code, headers); res.end(JSON.stringify(body)); }
function readJson(req) { return new Promise(function (resolve, reject) { var bytes = 0, chunks = []; req.on("data", function (chunk) { bytes += chunk.length; if (bytes > 65536) { reject(new Error("body too large")); req.destroy(); } else chunks.push(chunk); }); req.on("end", function () { try { resolve(JSON.parse(Buffer.concat(chunks).toString("utf8"))); } catch (_) { reject(new Error("invalid JSON")); } }); req.on("error", reject); }); }
function createServer(options) {
  options = options || {}; var env = options.env || process.env, request = options.request || fetch;
  var service = options.service || createLeadService({ storePath: path.resolve(env.LEAD_STORE_PATH || "./data/leads.jsonl"), adapters: [adapters.createCrmAdapter(env, request), adapters.createFlyerEmailAdapter(env, request)] });
  function allowedOrigin(req) { return env.VG_FORM_ALLOWED_ORIGIN && req.headers.origin === env.VG_FORM_ALLOWED_ORIGIN ? env.VG_FORM_ALLOWED_ORIGIN : ""; }
  return http.createServer(async function (req, res) {
    var origin = allowedOrigin(req);
    if (req.method === "OPTIONS" && req.url === "/api/leads" && origin) { res.writeHead(204, { "access-control-allow-origin": origin, "access-control-allow-methods": "POST, OPTIONS", "access-control-allow-headers": "content-type, authorization", vary: "Origin" }); return res.end(); }
    if (req.method !== "POST" || req.url !== "/api/leads") return reply(res, 404, { error: "not found" }, origin);
    if (!env.VG_FORM_API_KEY) return reply(res, 503, { error: "BLOCKED: server authentication is not configured" }, origin);
    if (req.headers.authorization !== "Bearer " + env.VG_FORM_API_KEY) return reply(res, 401, { error: "unauthorized" }, origin);
    try {
      // The entire approved schema, including `website` honeypot and idempotencyKey, reaches the service unchanged.
      var result = await service.submit(await readJson(req), { source: req.headers.origin || "direct", clientKey: req.headers["x-forwarded-for"] || req.socket.remoteAddress || "unknown" });
      if (!result.ok) return reply(res, result.statusCode, { error: "validation failed", details: result.errors }, origin);
      if (result.suppressed) return reply(res, result.statusCode, { accepted: true }, origin);
      return reply(res, result.statusCode, { id: result.lead.id, receivedAt: result.lead.receivedAt, owner: result.lead.owner, persistence: result.duplicate ? "DUPLICATE" : "RECORDED", delivery: result.lead.delivery }, origin);
    } catch (_) { return reply(res, 500, { error: "lead was not recorded" }, origin); }
  });
}
if (require.main === module) { var env = process.env; createServer().listen(Number(env.PORT || 8787), function () { console.log("Vral Graphics form API listening"); }); }
module.exports = { createServer: createServer };
