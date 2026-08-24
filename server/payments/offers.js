"use strict";

var money = require("./money");

// Prices are resolved from this server-owned catalogue. Browser-supplied prices are ignored.
function quote(cart, catalogue, options) {
  if (!Array.isArray(cart) || !cart.length) throw new TypeError("cart must contain at least one item");
  if (!catalogue || typeof catalogue !== "object") throw new TypeError("catalogue is required");
  options = options || {};
  var taxRateBps = options.taxRateBps || 0;
  var shippingCents = money.integerCents(options.shippingCents || 0, "shippingCents");
  // A design fee is a server policy charge and is deliberately outside this tax base.
  var designFeeCents = money.integerCents(options.designFeeCents || 0, "designFeeCents");
  if (!Number.isInteger(taxRateBps) || taxRateBps < 0 || taxRateBps > 10000) throw new TypeError("taxRateBps must be 0–10000");

  var lines = cart.map(function (entry) {
    if (!entry || typeof entry.sku !== "string" || !/^[A-Za-z0-9_-]{1,80}$/.test(entry.sku)) throw new TypeError("invalid SKU");
    if (!Number.isInteger(entry.quantity) || entry.quantity < 1 || entry.quantity > 10000) throw new TypeError("quantity must be an integer from 1 to 10000");
    var product = catalogue[entry.sku];
    if (!product || product.active !== true) throw new RangeError("SKU is unavailable: " + entry.sku);
    var unitCents = money.integerCents(product.unitCents, "catalogue unitCents");
    var lineCents = unitCents * entry.quantity;
    if (!Number.isSafeInteger(lineCents)) throw new RangeError("line total is too large");
    return { sku: entry.sku, name: String(product.name || entry.sku), quantity: entry.quantity, unitCents: unitCents, lineCents: lineCents };
  });
  var subtotalCents = lines.reduce(function (sum, line) { return sum + line.lineCents; }, 0);
  var taxableCents = subtotalCents;
  // Keep the basis-point multiplication below Number's exact integer range.
  if (taxableCents > Math.floor(Number.MAX_SAFE_INTEGER / 10000)) throw new RangeError("subtotal is too large for tax calculation");
  var taxCents = Math.round(taxableCents * taxRateBps / 10000);
  var totalCents = subtotalCents + taxCents + shippingCents + designFeeCents;
  if (!Number.isSafeInteger(totalCents)) throw new RangeError("total is too large");
  return { currency: "USD", lines: lines, subtotalCents: subtotalCents, taxableCents: taxableCents, taxCents: taxCents, shippingCents: shippingCents, designFeeCents: designFeeCents, totalCents: totalCents };
}

module.exports = { quote: quote };
