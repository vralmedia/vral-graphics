"use strict";

var assert = require("node:assert/strict");
var fs = require("node:fs");
var path = require("node:path");
var test = require("node:test");

var root = path.resolve(__dirname, "../..");
var catalog = require("../../offers/catalog");
var intake = require("../../quote/intake");

function read(rel) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

function surface() {
  return [
    "offers/index.html",
    "offers/offers.js",
    "offers/offers.css",
    "offers/copy.js",
    "offers/catalog.js",
    "quote/index.html",
    "quote/quote.js",
    "quote/quote.css",
    "quote/copy.js",
    "quote/intake.js"
  ].map(read).join("\n");
}

test("canonical SKUs match the server contract", function () {
  var skus = catalog.allOffers().map(function (row) { return row.sku; }).sort();
  assert.deepEqual(skus, [
    "aframe",
    "banner_sqft",
    "brochure_menu_1000",
    "brochure_menu_2500",
    "brochure_menu_5000",
    "business_card_1000",
    "business_card_1000_free_when_vral_designs",
    "business_card_2500",
    "business_card_5000",
    "flyer_5000_4x6_twosided",
    "packaging",
    "window_wrap_sqft"
  ].sort());
});

test("checkout is only allowed on business card SKUs", function () {
  catalog.CHECKOUT_SKUS.forEach(function (sku) {
    assert.equal(catalog.checkoutAllowed(sku), true, sku);
  });
  [
    "flyer_5000_4x6_twosided",
    "brochure_menu_1000",
    "brochure_menu_2500",
    "brochure_menu_5000",
    "banner_sqft",
    "window_wrap_sqft",
    "aframe",
    "packaging"
  ].forEach(function (sku) {
    assert.equal(catalog.checkoutAllowed(sku), false, sku);
    assert.equal(catalog.checkoutBody(sku, "front", "a".repeat(16)), null);
  });
});

test("checkout body never includes browser prices", function () {
  var body = catalog.checkoutBody("business_card_1000", "front", "idempotency-key-01");
  assert.equal(body.sku, "business_card_1000");
  assert.equal(body.design, "front");
  assert.equal(Object.prototype.hasOwnProperty.call(body, "unitCents"), false);
  assert.equal(Object.prototype.hasOwnProperty.call(body, "totalCents"), false);
});

test("legacy flyer quantity SKUs are forbidden on the rack", function () {
  assert.equal(catalog.isForbidden("flyer_1000"), true);
  assert.equal(catalog.isForbidden("flyer_2500"), true);
  assert.equal(catalog.isForbidden("flyer_5000"), true);
  assert.equal(catalog.isForbidden("flyer_5000_4x6_twosided"), false);
  var parsed = catalog.parseSearch("?sku=flyer_5000");
  assert.equal(parsed.sku, "");
  assert.equal(catalog.product("flyers-postcards").offers[0].sku, "flyer_5000_4x6_twosided");
});

test("quote href carries product and sku", function () {
  assert.equal(
    catalog.quoteHref("business-cards", "business_card_2500"),
    "/quote/index.html?product=business-cards&sku=business_card_2500"
  );
  assert.match(catalog.quoteHref("banners", "banner_sqft"), /sku=banner_sqft/);
});

test("intake asks for product only when missing and strips sensitive draft", function () {
  var withProduct = intake.emptyState();
  withProduct.product = "business-cards";
  assert.equal(intake.needsProductStep(withProduct), false);
  assert.equal(intake.needsProductStep(intake.emptyState()), true);

  var state = intake.emptyState();
  state.product = "business-cards";
  state.sku = "business_card_1000";
  state.name = "Ava";
  state.phone = "7865550100";
  state.email = "ava@example.com";
  state.address = "1 Main";
  state.business = "Ava Co";
  state.goal = "Team cards";
  var draft = intake.sanitizeDraft(state);
  assert.equal(draft.goal, "Team cards");
  assert.equal(draft.sku, "business_card_1000");
  assert.equal(draft.name, undefined);
  assert.equal(draft.phone, undefined);

  var payload = intake.payload(state);
  assert.equal(payload.sku, "business_card_1000");
  assert.equal(payload.unitCents, undefined);
  assert.equal(payload.totalCents, undefined);
});

test("filename is not treated as stored artwork", function () {
  assert.equal(intake.artworkMessage("selected", "menu.pdf"), "selected");
  assert.equal(intake.neverFilenameSuccess("selected"), true);
  assert.equal(intake.neverFilenameSuccess("stored"), false);
});

test("public offers and quote files keep the contract", function () {
  var text = surface();
  assert.match(read("offers/index.html"), /data-page="offers"/);
  assert.match(read("quote/index.html"), /data-page="quote"/);
  assert.match(read("quote/index.html"), /public-intake\.js/);
  assert.match(read("quote/index.html"), /data-vral-header/);
  assert.match(read("offers/index.html"), /data-vral-footer/);
  assert.equal(/<input[^>]*type=["']radio["']/.test(read("offers/index.html") + read("offers/offers.js")), false);
  assert.equal(/Order summary/i.test(read("offers/index.html") + read("offers/offers.js")), false);
  assert.equal(/7%|tax/i.test(read("offers/index.html") + read("offers/offers.js") + read("offers/copy.js")), false);
  assert.equal(/Authorization|Bearer /.test(read("quote/quote.js") + read("quote/index.html")), false);
  assert.equal(/\bPaid\b/.test(read("quote/quote.js")), false);
  assert.equal(/Sign Spinners/i.test(text), false);
  catalog.allOffers().forEach(function (row) {
    assert.equal(row.offer.sku === "flyer_1000", false);
    assert.equal(row.offer.sku === "flyer_2500", false);
    assert.equal(row.offer.sku === "flyer_5000", false);
  });
  assert.match(text, /business_card_1000/);
  assert.match(text, /flyer_5000_4x6_twosided/);
  assert.match(read("offers/offers.js"), /Request this offer|c\.t\("request"\)/);
  assert.match(read("offers/copy.js"), /Measure and get a quote/);
});
