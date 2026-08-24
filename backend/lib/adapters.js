"use strict";

// Keep the lead-service contract small: it queues and retries these adapters.
// Delivery policy, MIME generation, and provider safety live in delivery.js.
var delivery = require("./delivery");

function createCrmAdapter(env, request) { return delivery.createCrmAdapter(env, request); }
function createFlyerEmailAdapter(env, request) { return delivery.createFlyerEmailAdapter(env, request); }

module.exports = {
  createCrmAdapter: createCrmAdapter,
  createFlyerEmailAdapter: createFlyerEmailAdapter,
  leadPayload: delivery.leadPayload
};
