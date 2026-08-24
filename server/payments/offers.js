"use strict";

var money = require("./money");

// This is the only price source for the Specials checkout. Keep these values in
// cents and do not accept a price, tax, or fee from the browser.
var SPECIALS_CATALOGUE = Object.freeze({
  flyer_1000: Object.freeze({ active: true, name: "Flyers — 1,000", unitCents: 9900, printedQuantity: 1000 }),
  flyer_2500: Object.freeze({ active: true, name: "Flyers — 2,500", unitCents: 13900, printedQuantity: 2500 }),
  flyer_5000: Object.freeze({ active: true, name: "Flyers — 5,000", unitCents: 15900, printedQuantity: 5000 }),
  flyer_1000_free_when_vral_designs: Object.freeze({ active: true, name: "Flyers — 1,000 (free printing when Vral designs)", unitCents: 0, printedQuantity: 1000, requiresVralDesign: true })
});

var DESIGN_FEES = Object.freeze({ front: 7500, front_back: 8500 });
var PRINTING_SKU_ALIASES = Object.freeze({
  "1000": "flyer_1000",
  "2500": "flyer_2500",
  "5000": "flyer_5000",
  "flyer-1000": "flyer_1000",
  "flyer-2500": "flyer_2500",
  "flyer-5000": "flyer_5000",
  "special_1000": "flyer_1000",
  "special_2500": "flyer_2500",
  "special_5000": "flyer_5000",
  "special-1000": "flyer_1000",
  "special-2500": "flyer_2500",
  "special-5000": "flyer_5000",
  "flyer_1000_free": "flyer_1000_free_when_vral_designs",
  "flyer-1000-free": "flyer_1000_free_when_vral_designs"
});

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

function canonicalPrintingSku(value) {
  if (typeof value !== "string") return value;
  return PRINTING_SKU_ALIASES[value] || value;
}

// Quote the public Specials offer without exposing the price catalogue to the
// client. Design is a policy fee: front is $75 and front + back is $85. The
// free-1,000 option waives printing only when Vral is the designer.
function quoteSpecial(input) {
  if (!input || typeof input !== "object") throw new TypeError("Specials input is required");
  var design = input.design === "both" ? "front_back" : input.design;
  if (design === "front+back" || design === "front-back") design = "front_back";
  if (!Object.prototype.hasOwnProperty.call(DESIGN_FEES, design)) throw new RangeError("design must be front or front_back");

  var requestedSku = input.printingSku || input.sku || (input.quantity != null ? String(input.quantity) : null);
  var sku = canonicalPrintingSku(requestedSku);
  if (input.designByVral === true || input.vralDesign === true || input.freeWhenVralDesign === true) {
    if (input.quantity != null && Number(input.quantity) !== 1000) throw new RangeError("free Vral-designed printing is only available for 1,000");
    if (!requestedSku || sku === "flyer_1000" || sku === "flyer_1000_free_when_vral_designs") sku = "flyer_1000_free_when_vral_designs";
  }
  var product = SPECIALS_CATALOGUE[sku];
  if (!product) throw new RangeError("Specials SKU is unavailable: " + String(requestedSku));
  if (product.requiresVralDesign && input.designByVral !== true && input.vralDesign !== true && input.freeWhenVralDesign !== true) {
    throw new RangeError("the free 1,000 offer requires Vral design");
  }

  var result = quote([{ sku: sku, quantity: 1 }], SPECIALS_CATALOGUE, { taxRateBps: 700, designFeeCents: DESIGN_FEES[design] });
  result.offer = "specials";
  result.printingSku = sku;
  result.printedQuantity = product.printedQuantity;
  result.design = design;
  result.designFrontCents = 7500;
  result.designBackCents = design === "front_back" ? 1000 : 0;
  result.designFeeCents = result.designFrontCents + result.designBackCents;
  result.freePrinting = product.unitCents === 0;
  result.processingFeeCents = null;
  result.processingFeeStatus = "provider_calculated";
  result.totalCents = result.subtotalCents + result.taxCents + result.designFeeCents;
  return result;
}

module.exports = {
  quote: quote,
  quoteSpecial: quoteSpecial,
  SPECIALS_CATALOGUE: SPECIALS_CATALOGUE,
  DESIGN_FEES: DESIGN_FEES
};
