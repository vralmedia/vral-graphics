"use strict";

var test = require("node:test");
var assert = require("node:assert/strict");
var offers = require("../../server/payments/offers");
var checkout = require("../../server/payments/checkout");

test("canonical specials SKUs are business cards, not flyers", function () {
  var keys = Object.keys(offers.SPECIALS_CATALOGUE);
  assert.deepEqual(keys.sort(), [
    "business_card_1000",
    "business_card_1000_free_when_vral_designs",
    "business_card_2500",
    "business_card_5000"
  ]);
  keys.forEach(function (sku) {
    var product = offers.SPECIALS_CATALOGUE[sku];
    assert.equal(product.family, "business_cards");
    assert.match(product.name, /Business cards/);
    assert.doesNotMatch(product.name, /Flyer/i);
    assert.equal(product.checkoutPolicy, "fixed_price");
  });
});

test("legacy flyer specials aliases resolve to business cards with identical cents", function () {
  var fromLegacy = offers.quoteSpecial({ printingSku: "flyer_2500", design: "front" });
  var fromCanonical = offers.quoteSpecial({ printingSku: "business_card_2500", design: "front" });
  assert.equal(fromLegacy.printingSku, "business_card_2500");
  assert.equal(fromLegacy.totalCents, fromCanonical.totalCents);
  assert.equal(fromLegacy.totalCents, 13900 + 973 + 7500);
});

test("confirmed brochure and flyer print prices exist but cannot be checked out", function () {
  var brochure = offers.quoteOffer({ sku: "brochure_menu_1000" });
  assert.equal(brochure.catalogPrintCents, 29900);
  assert.equal(brochure.checkoutEligible, false);
  assert.equal(brochure.action, "request_quote");
  assert.equal(brochure.designFeeCents, null);
  assert.equal(brochure.taxCents, null);
  assert.equal(brochure.totalCents, null);

  var menus = offers.quoteOffer({ sku: "brochure_menu_5000" });
  assert.equal(menus.catalogPrintCents, 49500);
  assert.equal(menus.checkoutEligible, false);

  var flyer = offers.quoteOffer({ sku: "flyer_5000_4x6_twosided" });
  assert.equal(flyer.family, "flyers");
  assert.equal(flyer.catalogPrintCents, 19900);
  assert.equal(flyer.checkoutEligible, false);
  assert.match(flyer.name, /4 × 6/);
});

test("area offers stay quote-only even with a square-foot estimate", function () {
  var banner = offers.estimateArea("banner_sqft", 10);
  assert.equal(banner.estimatedPrintCents, 6000);
  assert.equal(banner.checkoutEligible, false);
  assert.equal(banner.reason, "area_or_installation");

  var wrap = offers.estimateArea("window-wraps", 3);
  assert.equal(wrap.estimatedPrintCents, 2100);
  assert.equal(wrap.checkoutEligible, false);
});

test("A-frame lists 199 dollars and still requires a quote", function () {
  var result = offers.quoteOffer({ sku: "a-frame" });
  assert.equal(result.catalogPrintCents, 19900);
  assert.equal(result.checkoutEligible, false);
  assert.equal(result.action, "request_quote");
});

test("Sign Spinners is rejected, not sold as a print special", function () {
  assert.throws(function () { offers.quoteOffer({ sku: "sign_spinners" }); }, /Sign Spinners/);
  assert.throws(function () { offers.canonicalPrintingSku("sign-spinners"); }, /Sign Spinners/);
  var listed = offers.listPublicOffers().map(function (row) { return row.sku; });
  assert.equal(listed.indexOf("sign_spinners"), -1);
});

test("business-card design fees never attach to brochures or flyers", function () {
  var brochure = offers.quoteOffer({ sku: "brochure_menu_2500", design: "front_back", designByVral: true });
  assert.equal(brochure.checkoutEligible, false);
  assert.equal(brochure.designFeeCents, null);
  assert.equal(brochure.catalogPrintCents, 39900);
  assert.equal(brochure.reason, "design_fee_not_closed_for_this_family");
});

test("hosted checkout refuses quote-only SKUs", async function () {
  var deps = {
    orderRepository: { reservePending: function () { throw new Error("must not reserve quote-only"); } },
    gateway: { provider: "quickbooks_payments", createHostedCheckout: function () { throw new Error("must not open session"); } }
  };
  assert.throws(function () {
    checkout.createCheckout({ sku: "flyer_5000_4x6_twosided", idempotencyKey: "q".repeat(16) }, deps);
  }, { code: "OFFER_QUOTE_ONLY", statusCode: 409 });
  assert.throws(function () {
    checkout.createSpecialCheckout({ printingSku: "brochure_menu_1000", design: "front", idempotencyKey: "r".repeat(16) }, deps);
  }, { code: "OFFER_QUOTE_ONLY" });
});

test("public offer list marks only business cards as checkout-eligible", function () {
  var rows = offers.listPublicOffers();
  var checkoutable = rows.filter(function (row) { return row.checkoutEligible; });
  checkoutable.forEach(function (row) {
    assert.equal(row.family, "business_cards");
  });
  assert.equal(checkoutable.length, 4);
  assert.equal(rows.some(function (row) { return row.sku === "packaging" && row.action === "request_quote"; }), true);
});
