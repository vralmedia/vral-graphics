(function (root, factory) {
  "use strict";
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.VralOfferCatalog = api;
})(typeof window !== "undefined" ? window : globalThis, function () {
  "use strict";

  var CHECKOUT_SKUS = [
    "business_card_1000",
    "business_card_2500",
    "business_card_5000",
    "business_card_1000_free_when_vral_designs"
  ];

  var FORBIDDEN_SKUS = ["flyer_1000", "flyer_2500", "flyer_5000"];

  var RACK = [
    "business-cards",
    "flyers-postcards",
    "brochures-menus",
    "banners",
    "window-graphics",
    "signs-aframes"
  ];

  var PRODUCTS = {
    "business-cards": {
      id: "business-cards",
      kind: "checkout",
      specimen: "cards",
      designNote: true,
      cta: "request",
      offers: [
        { sku: "business_card_1000_free_when_vral_designs", qty: 1000, priceLabel: "Free printing", detail: "1,000 when Vral creates the design", checkout: true },
        { sku: "business_card_1000", qty: 1000, priceLabel: "$99", detail: "1,000 full color", checkout: true },
        { sku: "business_card_2500", qty: 2500, priceLabel: "$139", detail: "2,500 full color", checkout: true },
        { sku: "business_card_5000", qty: 5000, priceLabel: "$159", detail: "5,000 full color", checkout: true }
      ]
    },
    "flyers-postcards": {
      id: "flyers-postcards",
      kind: "quote",
      specimen: "flyers",
      cta: "request",
      offers: [
        { sku: "flyer_5000_4x6_twosided", qty: 5000, priceLabel: "$199", detail: "5,000 full-color 4 × 6, two sides", checkout: false }
      ]
    },
    "brochures-menus": {
      id: "brochures-menus",
      kind: "quote",
      specimen: "menus",
      cta: "request",
      size: "8.5 × 11",
      folding: "free",
      offers: [
        { sku: "brochure_menu_1000", qty: 1000, priceLabel: "$299", detail: "1,000 · 8.5 × 11 · folding included", checkout: false },
        { sku: "brochure_menu_2500", qty: 2500, priceLabel: "$399", detail: "2,500 · 8.5 × 11 · folding included", checkout: false },
        { sku: "brochure_menu_5000", qty: 5000, priceLabel: "$495", detail: "5,000 · 8.5 × 11 · folding included", checkout: false }
      ]
    },
    banners: {
      id: "banners",
      kind: "measure",
      specimen: "banner",
      cta: "measure",
      offers: [
        { sku: "banner_sqft", qty: null, priceLabel: "$6 / sq ft", detail: "Full color. Width, height, and install go to quote.", checkout: false }
      ]
    },
    "window-graphics": {
      id: "window-graphics",
      kind: "measure",
      specimen: "window",
      cta: "measure",
      offers: [
        { sku: "window_wrap_sqft", qty: null, priceLabel: "$7 / sq ft", detail: "Full color window wraps. Measure the glass first.", checkout: false }
      ]
    },
    "signs-aframes": {
      id: "signs-aframes",
      kind: "quote",
      specimen: "aframe",
      cta: "request",
      offers: [
        { sku: "aframe", qty: 1, priceLabel: "$199", detail: "A-frame. Confirm size and sides on the request.", checkout: false }
      ]
    },
    packaging: {
      id: "packaging",
      kind: "quote",
      specimen: "packaging",
      cta: "request",
      rack: false,
      offers: [
        { sku: "packaging", qty: null, priceLabel: "Quote", detail: "Custom packaging. No closed flyer price.", checkout: false }
      ]
    }
  };

  var ES_OFFERS = {
    business_card_1000_free_when_vral_designs: { priceLabel: "Impresión gratis", detail: "1,000 cuando Vral crea el diseño" },
    business_card_1000: { priceLabel: "$99", detail: "1,000 a todo color" },
    business_card_2500: { priceLabel: "$139", detail: "2,500 a todo color" },
    business_card_5000: { priceLabel: "$159", detail: "5,000 a todo color" },
    flyer_5000_4x6_twosided: { priceLabel: "$199", detail: "5,000 · 4 × 6 · a todo color · dos caras" },
    brochure_menu_1000: { priceLabel: "$299", detail: "1,000 · 8.5 × 11 · doblez incluido" },
    brochure_menu_2500: { priceLabel: "$399", detail: "2,500 · 8.5 × 11 · doblez incluido" },
    brochure_menu_5000: { priceLabel: "$495", detail: "5,000 · 8.5 × 11 · doblez incluido" },
    banner_sqft: { priceLabel: "$6 / pie²", detail: "A todo color. Confirmamos ancho, alto e instalación." },
    window_wrap_sqft: { priceLabel: "$7 / pie²", detail: "Vinilo a todo color. Primero medimos el vidrio." },
    aframe: { priceLabel: "$199", detail: "A-frame. Confirmamos tamaño y caras en el pedido." },
    packaging: { priceLabel: "Presupuesto", detail: "Empaque personalizado. Confirmamos el alcance contigo." }
  };

  function displayOffer(offer, language) {
    var source = language === "es" && offer ? ES_OFFERS[offer.sku] : null;
    return source || { priceLabel: offer && offer.priceLabel || "", detail: offer && offer.detail || "" };
  }

  function allOffers() {
    var list = [];
    Object.keys(PRODUCTS).forEach(function (pid) {
      PRODUCTS[pid].offers.forEach(function (item) {
        list.push({ productId: pid, product: PRODUCTS[pid], offer: item, sku: item.sku });
      });
    });
    return list;
  }

  function product(id) {
    return PRODUCTS[id] || null;
  }

  function bySku(sku) {
    if (!sku) return null;
    var found = null;
    allOffers().forEach(function (row) {
      if (row.sku === sku) found = row;
    });
    return found;
  }

  function checkoutAllowed(sku) {
    return CHECKOUT_SKUS.indexOf(sku) !== -1;
  }

  function isForbidden(sku) {
    return FORBIDDEN_SKUS.indexOf(sku) !== -1;
  }

  function isKnownProduct(id, list) {
    if (!id) return false;
    if (id === "unsure") return true;
    if (PRODUCTS[id]) return true;
    if (!list || !list.length) return false;
    return list.some(function (item) { return item.id === id; });
  }

  function parseSearch(search) {
    var q = String(search || "").replace(/^\?/, "");
    var out = { product: "", sku: "", offer: "", source: "", campaign: "", rep_id: "", lang: "", design: "" };
    if (!q) return out;
    q.split("&").forEach(function (pair) {
      var parts = pair.split("=");
      var key = decodeURIComponent((parts[0] || "").replace(/\+/g, " "));
      var value = decodeURIComponent((parts.slice(1).join("=") || "").replace(/\+/g, " "));
      if (Object.prototype.hasOwnProperty.call(out, key)) out[key] = value;
    });
    if (out.offer && !out.sku) out.sku = out.offer;
    if (isForbidden(out.sku)) out.sku = "";
    var hit = bySku(out.sku);
    if (!out.product && hit) out.product = hit.productId;
    return out;
  }

  function quoteHref(productId, sku, extra) {
    var params = [];
    function add(key, value) {
      if (!value) return;
      params.push(encodeURIComponent(key) + "=" + encodeURIComponent(value));
    }
    add("product", productId);
    add("sku", sku);
    extra = extra || {};
    add("design", extra.design);
    add("source", extra.source);
    add("campaign", extra.campaign);
    add("rep_id", extra.rep_id);
    return params.length ? "/quote/index.html?" + params.join("&") : "/quote/index.html";
  }

  function checkoutBody(sku, design, idempotencyKey) {
    if (!checkoutAllowed(sku)) return null;
    var body = { sku: sku, idempotencyKey: idempotencyKey };
    if (design === "front" || design === "front_back") body.design = design;
    return body;
  }

  return {
    CHECKOUT_SKUS: CHECKOUT_SKUS,
    FORBIDDEN_SKUS: FORBIDDEN_SKUS,
    RACK: RACK,
    PRODUCTS: PRODUCTS,
    product: product,
    bySku: bySku,
    allOffers: allOffers,
    checkoutAllowed: checkoutAllowed,
    isForbidden: isForbidden,
    isKnownProduct: isKnownProduct,
    parseSearch: parseSearch,
    quoteHref: quoteHref,
    checkoutBody: checkoutBody
    ,displayOffer: displayOffer
  };
});
