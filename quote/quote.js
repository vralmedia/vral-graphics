(function (w, d) {
  "use strict";

  var catalog = w.VralOfferCatalog;
  var intake = w.VralQuoteIntake;
  var host = d.getElementById("quote-app");
  if (!host || !catalog || !intake) return;

  var DRAFT_KEY = "vral-quote-draft-v3";
  var query = catalog.parseSearch(w.location.search);
  var state = intake.emptyState();
  var restored = null;
  var sharedDraft = w.VralJobStore ? w.VralJobStore.loadDraft() : null;
  try { restored = JSON.parse(sessionStorage.getItem(DRAFT_KEY) || "null"); } catch (_) {}
  if (sharedDraft) state = intake.restoreDraft(sharedDraft);
  if (restored) state = intake.restoreDraft(Object.assign({}, state, restored));

  state.product = query.product || state.product;
  state.sku = query.sku || state.sku;
  state.source = query.source || state.source;
  state.campaign = query.campaign || state.campaign;
  state.rep_id = query.rep_id || state.rep_id;
  if (query.design === "front" || query.design === "front_back") state.design = query.design;
  intake.applyCatalog(state, catalog);
  if (w.VralSite && w.VralSite.lang) state.language = w.VralSite.lang();
  if (!state.idempotencyKey) state.idempotencyKey = intake.makeIdempotencyKey();

  var stepIndex = 0;
  var errors = [];
  var result = null;
  var sending = false;
  var checkoutUrl = "";
  var uploading = false;
  var FILES = {
    "business-cards": "cards.webp",
    "flyers-postcards": "flyers.webp",
    "brochures-menus": "menus.webp",
    banners: "banners.webp",
    "window-graphics": "windows.webp",
    "signs-aframes": "signs.webp"
  };

  function t(key, vars) { return w.VralQuoteCopy.t(key, vars); }
  function esc(value) {
    return String(value == null ? "" : value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
  }
  function products() { return (w.VralRoutes && w.VralRoutes.PRODUCTS) || []; }
  function productLabel(id) {
    var hit = products().filter(function (item) { return item.id === id; })[0];
    if (!hit) return id;
    return state.language === "es" ? hit.labelEs : hit.labelEn;
  }
  function saveDraft() {
    var safe = intake.sanitizeDraft(state);
    try { sessionStorage.setItem(DRAFT_KEY, JSON.stringify(safe)); } catch (_) {}
    if (w.VralJobStore) w.VralJobStore.saveDraft(safe);
  }
  function currentStep() { return intake.steps(state)[stepIndex] || "contact"; }
  function choice(name, value, label, note) {
    return '<button type="button" class="choice" data-field="' + name + '" data-value="' + esc(value) + '" aria-pressed="' + (state[name] === value) + '"><span>' + esc(label) + "</span>" + (note ? "<small>" + esc(note) + "</small>" : "") + "</button>";
  }
  function field(name, label, attrs, optional) {
    return '<label class="field"><span>' + esc(label) + (optional ? ' <small>' + esc(t("optional")) + "</small>" : "") + '</span><input name="' + name + '" value="' + esc(state[name]) + '" ' + (attrs || "") + " /></label>";
  }
  function textarea(name, label, placeholder, optional) {
    return '<label class="field"><span>' + esc(label) + (optional ? ' <small>' + esc(t("optional")) + "</small>" : "") + '</span><textarea name="' + name + '" placeholder="' + esc(placeholder) + '">' + esc(state[name]) + "</textarea></label>";
  }
  function errorBox() {
    return errors.length ? '<div class="errors" role="alert">' + errors.map(function (code) { return "<div>" + esc(t("err_" + code)) + "</div>"; }).join("") + "</div>" : "";
  }

  function stepProduct() {
    return '<div class="step-heading"><h2>' + esc(t("productQ")) + "</h2><p>" + esc(t("productOnce")) + '</p></div><div class="product-grid">' + products().map(function (item) {
      var image = FILES[item.id];
      return '<button type="button" class="product-pick" data-field="product" data-value="' + esc(item.id) + '" aria-pressed="' + (state.product === item.id) + '">' +
        (image ? '<img src="../assets/products/' + image + '" width="900" height="900" alt="">' : '<span class="product-help-mark">?</span>') +
        "<span>" + esc(productLabel(item.id)) + "</span></button>";
    }).join("") + "</div>";
  }

  function offerChoices(product) {
    if (!product || product.kind === "measure" || !product.offers.length) return "";
    if (product.offers.length === 1) {
      var only = product.offers[0];
      var onlyShown = catalog.displayOffer(only, state.language);
      return '<div class="selected-offer"><strong>' + esc(onlyShown.priceLabel) + "</strong><span>" + esc(onlyShown.detail) + "</span></div>";
    }
    return '<div class="field"><span>' + esc(t("qty")) + '</span><div class="choices offer-list">' + product.offers.map(function (offer) {
      var shown = catalog.displayOffer(offer, state.language);
      return '<button type="button" class="choice offer-choice" data-offer="' + esc(offer.sku) + '" aria-pressed="' + (state.sku === offer.sku) + '"><strong>' + esc(shown.priceLabel) + "</strong><span>" + esc(shown.detail) + "</span></button>";
    }).join("") + "</div></div>";
  }

  function productStrip() {
    var image = FILES[state.product];
    if (!image) return "";
    return '<div class="detail-product"><img src="../assets/products/' + image + '" width="900" height="900" alt=""><strong>' + esc(productLabel(state.product)) + '</strong><button type="button" data-change-product>' + esc(t("change")) + "</button></div>";
  }

  function stepBuild() {
    var product = catalog.product(state.product);
    var body = '<div class="step-heading"><h2>' + esc(t("jobQ")) + "</h2></div>" + productStrip() + offerChoices(product);
    if (intake.needsMeasurements(state.product)) {
      body += '<div class="split">' + field("width", t("width"), 'inputmode="decimal" placeholder="96"') + field("height", t("height"), 'inputmode="decimal" placeholder="48"') + '</div><p class="unit-note">' + esc(t("units")) + "</p>";
    }
    body += textarea("goal", t("goal"), t("goalPh"), state.product !== "unsure" && state.product !== "packaging");
    body += textarea("notes", t("notes"), t("notesShortPh"), true);
    return body;
  }

  function stepArtwork() {
    return '<div class="step-heading"><h2>' + esc(t("artQ")) + '</h2></div><div class="choices choices-2 visual-choices">' +
      choice("artwork", "ready", t("artReady"), t("artReadyNote")) +
      choice("artwork", "adjust", t("artAdjust"), t("artAdjustNote")) +
      choice("artwork", "vral-design", t("artVral"), t("artVralNote")) +
      choice("artwork", "unsure", t("artUnsure"), t("artUnsureNote")) +
      "</div>";
  }

  function stepFulfillment() {
    var body = '<div class="step-heading"><h2>' + esc(t("timeQ")) + '</h2></div><div class="field"><span>' + esc(t("fulfill")) + '</span><div class="choices choices-2">' +
      choice("fulfillment", "pickup", t("pickup")) + choice("fulfillment", "delivery", t("delivery")) + "</div></div>";
    if (state.fulfillment === "delivery") body += field("address", t("address"), 'placeholder="' + esc(t("addressPh")) + '" autocomplete="street-address"');
    body += '<div class="field"><span>' + esc(t("timing")) + '</span><div class="choices choices-2">' +
      choice("timing", "standard", t("timeStandard")) + choice("timing", "date", t("timeDate")) + "</div></div>";
    if (state.timing === "date") body += field("neededBy", t("neededBy"), 'type="date"');
    return body;
  }

  function stepContact() {
    return '<div class="step-heading"><h2>' + esc(t("contactQ")) + "</h2><p>" + esc(t("contactLead")) + '</p></div><div class="split">' +
      field("name", t("name"), 'autocomplete="name"') + field("business", t("business"), 'autocomplete="organization"') + "</div>" +
      '<div class="split">' + field("phone", t("phone"), 'autocomplete="tel" inputmode="tel"') + field("email", t("email"), 'type="email" autocomplete="email"') + "</div>" +
      '<label class="choice consent"><input type="checkbox" name="consentContact"' + (state.consentContact ? " checked" : "") + "><span>" + esc(t("consentContact")) + "</span></label>" +
      '<label class="choice consent"><input type="checkbox" name="consentOffers"' + (state.consentOffers ? " checked" : "") + "><span>" + esc(t("consentOffers")) + "</span></label>" +
      '<div class="honeypot"><label>Website<input name="website" tabindex="-1" autocomplete="off" value="' + esc(state.website) + '"></label></div>';
  }

  function fileStatus() {
    var status = intake.artworkMessage(state.artworkStatus, state.fileName);
    if (status === "stored") return t("fileStored", { id: result && result.body && result.body.id || "" });
    if (status === "failed") return t("fileFailed");
    if (status === "selected") return t("fileSelected", { name: state.fileName });
    return t("fileNone");
  }

  function resultView() {
    if (!result) return "";
    if (!result.ok) {
      var brief = intake.whatsappBrief(state, productLabel(state.product));
      var wa = (w.VralIntake && w.VralIntake.whatsappUrl(brief)) || "https://wa.me/17865911017";
      return '<div class="fallback-block"><h2>' + esc(t("fallbackTitle")) + "</h2><p>" + esc(t("fallback")) + '</p><a class="wa-link" href="' + esc(wa) + '" rel="noopener">' + esc(t("wa")) + "</a></div>";
    }
    var id = result.body && result.body.id;
    var trackingToken = result.body && result.body.trackingToken;
    var jobsHref = w.VralRoutes && w.VralRoutes.jobUrl ? w.VralRoutes.jobUrl(id) : "/jobs/index.html";
    return '<div class="success-block"><div class="success-mark" aria-hidden="true">✓</div><h2>' + esc(t("savedTitle")) + "</h2><p>" + esc(t("success")) + "</p>" +
      '<a class="qbtn qbtn-primary job-link" href="' + esc(jobsHref) + '">' + esc(t("viewJob")) + "</a>" +
      (trackingToken ? '<form class="post-upload"><label class="field"><span>' + esc(t("uploadAfter")) + ' <small>' + esc(t("optional")) + '</small></span><input type="file" name="artworkFile" accept=".pdf,.jpg,.jpeg,.png,.webp,.ai,.eps"></label><button class="qbtn" type="submit"' + (uploading ? " disabled" : "") + ">" + esc(uploading ? t("uploading") : t("upload")) + '</button><p class="file-status">' + esc(fileStatus()) + "</p></form>" : '<p class="file-status">' + esc(t("uploadSecureLater")) + "</p>") +
      (checkoutUrl ? '<a class="qbtn checkout-link" href="' + esc(checkoutUrl) + '">' + esc(t("continuePayment")) + "</a>" : "") +
      '<a class="text-link" href="/">' + esc(t("backHome")) + "</a></div>";
  }

  function ticket() {
    var rows = [[t("productQ"), productLabel(state.product)], [t("qty"), state.quantity], [t("goal"), state.goal], [t("artQ"), state.artwork], [t("fulfill"), state.fulfillment], [t("neededBy"), state.neededBy]].filter(function (row) { return row[1]; });
    return rows.length ? "<dl>" + rows.map(function (row) { return "<div><dt>" + esc(row[0]) + "</dt><dd>" + esc(row[1]) + "</dd></div>"; }).join("") + "</dl>" : '<p class="empty-ticket">' + esc(t("emptyTicket")) + "</p>";
  }

  function bodyFor(step) {
    if (result) return resultView();
    if (step === "product") return stepProduct();
    if (step === "build") return stepBuild();
    if (step === "artwork") return stepArtwork();
    if (step === "fulfillment") return stepFulfillment();
    return stepContact();
  }

  function render() {
    var list = intake.steps(state);
    if (stepIndex >= list.length) stepIndex = list.length - 1;
    var step = currentStep();
    var actions = result ? "" : '<div class="actions">' + (stepIndex > 0 ? '<button type="button" class="qbtn" data-back>' + esc(t("back")) + "</button>" : "") + '<button type="submit" class="qbtn qbtn-primary"' + (sending ? " disabled" : "") + ">" + esc(step === "contact" ? t("send") : t("next")) + "</button></div>";
    host.innerHTML = '<div class="quote-hero"><h1>' + esc(t("title")) + "</h1><p>" + esc(t("leadShort")) + '</p></div><div class="quote-layout"><form class="crop-card quote-form" novalidate><div class="progress"><span>' + esc(t("stepOf", { n: stepIndex + 1, total: list.length })) + '</span><span class="marks" aria-hidden="true">' + list.map(function (_, i) { return "<i class='" + (i <= stepIndex ? "is-on" : "") + "'></i>"; }).join("") + "</span></div>" + errorBox() + bodyFor(step) + actions + '</form><aside class="ticket-aside" aria-live="polite"><div class="ticket-reggie"><img src="../assets/mascot/reggie-static.svg" width="72" height="72" alt=""></div><h2>' + esc(t("ticket")) + "</h2>" + ticket() + "</aside></div>";
    bind();
  }

  function readInputs(form) {
    form.querySelectorAll("input,textarea,select").forEach(function (el) {
      var name = el.getAttribute("name");
      if (!name || name === "artworkFile") return;
      state[name] = el.type === "checkbox" ? el.checked : el.value;
    });
  }

  function selectProduct(id) {
    state.product = id;
    var product = catalog.product(id);
    state.sku = product && product.offers[0] ? product.offers[0].sku : "";
    state.quantity = "";
    intake.applyCatalog(state, catalog);
    saveDraft();
    stepIndex = Math.min(stepIndex + 1, intake.steps(state).length - 1);
    render();
  }

  function bind() {
    var form = host.querySelector(".quote-form");
    if (!form) return;
    host.querySelectorAll("[data-field]").forEach(function (button) {
      button.addEventListener("click", function () {
        var name = button.getAttribute("data-field");
        var value = button.getAttribute("data-value");
        if (name === "product") return selectProduct(value);
        state[name] = value;
        saveDraft();
        render();
      });
    });
    host.querySelectorAll("[data-offer]").forEach(function (button) {
      button.addEventListener("click", function () {
        state.sku = button.getAttribute("data-offer");
        state.quantity = "";
        intake.applyCatalog(state, catalog);
        saveDraft();
        render();
      });
    });
    var change = host.querySelector("[data-change-product]");
    if (change) change.addEventListener("click", function () { state.product = ""; state.sku = ""; stepIndex = 0; saveDraft(); render(); });
    var back = host.querySelector("[data-back]");
    if (back) back.addEventListener("click", function () { readInputs(form); saveDraft(); stepIndex = Math.max(0, stepIndex - 1); render(); });
    form.addEventListener("submit", function (event) {
      event.preventDefault();
      readInputs(form);
      saveDraft();
      errors = intake.validate(state, currentStep());
      if (errors.length) return render();
      if (currentStep() !== "contact") { stepIndex += 1; return render(); }
      send();
    });
    var upload = host.querySelector(".post-upload");
    if (upload) upload.addEventListener("submit", function (event) {
      event.preventDefault();
      var file = upload.querySelector('input[type="file"]').files[0];
      if (file) uploadAfter(file);
    });
  }

  function payloadWithoutPrices() {
    var body = intake.payload(state);
    ["unitCents", "totalCents", "taxCents", "price", "total"].forEach(function (key) { delete body[key]; });
    return body;
  }

  function requestCheckout() {
    if (!catalog.checkoutAllowed(state.sku)) return Promise.resolve();
    var body = catalog.checkoutBody(state.sku, state.design || "front", state.idempotencyKey);
    if (!body) return Promise.resolve();
    return fetch("/api/checkout", { method: "POST", headers: { "content-type": "application/json" }, credentials: "same-origin", body: JSON.stringify(body) })
      .then(function (res) { return res.ok ? res.json() : null; })
      .then(function (json) { if (json && typeof json.checkoutUrl === "string" && /^https:\/\//.test(json.checkoutUrl) && json.status !== "paid") checkoutUrl = json.checkoutUrl; })
      .catch(function () {});
  }

  function send() {
    sending = true;
    render();
    var submit = w.VralIntake && w.VralIntake.submitPrintRequest ? w.VralIntake.submitPrintRequest : function () { return Promise.resolve({ ok: false, status: "BLOCKED", reason: "relay_unavailable" }); };
    submit(payloadWithoutPrices()).then(function (response) {
      result = response;
      sending = false;
      if (!response || !response.ok) return;
      if (w.VralJobStore) w.VralJobStore.recordAccepted(response.body, state, productLabel(state.product));
      try { sessionStorage.removeItem(DRAFT_KEY); } catch (_) {}
      return requestCheckout();
    }).then(render).catch(function () { result = { ok: false, status: "BLOCKED" }; sending = false; render(); });
  }

  function uploadAfter(file) {
    var id = result && result.body && result.body.id;
    if (!id) return;
    uploading = true;
    state.fileName = file.name;
    state.artworkStatus = "selected";
    render();
    var data = new FormData();
    data.append("file", file);
    data.append("sku", state.sku || "");
    fetch("/api/print-requests/" + encodeURIComponent(id) + "/artwork", { method: "POST", credentials: "same-origin", headers: { "x-vral-job-token": result.body.trackingToken || "" }, body: data })
      .then(function (res) { state.artworkStatus = res.ok ? "stored" : "failed"; })
      .catch(function () { state.artworkStatus = "failed"; })
      .then(function () { uploading = false; render(); });
  }

  d.documentElement.addEventListener("vral:lang", function () {
    state.language = w.VralSite && w.VralSite.lang ? w.VralSite.lang() : state.language;
    render();
  });
  render();
})(window, document);
