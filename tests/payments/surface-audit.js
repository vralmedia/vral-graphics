"use strict";

var fs = require("node:fs");
var path = require("node:path");

var repo = path.resolve(__dirname, "../..");

function read(rel) {
  var file = path.join(repo, rel);
  if (!fs.existsSync(file)) return { exists: false, rel: rel, text: "" };
  return { exists: true, rel: rel, text: fs.readFileSync(file, "utf8") };
}

function count(text, pattern) {
  var match = text.match(pattern);
  return match ? match.length : 0;
}

var publicFiles = ["index.html", "app.js", "i18n.js", "styles.css"].map(read);
var offerFiles = ["offers/catalog.js", "offers/index.html", "quote/intake.js", "quote/index.html"].map(read);
var paymentFiles = [
  "server/payments/offers.js",
  "server/payments/checkout.js",
  "server/payments/returns.js",
  "server/payments/webhooks.js",
  "server/payments/reconciliation.js",
  "server/payments/quickbooks.js"
].map(read);

function surfaceCounts(file) {
  return {
    file: file.rel,
    exists: file.exists,
    fieldMode: count(file.text, /Field Mode/g),
    startAPrintJob: count(file.text, /Start a print job/g),
    quickBooksSetupRequired: count(file.text, /QuickBooks setup required/g),
    mikePersonal: count(file.text, /461-7465/g),
    flyerAsSpecialsLabel: count(file.text, /Flyers — 1,000|Flyers — 2,500|Flyers — 5,000/g)
  };
}

function skuPresence(text) {
  return {
    business_card_1000: text.indexOf("business_card_1000") !== -1,
    business_card_2500: text.indexOf("business_card_2500") !== -1,
    business_card_5000: text.indexOf("business_card_5000") !== -1,
    business_card_1000_free_when_vral_designs: text.indexOf("business_card_1000_free_when_vral_designs") !== -1,
    flyer_5000_4x6_twosided: text.indexOf("flyer_5000_4x6_twosided") !== -1,
    brochure_menu_1000: text.indexOf("brochure_menu_1000") !== -1,
    banner_sqft: text.indexOf("banner_sqft") !== -1,
    window_wrap_sqft: text.indexOf("window_wrap_sqft") !== -1,
    aframe: /\baframe\b/.test(text),
    forbiddenLegacyFlyerSku: /\bflyer_5000\b/.test(text) && text.indexOf("flyer_5000_4x6") === -1,
    checkoutAllowedFalse: /function checkoutAllowed\(\) \{\s*return false;/.test(text)
  };
}

var WORK = "/Users/seujao/aura-engine/COFRE DEFINITIVO/AURA ENGINE LIVE/03 — Clientes/1 — MedSpaMedia (Anthony)/Sessões de trabalho/2026-08-26 — Vral Graphics Full Funnel — Maestri/work";
var catalog = offerFiles[0];
var findings = {
  generatedAt: new Date().toISOString(),
  closed: {
    agentAReport: fs.existsSync(path.join(WORK, "agent-a/REPORT.md")),
    agentBReport: fs.existsSync(path.join(WORK, "agent-b/REPORT.md")),
    agentCReport: fs.existsSync(path.join(WORK, "agent-c/REPORT.md"))
  },
  publicSurface: publicFiles.map(surfaceCounts),
  offersQuoteSurface: offerFiles.map(function (file) {
    return Object.assign(surfaceCounts(file), { skus: skuPresence(file.text) });
  }),
  offerCatalogSkus: skuPresence(catalog.text),
  paymentContract: {
    canonicalBusinessCardSkus: [
      "business_card_1000",
      "business_card_2500",
      "business_card_5000",
      "business_card_1000_free_when_vral_designs"
    ].every(function (sku) {
      return paymentFiles[0].text.indexOf(sku) !== -1;
    }),
    misnamedFlyerSpecialsPresent: /name: "Flyers — 1,000"/.test(paymentFiles[0].text),
    quoteOnlyCode: paymentFiles[0].text.indexOf("OFFER_QUOTE_ONLY") !== -1,
    returnsGuard: paymentFiles[2].exists && paymentFiles[2].text.indexOf("URL return is not proof of payment") !== -1
  }
};

findings.note = "This audit reads other agents' files and does not edit them. Counts are facts, not a pass/fail of Agent D.";

process.stdout.write(JSON.stringify(findings, null, 2) + "\n");
