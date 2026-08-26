"use strict";

var crypto = require("node:crypto");

var COOKIE = "vg_ops_session";
var MAX_AGE_MS = 12 * 60 * 60 * 1000;

function text(value, limit) {
  return typeof value === "string" ? value.trim().slice(0, limit || 200) : "";
}

function parseUsers(raw) {
  if (!raw) return [];
  try {
    var parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (_) {
    return [];
  }
}

function passwordOk(supplied, expected) {
  if (!expected) return false;
  var a = crypto.createHash("sha256").update(String(supplied)).digest();
  var b = crypto.createHash("sha256").update(String(expected)).digest();
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function sign(payload, secret) {
  var body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  var mac = crypto.createHmac("sha256", secret).update(body).digest("base64url");
  return body + "." + mac;
}

function verify(token, secret) {
  if (!token || !secret) return null;
  var parts = String(token).split(".");
  if (parts.length !== 2) return null;
  var expected = crypto.createHmac("sha256", secret).update(parts[0]).digest();
  var supplied;
  try { supplied = Buffer.from(parts[1], "base64url"); } catch (_) { return null; }
  if (expected.length !== supplied.length || !crypto.timingSafeEqual(expected, supplied)) return null;
  try {
    var payload = JSON.parse(Buffer.from(parts[0], "base64url").toString("utf8"));
    if (!payload || payload.exp < Date.now()) return null;
    return payload;
  } catch (_) {
    return null;
  }
}

function cookieValue(header, name) {
  if (!header) return "";
  var parts = String(header).split(";");
  for (var i = 0; i < parts.length; i += 1) {
    var part = parts[i].trim();
    if (part.indexOf(name + "=") === 0) return part.slice(name.length + 1);
  }
  return "";
}

function cookieHeader(token, env, clear) {
  var parts = [COOKIE + "=" + (clear ? "" : token), "Path=/", "HttpOnly", "SameSite=Lax"];
  if (clear) parts.push("Max-Age=0");
  else parts.push("Max-Age=" + Math.floor(MAX_AGE_MS / 1000));
  if (env.VG_COOKIE_SECURE === "true") parts.push("Secure");
  return parts.join("; ");
}

function createAuth(env) {
  env = env || {};
  var secret = text(env.VG_FIELD_SESSION_SECRET, 400);
  var users = parseUsers(env.VG_FIELD_USERS).map(function (user) {
    return {
      username: text(user && user.username, 80).toLowerCase(),
      password: text(user && user.password, 200),
      name: text(user && user.name, 80),
      role: text(user && user.role, 20).toLowerCase() === "admin" ? "admin" : "rep"
    };
  }).filter(function (user) { return user.username && user.password && user.name; });

  return {
    configured: Boolean(secret && users.length),
    cookieName: COOKIE,
    login: function (username, password) {
      if (!secret || !users.length) {
        var blocked = new Error("BLOCKED: field login is not configured");
        blocked.statusCode = 503;
        throw blocked;
      }
      var found = users.find(function (user) { return user.username === text(username, 80).toLowerCase(); });
      if (!found || !passwordOk(password, found.password)) return null;
      var session = {
        sub: found.username,
        name: found.name,
        role: found.role,
        exp: Date.now() + MAX_AGE_MS
      };
      return { session: session, token: sign(session, secret) };
    },
    read: function (cookieHeader) {
      if (!secret) return null;
      return verify(cookieValue(cookieHeader, COOKIE), secret);
    },
    setCookie: function (token) { return cookieHeader(token, env, false); },
    clearCookie: function () { return cookieHeader("", env, true); }
  };
}

module.exports = { createAuth: createAuth, COOKIE: COOKIE };
