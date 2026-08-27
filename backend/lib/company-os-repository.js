"use strict";

var crypto = require("node:crypto");

function blocked(message) {
  var error = new Error("BLOCKED: " + message);
  error.statusCode = 503;
  return error;
}

function hashToken(token) {
  return crypto.createHash("sha256").update(String(token || ""), "utf8").digest("hex");
}

function cleanName(value) {
  return String(value || "artwork").replace(/[^A-Za-z0-9._-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 120) || "artwork";
}

function createCompanyOsRepository(env, request) {
  env = env || {};
  request = request || fetch;
  var baseUrl = String(env.SUPABASE_URL || "").replace(/\/$/, "");
  var serviceKey = String(env.SUPABASE_SERVICE_ROLE_KEY || "");
  var bucket = String(env.VG_ARTWORK_BUCKET || "vral-artwork");
  var configured = Boolean(baseUrl && serviceKey);

  function ensureConfigured() {
    if (!configured) throw blocked("Company OS storage is not configured");
  }

  async function call(pathname, options) {
    ensureConfigured();
    options = options || {};
    var headers = Object.assign({
      apikey: serviceKey,
      authorization: "Bearer " + serviceKey,
      "content-type": "application/json"
    }, options.headers || {});
    var response = await request(baseUrl + pathname, Object.assign({}, options, { headers: headers }));
    var text = await response.text();
    var body = null;
    try { body = text ? JSON.parse(text) : null; } catch (_) { body = { message: text || "invalid response" }; }
    if (!response.ok) {
      var error = new Error(body && (body.message || body.error || body.hint) || "Company OS request failed");
      error.statusCode = response.status >= 400 && response.status < 500 ? response.status : 502;
      throw error;
    }
    return body;
  }

  function rpc(name, payload) {
    return call("/rest/v1/rpc/" + encodeURIComponent(name), { method: "POST", body: JSON.stringify(payload || {}) });
  }

  async function raw(pathname) {
    ensureConfigured();
    var response = await request(baseUrl + pathname, { headers: { apikey: serviceKey, authorization: "Bearer " + serviceKey } });
    if (!response.ok) {
      var error = new Error("Company OS file request failed");
      error.statusCode = response.status === 404 ? 404 : 502;
      throw error;
    }
    return { buffer: Buffer.from(await response.arrayBuffer()), type: response.headers.get("content-type") || "application/octet-stream" };
  }

  async function intake(input, context) {
    var token = crypto.randomBytes(32).toString("base64url");
    var body = await rpc("vral_intake_print_job", {
      p_request: Object.assign({}, input || {}, {
        trackingTokenHash: hashToken(token),
        source: context && context.source || input && input.source || "website",
        owner: context && context.owner || "Mike",
        capturedBy: context && context.capturedBy || null
      })
    });
    return {
      ok: true,
      statusCode: body && body.duplicate ? 200 : 202,
      duplicate: body && body.duplicate === true,
      trackingToken: token,
      lead: {
        id: body.id,
        receivedAt: body.receivedAt,
        updatedAt: body.updatedAt || body.receivedAt,
        owner: body.owner || "Mike",
        status: body.status || "New",
        delivery: body.delivery || []
      }
    };
  }

  async function operations(viewer) {
    return rpc("vral_operations_snapshot", {
      p_role: viewer && viewer.role || "field",
      p_owner: viewer && viewer.name || ""
    });
  }

  async function list(viewer) {
    var data = await operations(viewer);
    return data && Array.isArray(data.jobs) ? data.jobs : [];
  }

  function updateStatus(id, status, actor) {
    return rpc("vral_update_job_stage", { p_job_id: id, p_stage: status, p_actor: actor || "ops" });
  }

  function markPaymentVerified(id, eventId) {
    return rpc("vral_mark_payment_verified", { p_job_id: id, p_event_id: eventId || null });
  }

  function track(token) {
    if (!token || String(token).length < 32) {
      var error = new Error("tracking token required");
      error.statusCode = 401;
      return Promise.reject(error);
    }
    return rpc("vral_track_print_job", { p_token_hash: hashToken(token) });
  }

  async function uploadArtwork(id, token, file) {
    var tracked = await track(token);
    if (!tracked || tracked.id !== id) {
      var denied = new Error("job access denied");
      denied.statusCode = 403;
      throw denied;
    }
    var objectPath = id + "/" + crypto.randomUUID() + "-" + cleanName(file.name);
    var response = await request(baseUrl + "/storage/v1/object/" + encodeURIComponent(bucket) + "/" + objectPath.split("/").map(encodeURIComponent).join("/"), {
      method: "POST",
      headers: {
        apikey: serviceKey,
        authorization: "Bearer " + serviceKey,
        "content-type": file.type || "application/octet-stream",
        "x-upsert": "false"
      },
      body: file.buffer
    });
    if (!response.ok) {
      var uploadError = new Error("artwork was not stored");
      uploadError.statusCode = 502;
      throw uploadError;
    }
    await rpc("vral_record_artwork", {
      p_job_id: id,
      p_storage_path: objectPath,
      p_original_name: file.name,
      p_mime_type: file.type || "application/octet-stream",
      p_size_bytes: file.buffer.length,
      p_actor: "customer"
    });
    return { stored: true, objectPath: objectPath };
  }

  async function latestProof(id, token) {
    var tracked = await track(token);
    if (!tracked || tracked.id !== id) {
      var denied = new Error("job access denied");
      denied.statusCode = 403;
      throw denied;
    }
    var proof = await rpc("vral_latest_proof", { p_job_id: id });
    if (!proof || !proof.storagePath) {
      var missing = new Error("proof not found");
      missing.statusCode = 404;
      throw missing;
    }
    var file = await raw("/storage/v1/object/" + encodeURIComponent(bucket) + "/" + proof.storagePath.split("/").map(encodeURIComponent).join("/"));
    return { buffer: file.buffer, type: proof.mimeType || file.type, name: proof.originalName || "proof" };
  }

  async function recordApproval(id, token, decision, note) {
    var tracked = await track(token);
    if (!tracked || tracked.id !== id) {
      var denied = new Error("job access denied");
      denied.statusCode = 403;
      throw denied;
    }
    if (decision !== "approved" && decision !== "changes_requested") {
      var invalid = new Error("invalid proof decision");
      invalid.statusCode = 422;
      throw invalid;
    }
    return rpc("vral_record_approval", { p_job_id: id, p_decision: decision, p_note: String(note || "").slice(0, 2000), p_actor: "customer" });
  }

  return {
    configured: configured,
    intake: intake,
    operations: operations,
    list: list,
    updateStatus: updateStatus,
    markPaymentVerified: markPaymentVerified,
    track: track,
    uploadArtwork: uploadArtwork,
    latestProof: latestProof,
    recordApproval: recordApproval
  };
}

module.exports = { createCompanyOsRepository: createCompanyOsRepository, hashToken: hashToken };
