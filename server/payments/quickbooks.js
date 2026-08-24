"use strict";

function configuration(env) {
  env = env || process.env;
  var names = ["QUICKBOOKS_REALM_ID", "QUICKBOOKS_ACCESS_TOKEN"];
  var missing = names.filter(function (name) { return !env[name]; });
  if (missing.length) return { ready: false, blocked: true, missing: missing };
  return { ready: true, realmId: env.QUICKBOOKS_REALM_ID, accessToken: env.QUICKBOOKS_ACCESS_TOKEN };
}

// Network transport is intentionally injected; no accounting entry is claimed until Intuit accepts it.
async function createSalesReceipt(order, transport, env) {
  var config = configuration(env);
  if (!config.ready) { var err = new Error("QuickBooks sync blocked: missing " + config.missing.join(", ")); err.code = "QUICKBOOKS_BLOCKED"; err.missing = config.missing; throw err; }
  if (!transport || typeof transport.post !== "function") throw new TypeError("QuickBooks transport adapter is required");
  if (!order || order.status !== "paid" || !Array.isArray(order.lines)) throw new TypeError("only a paid order with lines can be synced");
  return transport.post({ realmId: config.realmId, accessToken: config.accessToken, order: order });
}

module.exports = { configuration: configuration, createSalesReceipt: createSalesReceipt };
