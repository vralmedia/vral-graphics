"use strict";

var money = require("./money");

// Server-owned print catalogue. Browser prices, tax, and fees are ignored.
// Business-card specials are the only checkout-complete family: print cents,
// $75/$10 design, 7% printing-only tax, provider-calculated processing fee.
// Legacy `flyer_*` specials SKUs were misnamed business cards and alias here.
// The real 5,000 4×6 flyer offer is a different SKU and is quote-only.

var PRINTING_TAX_BPS = 700;

var DESIGN_FEES = Object.freeze({ front: 7500, front_back: 8500 });

function freezeProduct(product) {
  return Object.freeze(product);
}

var CATALOGUE = Object.freeze({
  business_card_1000: freezeProduct({
    active: true,
    family: "business_cards",
    name: "Business cards, full color — 1,000",
    unitCents: 9900,
    printedQuantity: 1000,
    checkoutPolicy: "fixed_price",
    designPolicy: "business_card_75_10",
    taxPolicy: "printing_7_percent",
    processingFee: "provider_calculated"
  }),
  business_card_2500: freezeProduct({
    active: true,
    family: "business_cards",
    name: "Business cards, full color — 2,500",
    unitCents: 13900,
    printedQuantity: 2500,
    checkoutPolicy: "fixed_price",
    designPolicy: "business_card_75_10",
    taxPolicy: "printing_7_percent",
    processingFee: "provider_calculated"
  }),
  business_card_5000: freezeProduct({
    active: true,
    family: "business_cards",
    name: "Business cards, full color — 5,000",
    unitCents: 15900,
    printedQuantity: 5000,
    checkoutPolicy: "fixed_price",
    designPolicy: "business_card_75_10",
    taxPolicy: "printing_7_percent",
    processingFee: "provider_calculated"
  }),
  business_card_1000_free_when_vral_designs: freezeProduct({
    active: true,
    family: "business_cards",
    name: "Business cards, full color — 1,000 (free printing when Vral designs)",
    unitCents: 0,
    printedQuantity: 1000,
    checkoutPolicy: "fixed_price",
    designPolicy: "business_card_75_10",
    taxPolicy: "printing_7_percent",
    processingFee: "provider_calculated",
    requiresVralDesign: true
  }),
  brochure_menu_1000: freezeProduct({
    active: true,
    family: "brochures_menus",
    name: "Brochures or menus, 8.5 × 11, free folding — 1,000",
    unitCents: 29900,
    printedQuantity: 1000,
    size: "8.5 × 11 in",
    foldingIncluded: true,
    checkoutPolicy: "quote_only",
    quoteOnlyReason: "design_fee_and_tax_not_closed",
    designPolicy: "unspecified",
    taxPolicy: "unspecified"
  }),
  brochure_menu_2500: freezeProduct({
    active: true,
    family: "brochures_menus",
    name: "Brochures or menus, 8.5 × 11, free folding — 2,500",
    unitCents: 39900,
    printedQuantity: 2500,
    size: "8.5 × 11 in",
    foldingIncluded: true,
    checkoutPolicy: "quote_only",
    quoteOnlyReason: "design_fee_and_tax_not_closed",
    designPolicy: "unspecified",
    taxPolicy: "unspecified"
  }),
  brochure_menu_5000: freezeProduct({
    active: true,
    family: "brochures_menus",
    name: "Brochures or menus, 8.5 × 11, free folding — 5,000",
    unitCents: 49500,
    printedQuantity: 5000,
    size: "8.5 × 11 in",
    foldingIncluded: true,
    checkoutPolicy: "quote_only",
    quoteOnlyReason: "design_fee_and_tax_not_closed",
    designPolicy: "unspecified",
    taxPolicy: "unspecified"
  }),
  flyer_5000_4x6_twosided: freezeProduct({
    active: true,
    family: "flyers",
    name: "Flyers, full color 4 × 6, two sides — 5,000",
    unitCents: 19900,
    printedQuantity: 5000,
    size: "4 × 6 in",
    sides: 2,
    checkoutPolicy: "quote_only",
    quoteOnlyReason: "design_fee_and_tax_not_closed",
    designPolicy: "unspecified",
    taxPolicy: "unspecified"
  }),
  banner_sqft: freezeProduct({
    active: true,
    family: "banners",
    name: "Banners, full color — $6 per square foot",
    unitCents: null,
    rateCentsPerSqFt: 600,
    checkoutPolicy: "quote_only",
    quoteOnlyReason: "area_or_installation",
    designPolicy: "unspecified",
    taxPolicy: "unspecified"
  }),
  window_wrap_sqft: freezeProduct({
    active: true,
    family: "window_wraps",
    name: "Window wraps, full color — $7 per square foot",
    unitCents: null,
    rateCentsPerSqFt: 700,
    checkoutPolicy: "quote_only",
    quoteOnlyReason: "area_or_installation",
    designPolicy: "unspecified",
    taxPolicy: "unspecified"
  }),
  aframe: freezeProduct({
    active: true,
    family: "a_frames",
    name: "A-frame — $199",
    unitCents: 19900,
    printedQuantity: 1,
    checkoutPolicy: "quote_only",
    quoteOnlyReason: "tax_and_spec_not_closed",
    designPolicy: "unspecified",
    taxPolicy: "unspecified"
  }),
  packaging: freezeProduct({
    active: true,
    family: "packaging",
    name: "Packaging",
    unitCents: null,
    checkoutPolicy: "quote_only",
    quoteOnlyReason: "no_closed_offer",
    designPolicy: "unspecified",
    taxPolicy: "unspecified"
  })
});

var SPECIALS_CATALOGUE = Object.freeze({
  business_card_1000: CATALOGUE.business_card_1000,
  business_card_2500: CATALOGUE.business_card_2500,
  business_card_5000: CATALOGUE.business_card_5000,
  business_card_1000_free_when_vral_designs: CATALOGUE.business_card_1000_free_when_vral_designs
});

var REJECTED_SKUS = Object.freeze({
  sign_spinners: "Sign Spinners is not a Vral Graphics print special",
  "sign-spinners": "Sign Spinners is not a Vral Graphics print special",
  signspinners: "Sign Spinners is not a Vral Graphics print special"
});

// Quantity and legacy Specials aliases resolve to business cards. The real
// 4×6 flyer SKU is flyer_5000_4x6_twosided and is never this alias table.
var PRINTING_SKU_ALIASES = Object.freeze({
  "1000": "business_card_1000",
  "2500": "business_card_2500",
  "5000": "business_card_5000",
  business_card_1000: "business_card_1000",
  business_card_2500: "business_card_2500",
  business_card_5000: "business_card_5000",
  business_card_1000_free_when_vral_designs: "business_card_1000_free_when_vral_designs",
  "business-card-1000": "business_card_1000",
  "business-card-2500": "business_card_2500",
  "business-card-5000": "business_card_5000",
  "business-cards-1000": "business_card_1000",
  "business-cards-2500": "business_card_2500",
  "business-cards-5000": "business_card_5000",
  flyer_1000: "business_card_1000",
  flyer_2500: "business_card_2500",
  flyer_5000: "business_card_5000",
  "flyer-1000": "business_card_1000",
  "flyer-2500": "business_card_2500",
  "flyer-5000": "business_card_5000",
  special_1000: "business_card_1000",
  special_2500: "business_card_2500",
  special_5000: "business_card_5000",
  "special-1000": "business_card_1000",
  "special-2500": "business_card_2500",
  "special-5000": "business_card_5000",
  flyer_1000_free: "business_card_1000_free_when_vral_designs",
  "flyer-1000-free": "business_card_1000_free_when_vral_designs",
  flyer_1000_free_when_vral_designs: "business_card_1000_free_when_vral_designs",
  "business-card-1000-free": "business_card_1000_free_when_vral_designs",
  brochure_menu_1000: "brochure_menu_1000",
  brochure_menu_2500: "brochure_menu_2500",
  brochure_menu_5000: "brochure_menu_5000",
  "brochure-1000": "brochure_menu_1000",
  "brochure-2500": "brochure_menu_2500",
  "brochure-5000": "brochure_menu_5000",
  "menu-1000": "brochure_menu_1000",
  "menu-2500": "brochure_menu_2500",
  "menu-5000": "brochure_menu_5000",
  flyer_5000_4x6_twosided: "flyer_5000_4x6_twosided",
  "flyer-5000-4x6": "flyer_5000_4x6_twosided",
  "flyer-4x6-5000": "flyer_5000_4x6_twosided",
  banner_sqft: "banner_sqft",
  banner: "banner_sqft",
  banners: "banner_sqft",
  window_wrap_sqft: "window_wrap_sqft",
  "window-wrap": "window_wrap_sqft",
  "window-wraps": "window_wrap_sqft",
  "window-graphics": "window_wrap_sqft",
  aframe: "aframe",
  "a-frame": "aframe",
  "a_frame": "aframe",
  packaging: "packaging"
});

function quoteOnlyError(detail) {
  var err = new Error(detail.reason || "This offer requires a quote, not hosted checkout");
  err.code = "OFFER_QUOTE_ONLY";
  err.statusCode = 409;
  err.action = "request_quote";
  err.detail = detail;
  return err;
}

function rejectSku(value) {
  var key = String(value || "").toLowerCase().replace(/\s+/g, "_");
  if (Object.prototype.hasOwnProperty.call(REJECTED_SKUS, key)) {
    var err = new RangeError(REJECTED_SKUS[key]);
    err.code = "OFFER_NOT_IN_CATALOGUE";
    throw err;
  }
}

function canonicalPrintingSku(value) {
  if (typeof value !== "string") return value;
  rejectSku(value);
  return PRINTING_SKU_ALIASES[value] || value;
}

function productBySku(sku) {
  rejectSku(sku);
  var canonical = canonicalPrintingSku(sku);
  return CATALOGUE[canonical] ? { sku: canonical, product: CATALOGUE[canonical] } : null;
}

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
    if (product.unitCents == null) throw new RangeError("SKU is quote-only: " + entry.sku);
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

function normalizeDesign(input) {
  var design = input.design === "both" ? "front_back" : input.design;
  if (design === "front+back" || design === "front-back") design = "front_back";
  return design;
}

function attachBusinessCardQuote(result, sku, product, design) {
  result.offer = "specials";
  result.family = "business_cards";
  result.printingSku = sku;
  result.printedQuantity = product.printedQuantity;
  result.design = design;
  result.designFrontCents = 7500;
  result.designBackCents = design === "front_back" ? 1000 : 0;
  result.designFeeCents = result.designFrontCents + result.designBackCents;
  result.freePrinting = product.unitCents === 0;
  result.processingFeeCents = null;
  result.processingFeeStatus = "provider_calculated";
  result.checkoutEligible = true;
  result.action = "checkout";
  result.totalCents = result.subtotalCents + result.taxCents + result.designFeeCents;
  return result;
}

// Quote the public business-card Specials offer. Design is a policy fee: front
// is $75 and front + back is $85. The free-1,000 option waives printing only
// when Vral is the designer. Other families must use quoteOffer().
function quoteSpecial(input) {
  if (!input || typeof input !== "object") throw new TypeError("Specials input is required");
  var design = normalizeDesign(input);
  if (!Object.prototype.hasOwnProperty.call(DESIGN_FEES, design)) throw new RangeError("design must be front or front_back");

  var requestedSku = input.printingSku || input.sku || (input.quantity != null ? String(input.quantity) : null);
  rejectSku(requestedSku);
  var sku = canonicalPrintingSku(requestedSku);
  if (input.designByVral === true || input.vralDesign === true || input.freeWhenVralDesign === true) {
    if (input.quantity != null && Number(input.quantity) !== 1000) throw new RangeError("free Vral-designed printing is only available for 1,000");
    if (!requestedSku || sku === "business_card_1000" || sku === "business_card_1000_free_when_vral_designs") {
      sku = "business_card_1000_free_when_vral_designs";
    }
  }
  var product = SPECIALS_CATALOGUE[sku];
  if (!product) {
    var mapped = productBySku(requestedSku);
    if (mapped && mapped.product.family !== "business_cards") {
      throw quoteOnlyError({
        sku: mapped.sku,
        family: mapped.product.family,
        reason: mapped.product.quoteOnlyReason || "not_a_business_card_special",
        action: "request_quote"
      });
    }
    throw new RangeError("Specials SKU is unavailable: " + String(requestedSku));
  }
  if (product.requiresVralDesign && input.designByVral !== true && input.vralDesign !== true && input.freeWhenVralDesign !== true) {
    throw new RangeError("the free 1,000 offer requires Vral design");
  }

  var result = quote([{ sku: sku, quantity: 1 }], SPECIALS_CATALOGUE, { taxRateBps: PRINTING_TAX_BPS, designFeeCents: DESIGN_FEES[design] });
  return attachBusinessCardQuote(result, sku, product, design);
}

function publicProductView(sku, product) {
  return {
    sku: sku,
    family: product.family,
    name: product.name,
    active: product.active === true,
    checkoutPolicy: product.checkoutPolicy,
    checkoutEligible: product.checkoutPolicy === "fixed_price",
    action: product.checkoutPolicy === "fixed_price" ? "checkout" : "request_quote",
    quoteOnlyReason: product.quoteOnlyReason || null,
    catalogPrintCents: product.unitCents == null ? null : product.unitCents,
    rateCentsPerSqFt: product.rateCentsPerSqFt || null,
    printedQuantity: product.printedQuantity || null,
    size: product.size || null,
    sides: product.sides || null,
    foldingIncluded: product.foldingIncluded === true,
    designPolicy: product.designPolicy,
    taxPolicy: product.taxPolicy,
    processingFee: product.processingFee || null,
    requiresVralDesign: product.requiresVralDesign === true
  };
}

function listPublicOffers() {
  return Object.keys(CATALOGUE).map(function (sku) {
    return publicProductView(sku, CATALOGUE[sku]);
  });
}

function quoteOnlyResult(sku, product, extra) {
  extra = extra || {};
  return Object.assign({
    currency: "USD",
    family: product.family,
    printingSku: sku,
    name: product.name,
    checkoutEligible: false,
    action: "request_quote",
    reason: extra.reason || product.quoteOnlyReason || "quote_only",
    catalogPrintCents: product.unitCents == null ? null : product.unitCents,
    rateCentsPerSqFt: product.rateCentsPerSqFt || null,
    estimatedPrintCents: extra.estimatedPrintCents != null ? extra.estimatedPrintCents : null,
    designFeeCents: null,
    taxCents: null,
    processingFeeCents: null,
    processingFeeStatus: "unspecified",
    totalCents: null,
    lines: []
  }, extra.fields || {});
}

function estimateArea(sku, squareFeet) {
  var mapped = productBySku(sku);
  if (!mapped) throw new RangeError("SKU is unavailable: " + String(sku));
  if (!mapped.product.rateCentsPerSqFt) throw new RangeError("SKU is not area-priced: " + mapped.sku);
  if (typeof squareFeet !== "number" || !Number.isFinite(squareFeet) || squareFeet <= 0) {
    throw new TypeError("squareFeet must be a positive number");
  }
  var thousandths = Math.round(squareFeet * 1000);
  if (thousandths !== squareFeet * 1000 && Math.abs(squareFeet * 1000 - thousandths) > 1e-6) {
    throw new TypeError("squareFeet supports at most three decimal places");
  }
  var estimatedPrintCents = Math.round(mapped.product.rateCentsPerSqFt * squareFeet);
  if (!Number.isSafeInteger(estimatedPrintCents)) throw new RangeError("area estimate is too large");
  return quoteOnlyResult(mapped.sku, mapped.product, {
    reason: "area_or_installation",
    estimatedPrintCents: estimatedPrintCents,
    fields: { squareFeet: squareFeet }
  });
}

function quoteOffer(input) {
  if (!input || typeof input !== "object") throw new TypeError("offer input is required");
  var requestedSku = input.printingSku || input.sku || input.offer || (input.quantity != null ? String(input.quantity) : null);
  rejectSku(requestedSku);
  var mapped = productBySku(requestedSku);
  if (!mapped) throw new RangeError("SKU is unavailable: " + String(requestedSku));
  var sku = mapped.sku;
  var product = mapped.product;

  if (product.family === "business_cards") return quoteSpecial(Object.assign({}, input, { printingSku: sku, sku: sku }));

  if (product.rateCentsPerSqFt) {
    if (input.squareFeet != null) return estimateArea(sku, input.squareFeet);
    return quoteOnlyResult(sku, product, { reason: "area_or_installation" });
  }

  if (input.designByVral === true || input.vralDesign === true) {
    return quoteOnlyResult(sku, product, { reason: "design_fee_not_closed_for_this_family" });
  }

  return quoteOnlyResult(sku, product);
}

function checkoutEligibility(input) {
  try {
    var quoted = quoteOffer(input);
    return {
      checkoutEligible: quoted.checkoutEligible === true,
      action: quoted.action,
      sku: quoted.printingSku,
      family: quoted.family,
      reason: quoted.reason || null,
      quote: quoted
    };
  } catch (error) {
    if (error && error.code === "OFFER_QUOTE_ONLY") {
      return {
        checkoutEligible: false,
        action: "request_quote",
        sku: error.detail && error.detail.sku,
        family: error.detail && error.detail.family,
        reason: error.detail && error.detail.reason,
        quote: null
      };
    }
    throw error;
  }
}

function assertCheckoutEligible(quoted) {
  if (!quoted || quoted.checkoutEligible !== true || !Number.isSafeInteger(quoted.totalCents) || quoted.totalCents < 0) {
    throw quoteOnlyError({
      sku: quoted && quoted.printingSku,
      family: quoted && quoted.family,
      reason: (quoted && quoted.reason) || "checkout_not_eligible",
      action: "request_quote"
    });
  }
  return quoted;
}

module.exports = {
  quote: quote,
  quoteSpecial: quoteSpecial,
  quoteOffer: quoteOffer,
  estimateArea: estimateArea,
  listPublicOffers: listPublicOffers,
  checkoutEligibility: checkoutEligibility,
  assertCheckoutEligible: assertCheckoutEligible,
  canonicalPrintingSku: canonicalPrintingSku,
  CATALOGUE: CATALOGUE,
  SPECIALS_CATALOGUE: SPECIALS_CATALOGUE,
  DESIGN_FEES: DESIGN_FEES,
  PRINTING_TAX_BPS: PRINTING_TAX_BPS,
  quoteOnlyError: quoteOnlyError
};
