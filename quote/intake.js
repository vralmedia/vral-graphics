(function (root, factory) {
  "use strict";
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.VralQuoteIntake = api;
})(typeof window !== "undefined" ? window : globalThis, function () {
  "use strict";

  var SENSITIVE = ["name", "phone", "email", "address", "business"];
  var DRAFT_KEYS = [
    "product", "sku", "goal", "quantity", "size", "sides", "folding", "design",
    "width", "height", "install", "notes", "artwork", "timing", "neededBy",
    "fulfillment", "language", "source", "campaign", "rep_id"
  ];

  function emptyState() {
    return {
      product: "",
      sku: "",
      offer: "",
      design: "",
      goal: "",
      quantity: "",
      size: "",
      sides: "",
      folding: "",
      width: "",
      height: "",
      install: "",
      notes: "",
      artwork: "",
      fileName: "",
      fileType: "",
      fileSize: 0,
      artworkStatus: "none",
      timing: "standard",
      neededBy: "",
      fulfillment: "pickup",
      address: "",
      name: "",
      business: "",
      phone: "",
      email: "",
      language: "en",
      consentContact: false,
      consentOffers: false,
      website: "",
      source: "",
      campaign: "",
      rep_id: "",
      idempotencyKey: ""
    };
  }

  function needsProductStep(state) {
    return !state.product;
  }

  function needsMeasurements(product) {
    return product === "banners" || product === "window-graphics";
  }

  function skipSpecs(product) {
    return product === "unsure" || product === "packaging";
  }

  function steps(state) {
    var list = [];
    if (needsProductStep(state)) list.push("product");
    list.push("details", "contact");
    return list;
  }

  function makeIdempotencyKey() {
    var chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_-";
    var out = "";
    var i;
    for (i = 0; i < 24; i += 1) out += chars.charAt(Math.floor(Math.random() * chars.length));
    return out;
  }

  function applyCatalog(state, catalog) {
    if (!catalog || typeof catalog.bySku !== "function") return state;
    if (state.offer && !state.sku) state.sku = state.offer;
    if (typeof catalog.isForbidden === "function" && catalog.isForbidden(state.sku)) state.sku = "";
    var hit = catalog.bySku(state.sku);
    if (!hit) return state;
    state.product = state.product || hit.productId;
    if (hit.offer.qty && !state.quantity) state.quantity = String(hit.offer.qty);
    if (hit.product.size && !state.size) state.size = hit.product.size;
    if (hit.product.folding && !state.folding) state.folding = hit.product.folding;
    if (hit.sku === "flyer_5000_4x6_twosided") {
      if (!state.size) state.size = "4 × 6";
      if (!state.sides) state.sides = "two";
    }
    if (hit.sku === "business_card_1000_free_when_vral_designs" && !state.artwork) {
      state.artwork = "vral-design";
    }
    return state;
  }

  function validate(state, step) {
    var errors = [];
    if (step === "product" && !state.product) errors.push("need_product");
    if (step === "details") {
      if ((state.product === "unsure" || state.product === "packaging") && !state.goal) errors.push("need_goal");
      if (needsMeasurements(state.product)) {
        if (!state.width || !state.height) errors.push("need_measure");
      }
      if (!state.fulfillment) errors.push("need_fulfillment");
      if ((state.fulfillment === "delivery" || state.install === "yes") && !state.address) errors.push("need_address");
      if (!state.artwork) errors.push("need_artwork");
    }
    if (step === "contact") {
      if (!state.name) errors.push("need_name");
      if (!state.business) errors.push("need_business");
      if (!state.phone) errors.push("need_phone");
      if (!state.email) errors.push("need_email");
      if (state.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(state.email)) errors.push("bad_email");
      if (state.phone && String(state.phone).replace(/\D/g, "").length < 7) errors.push("bad_phone");
      if (!state.consentContact) errors.push("need_consent");
    }
    return errors;
  }

  function sanitizeDraft(state) {
    var draft = {};
    DRAFT_KEYS.forEach(function (key) {
      if (state[key] !== "" && state[key] != null) draft[key] = state[key];
    });
    return draft;
  }

  function restoreDraft(raw) {
    var state = emptyState();
    var data = raw && typeof raw === "object" ? raw : {};
    DRAFT_KEYS.forEach(function (key) {
      if (data[key] != null && data[key] !== "") state[key] = data[key];
    });
    SENSITIVE.forEach(function (key) { state[key] = ""; });
    state.consentContact = false;
    state.consentOffers = false;
    state.website = "";
    state.fileName = "";
    state.artworkStatus = "none";
    return state;
  }

  function artworkMessage(status, fileName) {
    if (status === "stored") return "stored";
    if (status === "selected") return "selected";
    if (status === "failed") return "failed";
    if (fileName) return "selected";
    return "none";
  }

  function neverFilenameSuccess(status) {
    return status !== "stored";
  }

  function payload(state) {
    return {
      product: state.product,
      sku: state.sku || null,
      goal: state.goal,
      quantity: state.quantity,
      specifications: {
        size: state.size,
        sides: state.sides,
        folding: state.folding,
        width: state.width,
        height: state.height,
        install: state.install,
        notes: state.notes,
        design: state.design || null
      },
      artwork: {
        mode: state.artwork,
        fileName: state.fileName || null,
        status: state.artworkStatus === "stored" ? "stored" : (state.fileName ? "selected_on_device" : "none")
      },
      timing: { pace: state.timing, neededBy: state.neededBy },
      fulfillment: state.fulfillment,
      address: state.address || (state.fulfillment === "pickup" ? "Pickup — Miami, Florida" : ""),
      name: state.name,
      business: state.business,
      phone: state.phone,
      email: state.email,
      language: state.language,
      consentContact: state.consentContact === true,
      consentOffers: state.consentOffers === true,
      website: state.website || "",
      idempotencyKey: state.idempotencyKey,
      source: state.source || "quote",
      campaign: state.campaign || "",
      rep_id: state.rep_id || ""
    };
  }

  function whatsappBrief(state, productLabel) {
    var lines = [
      "Hello Vral Graphics. Print request.",
      "Product: " + (productLabel || state.product || "unspecified"),
      state.sku ? "SKU: " + state.sku : "",
      state.quantity ? "Quantity: " + state.quantity : "",
      state.goal ? "Goal: " + state.goal : "",
      state.size ? "Size: " + state.size : "",
      state.width && state.height ? "Measure: " + state.width + " × " + state.height : "",
      state.artwork ? "Artwork: " + state.artwork : "",
      state.fulfillment ? "Fulfillment: " + state.fulfillment : "",
      state.timing ? "Timing: " + state.timing : "",
      state.notes ? "Notes: " + state.notes : ""
    ];
    return lines.filter(Boolean).join("\n");
  }

  return {
    SENSITIVE: SENSITIVE,
    emptyState: emptyState,
    steps: steps,
    needsProductStep: needsProductStep,
    needsMeasurements: needsMeasurements,
    skipSpecs: skipSpecs,
    makeIdempotencyKey: makeIdempotencyKey,
    applyCatalog: applyCatalog,
    validate: validate,
    sanitizeDraft: sanitizeDraft,
    restoreDraft: restoreDraft,
    artworkMessage: artworkMessage,
    neverFilenameSuccess: neverFilenameSuccess,
    payload: payload,
    whatsappBrief: whatsappBrief
  };
});
