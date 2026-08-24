"use strict";

var crypto = require("node:crypto");
var fs = require("node:fs/promises");
var path = require("node:path");

var TABLE = "field_leads";
var STATUSES = new Set(["New", "Follow up", "Paid", "Email"]);
var COLUMNS = ["id", "created_at", "owner", "name", "phone", "email", "address", "business", "interest", "status", "delivery_crm", "delivery_email", "idempotency_key"];

function envFor(options) {
  return Object.assign({}, process.env, options && options.env || {});
}

function modeFor(env) {
  if (env.DATABASE_URL) return "POSTGRES";
  if (env.SUPABASE_URL) return "SUPABASE_REST";
  return "SANDBOX_JSONL";
}

function text(value, fallback) {
  return typeof value === "string" && value.trim() ? value.trim() : (fallback || "");
}

function status(value) {
  var raw = text(value, "New");
  var normalized = ({ "new": "New", "follow up": "Follow up", "paid": "Paid", "email": "Email" })[raw.toLowerCase()] || raw;
  if (!STATUSES.has(normalized)) throw new Error("field lead status must be New, Follow up, Paid, or Email");
  return normalized;
}

function deliveryValue(lead, key, channel) {
  var camel = key.replace(/_([a-z])/g, function (_, letter) { return letter.toUpperCase(); });
  var direct = lead[key] || lead[camel];
  if (direct) return text(direct, "");
  var items = Array.isArray(lead.delivery) ? lead.delivery : [];
  var item = items.find(function (entry) { return entry && (entry.channel === channel || entry.channel === key); });
  return item ? text(item.status, "") : null;
}

function rowFromLead(lead) {
  lead = lead && typeof lead === "object" ? lead : {};
  var created = lead.created_at || lead.createdAt || lead.receivedAt || new Date().toISOString();
  var row = {
    id: text(lead.id, "") || crypto.randomUUID(),
    created_at: created,
    owner: text(lead.owner, "Mike") || "Mike",
    name: text(lead.name),
    phone: text(lead.phone),
    email: text(lead.email),
    address: text(lead.address),
    business: text(lead.business),
    interest: text(lead.interest, "Printing") || "Printing",
    status: status(lead.status),
    delivery_crm: deliveryValue(lead, "delivery_crm", "crm"),
    delivery_email: deliveryValue(lead, "delivery_email", "email"),
    idempotency_key: text(lead.idempotency_key || lead.idempotencyKey, "") || null
  };
  ["name", "phone", "email", "address", "business"].forEach(function (field) {
    if (!row[field]) throw new Error("field lead " + field + " is required");
  });
  return row;
}

function publicRow(row, persistence) {
  return Object.assign({}, row, { persistence: persistence });
}

function jsonlPath(env, options) {
  return path.resolve((options && options.storePath) || env.LEAD_STORE_PATH || path.join(__dirname, "..", "data", "leads.jsonl"));
}

async function readJsonl(file) {
  try {
    var contents = await fs.readFile(file, "utf8");
    return contents.trim() ? contents.trim().split("\n").filter(Boolean).map(JSON.parse) : [];
  } catch (error) {
    if (error.code === "ENOENT") return [];
    throw error;
  }
}

async function appendJsonl(file, row) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.appendFile(file, JSON.stringify(row) + "\n", { encoding: "utf8", mode: 0o600 });
}

function pgPool(env) {
  var pg;
  try {
    pg = require("pg");
  } catch (_) {
    throw new Error("DATABASE_URL is set but the pg package is not installed");
  }
  return new pg.Pool({ connectionString: env.DATABASE_URL, max: 5 });
}

function selectList() {
  return COLUMNS.join(", ");
}

async function persistPostgres(row, env, options) {
  var pool = options && options.pool;
  var ownsPool = !pool;
  if (!pool) pool = pgPool(env);
  try {
    var values = COLUMNS.map(function (column) { return row[column]; });
    var placeholders = values.map(function (_, index) { return "$" + (index + 1); }).join(", ");
    var query = "insert into public." + TABLE + " (" + selectList() + ") values (" + placeholders + ")";
    query += row.idempotency_key ? " on conflict (idempotency_key) do update set idempotency_key = excluded.idempotency_key" : "";
    query += " returning " + selectList();
    var result = await pool.query(query, values);
    return publicRow(result.rows[0], "POSTGRES");
  } finally {
    if (ownsPool) await pool.end();
  }
}

function supabaseConfig(env) {
  var key = env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SERVICE_KEY;
  if (!key) throw new Error("SUPABASE_URL is set but SUPABASE_SERVICE_ROLE_KEY is missing; anon keys cannot write field leads");
  return { url: String(env.SUPABASE_URL).replace(/\/$/, ""), key: key };
}

function restHeaders(config, extra) {
  return Object.assign({
    apikey: config.key,
    authorization: "Bearer " + config.key,
    "content-type": "application/json"
  }, extra || {});
}

async function restJson(response) {
  var body = await response.text();
  var parsed;
  try { parsed = body ? JSON.parse(body) : null; } catch (_) { parsed = body; }
  if (!response.ok) throw new Error("Supabase field_leads request failed (" + response.status + "): " + (typeof parsed === "string" ? parsed : JSON.stringify(parsed)));
  return parsed;
}

async function persistSupabase(row, env) {
  var config = supabaseConfig(env);
  var query = "?select=" + encodeURIComponent(selectList()) + "&on_conflict=idempotency_key";
  var response = await fetch(config.url + "/rest/v1/" + TABLE + query, {
    method: "POST",
    headers: restHeaders(config, { Prefer: "resolution=merge-duplicates,return=representation" }),
    body: JSON.stringify(row)
  });
  var data = await restJson(response);
  if (!Array.isArray(data) || !data[0]) throw new Error("Supabase field_leads insert returned no row");
  return publicRow(data[0], "SUPABASE_REST");
}

async function getPostgres(id, env, options) {
  var pool = options && options.pool;
  var ownsPool = !pool;
  if (!pool) pool = pgPool(env);
  try {
    var result = await pool.query("select " + selectList() + " from public." + TABLE + " where id = $1 limit 1", [id]);
    return result.rows[0] ? publicRow(result.rows[0], "POSTGRES") : null;
  } finally {
    if (ownsPool) await pool.end();
  }
}

async function getSupabase(id, env) {
  var config = supabaseConfig(env);
  var query = "?id=eq." + encodeURIComponent(id) + "&select=" + encodeURIComponent(selectList()) + "&limit=1";
  var response = await fetch(config.url + "/rest/v1/" + TABLE + query, { headers: restHeaders(config) });
  var data = await restJson(response);
  return Array.isArray(data) && data[0] ? publicRow(data[0], "SUPABASE_REST") : null;
}

function createStore(options) {
  options = options || {};
  var env = envFor(options);
  var mode = modeFor(env);
  var file = jsonlPath(env, options);
  return {
    mode: mode,
    async persistLead(lead) {
      var row = rowFromLead(lead);
      if (mode === "POSTGRES") return persistPostgres(row, env, options);
      if (mode === "SUPABASE_REST") return persistSupabase(row, env);
      await appendJsonl(file, row);
      return publicRow(row, "SANDBOX");
    },
    async getLead(id) {
      id = text(id);
      if (!id) return null;
      if (mode === "POSTGRES") return getPostgres(id, env, options);
      if (mode === "SUPABASE_REST") return getSupabase(id, env);
      var records = await readJsonl(file);
      var found = records.find(function (record) { return record && record.id === id; });
      return found ? publicRow(found, "SANDBOX") : null;
    }
  };
}

async function persistLead(lead, options) {
  return createStore(options).persistLead(lead);
}

async function getLead(id, options) {
  return createStore(options).getLead(id);
}

module.exports = { createStore: createStore, persistLead: persistLead, getLead: getLead, rowFromLead: rowFromLead, modeFor: modeFor };
