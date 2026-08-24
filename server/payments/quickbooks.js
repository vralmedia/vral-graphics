"use strict";

function configuration(env) {
  env = env || process.env;
  var names = ["QUICKBOOKS_REALM_ID", "QUICKBOOKS_ACCESS_TOKEN"];
  var missing = names.filter(function (name) { return !env[name]; });
  var environment = String(env.QUICKBOOKS_ENVIRONMENT || "sandbox").toLowerCase();
  if (environment !== "sandbox" && environment !== "production") environment = "sandbox";
  if (missing.length) return { ready: false, blocked: true, environment: environment, missing: missing };
  return { ready: true, blocked: false, environment: environment, realmId: env.QUICKBOOKS_REALM_ID, accessToken: env.QUICKBOOKS_ACCESS_TOKEN };
}

function blocked(missing) {
  var err = new Error("QuickBooks integration blocked: missing " + missing.join(", "));
  err.code = "QUICKBOOKS_BLOCKED";
  err.statusCode = 503;
  err.missing = missing;
  return err;
}

// The transport is the only place that knows the QuickBooks Payments API
// endpoint. This adapter exposes a hosted session but never manufactures one.
function createHostedCheckoutAdapter(transport, env) {
  return {
    provider: "quickbooks_payments",
    createHostedCheckout: async function (request) {
      var config = configuration(env);
      if (!config.ready) throw blocked(config.missing);
      if (!transport || typeof transport.createHostedCheckout !== "function") throw new TypeError("QuickBooks Payments transport adapter is required");
      var session = await transport.createHostedCheckout({ realmId: config.realmId, accessToken: config.accessToken, environment: config.environment, request: request });
      return session;
    }
  };
}

// Network transport is intentionally injected; no accounting entry is claimed until Intuit accepts it.
async function createSalesReceipt(order, transport, env) {
  var config = configuration(env);
  if (!config.ready) throw blocked(config.missing);
  if (!transport || typeof transport.post !== "function") throw new TypeError("QuickBooks transport adapter is required");
  if (!order || order.status !== "paid" || order.paymentVerified !== true || typeof order.paymentProviderEventId !== "string" || !order.paymentProviderEventId || !Array.isArray(order.lines)) throw new TypeError("only a verified paid order with provider event id and lines can be synced");
  return transport.post({ realmId: config.realmId, accessToken: config.accessToken, order: order });
}

module.exports = { configuration: configuration, createHostedCheckoutAdapter: createHostedCheckoutAdapter, createSalesReceipt: createSalesReceipt };
