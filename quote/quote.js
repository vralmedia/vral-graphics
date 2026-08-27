(function (w, d) {
  "use strict";

  var catalog = w.VralOfferCatalog;
  var intake = w.VralQuoteIntake;
  var host = d.getElementById("quote-app");
  if (!host || !catalog || !intake) return;

  var DRAFT_KEY = "vral-quote-draft-v1";
  var query = catalog.parseSearch(w.location.search);
  var state = intake.emptyState();
  var restored = null;
  try { restored = JSON.parse(sessionStorage.getItem(DRAFT_KEY) || "null"); } catch (err) { restored = null; }
  if (restored) state = intake.restoreDraft(restored);
  state.product = query.product || state.product;
  state.sku = query.sku || state.sku;
  state.source = query.source || state.source;
  state.campaign = query.campaign || state.campaign;
  state.rep_id = query.rep_id || state.rep_id;
  if (query.design === "front" || query.design === "front_back") state.design = query.design;
  intake.applyCatalog(state, catalog);
  if (w.VralSite && typeof w.VralSite.lang === "function") state.language = w.VralSite.lang();
  if (!state.idempotencyKey) state.idempotencyKey = intake.makeIdempotencyKey();

  var stepIndex = 0;
  var errors = [];
  var result = null;
  var pendingFile = null;
  var sending = false;

  function t(key, vars) {
    return w.VralQuoteCopy.t(key, vars);
  }

  function esc(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/"/g, "&quot;");
  }

  function products() {
    return (w.VralRoutes && w.VralRoutes.PRODUCTS) || [];
  }

  function productLabel(id) {
    var lang = state.language === "es" ? "es" : "en";
    var hit = products().filter(function (item) { return item.id === id; })[0];
    if (!hit) return id;
    return lang === "es" ? hit.labelEs : hit.labelEn;
  }

  function saveDraft() {
    try { sessionStorage.setItem(DRAFT_KEY, JSON.stringify(intake.sanitizeDraft(state))); } catch (err) {}
  }

  function currentStep() {
    return intake.steps(state)[stepIndex] || "review";
  }

  function choice(name, value, label) {
    var on = state[name] === value;
    return (
      '<button type="button" class="choice" data-field="' + name + '" data-value="' + esc(value) + '" aria-pressed="' + on + '">' +
        esc(label) +
      "</button>"
    );
  }

  function field(name, label, attrs) {
    return (
      '<label class="field"><span>' + esc(label) + "</span>" +
      '<input name="' + name + '" value="' + esc(state[name]) + '" ' + (attrs || "") + " /></label>"
    );
  }

  function errorBox() {
    if (!errors.length) return "";
    return '<div class="errors" role="alert">' + errors.map(function (code) {
      return "<div>" + esc(t("err_" + code)) + "</div>";
    }).join("") + "</div>";
  }

  function stepProduct() {
    return (
      "<h2>" + esc(t("productQ")) + "</h2>" +
      "<p>" + esc(t("productOnce")) + "</p>" +
      '<div class="product-grid">' +
        products().map(function (item) {
          var on = state.product === item.id;
          return (
            '<button type="button" class="product-pick" data-field="product" data-value="' + esc(item.id) + '" aria-pressed="' + on + '">' +
              esc(productLabel(item.id)) +
            "</button>"
          );
        }).join("") +
      "</div>"
    );
  }

  function stepJob() {
    return (
      "<h2>" + esc(t("jobQ")) + "</h2>" +
      '<label class="field"><span>' + esc(t("goal")) + "</span>" +
      '<textarea name="goal" placeholder="' + esc(t("goalPh")) + '">' + esc(state.goal) + "</textarea></label>" +
      (state.product === "unsure" ? "" : field("quantity", t("qty"), 'inputmode="numeric" placeholder="' + esc(t("qtyPh")) + '"'))
    );
  }

  function stepSpecs() {
    var body = "<h2>" + esc(t("specsQ")) + "</h2>";
    if (state.product === "business-cards") {
      body += '<div class="field"><span>' + esc(t("design")) + '</span><div class="choices">' +
        choice("design", "front", t("designFront")) +
        choice("design", "front_back", t("designBoth")) +
        "</div></div>";
      body += '<div class="field"><span>' + esc(t("sides")) + '</span><div class="choices">' +
        choice("sides", "front", t("sidesFront")) +
        choice("sides", "two", t("sidesTwo")) +
        "</div></div>";
    } else if (state.product === "flyers-postcards") {
      body += field("size", t("size"), 'placeholder="4 × 6"');
      body += '<div class="field"><span>' + esc(t("sides")) + '</span><div class="choices">' +
        choice("sides", "front", t("sidesFront")) +
        choice("sides", "two", t("sidesTwo")) +
        "</div></div>";
    } else if (state.product === "brochures-menus") {
      body += '<p>' + esc(t("foldFree")) + "</p>";
      body += '<div class="field"><span>' + esc(t("folding")) + '</span><div class="choices">' +
        choice("folding", "free", t("foldFree")) +
        choice("folding", "half", t("foldHalf")) +
        choice("folding", "tri", t("foldTri")) +
        "</div></div>";
    } else if (intake.needsMeasurements(state.product)) {
      body += '<div class="split">' + field("width", t("width"), 'inputmode="decimal"') + field("height", t("height"), 'inputmode="decimal"') + "</div>";
      body += '<p>' + esc(t("units")) + "</p>";
      body += '<div class="field"><span>' + esc(t("install")) + '</span><div class="choices">' +
        choice("install", "yes", t("installYes")) +
        choice("install", "no", t("installNo")) +
        "</div></div>";
    }
    body += '<label class="field"><span>' + esc(t("notes")) + "</span>" +
      '<textarea name="notes" placeholder="' + esc(t("notesPh")) + '">' + esc(state.notes) + "</textarea></label>";
    return body;
  }

  function fileStatus() {
    var status = intake.artworkMessage(state.artworkStatus, state.fileName);
    if (status === "stored") return t("fileStored", { id: result && result.id ? result.id : "" });
    if (status === "selected" || status === "failed") return t(status === "failed" ? "fileFailed" : "fileSelected", { name: state.fileName });
    return t("fileNone");
  }

  function stepArtwork() {
    return (
      "<h2>" + esc(t("artQ")) + "</h2>" +
      '<div class="choices">' +
        choice("artwork", "ready", t("artReady")) +
        choice("artwork", "adjust", t("artAdjust")) +
        choice("artwork", "vral-design", t("artVral")) +
        choice("artwork", "unsure", t("artUnsure")) +
      "</div>" +
      '<label class="field"><span>' + esc(t("file")) + '</span><input type="file" name="artworkFile" /></label>' +
      '<p class="file-status">' + esc(fileStatus()) + "</p>"
    );
  }

  function stepTiming() {
    return (
      "<h2>" + esc(t("timeQ")) + "</h2>" +
      '<div class="field"><span>' + esc(t("timing")) + '</span><div class="choices">' +
        choice("timing", "standard", t("timeStandard")) +
        choice("timing", "date", t("timeDate")) +
      "</div></div>" +
      (state.timing === "date" ? field("neededBy", t("neededBy"), 'type="date"') : "") +
      '<div class="field"><span>' + esc(t("fulfill")) + '</span><div class="choices">' +
        choice("fulfillment", "pickup", t("pickup")) +
        choice("fulfillment", "delivery", t("delivery")) +
      "</div></div>" +
      (state.fulfillment === "delivery" || state.install === "yes"
        ? field("address", t("address"), 'placeholder="' + esc(t("addressPh")) + '" autocomplete="street-address"')
        : "")
    );
  }

  function stepContact() {
    return (
      "<h2>" + esc(t("contactQ")) + "</h2>" +
      field("name", t("name"), 'autocomplete="name"') +
      field("business", t("business"), 'autocomplete="organization"') +
      field("phone", t("phone"), 'autocomplete="tel" inputmode="tel"') +
      field("email", t("email"), 'type="email" autocomplete="email"') +
      '<div class="field"><span>' + esc(t("langPref")) + '</span><div class="choices">' +
        choice("language", "en", "English") +
        choice("language", "es", "Español") +
      "</div></div>" +
      '<label class="choice"><input type="checkbox" name="consentContact"' + (state.consentContact ? " checked" : "") + " /> " + esc(t("consentContact")) + "</label>" +
      '<label class="choice"><input type="checkbox" name="consentOffers"' + (state.consentOffers ? " checked" : "") + " /> " + esc(t("consentOffers")) + "</label>" +
      '<div class="honeypot"><label>Website<input name="website" tabindex="-1" autocomplete="off" value="' + esc(state.website) + '" /></label></div>'
    );
  }

  function reviewRow(label, value) {
    if (!value) return "";
    return "<div><dt>" + esc(label) + "</dt><dd>" + esc(value) + "</dd></div>";
  }

  function stepReview() {
    return (
      "<h2>" + esc(t("reviewQ")) + "</h2>" +
      "<dl>" +
        reviewRow(t("productQ"), productLabel(state.product)) +
        reviewRow("SKU", state.sku) +
        reviewRow(t("qty"), state.quantity) +
        reviewRow(t("goal"), state.goal) +
        reviewRow(t("design"), state.design) +
        reviewRow(t("size"), state.size || (state.width && state.height ? state.width + " × " + state.height : "")) +
        reviewRow(t("file"), fileStatus()) +
      "</dl>"
    );
  }

  function resultView() {
    if (!result) return "";
    if (result.ok) {
      return (
        '<div class="success-block">' +
          "<h2>" + esc(t("success")) + "</h2>" +
          '<p class="file-status">' + esc(fileStatus()) + "</p>" +
          '<a class="qbtn" href="/quote/index.html">' + esc(t("another")) + "</a>" +
        "</div>"
      );
    }
    var brief = intake.whatsappBrief(state, productLabel(state.product));
    var wa = (w.VralIntake && w.VralIntake.whatsappUrl(brief)) || "https://wa.me/17865911017";
    return (
      '<div class="fallback-block">' +
        "<h2>" + esc(t("fallback")) + "</h2>" +
        '<a class="wa-link" href="' + esc(wa) + '" rel="noopener">' + esc(t("wa")) + "</a>" +
      "</div>"
    );
  }

  function ticket() {
    var rows = [
      ["Need", productLabel(state.product)],
      ["SKU", state.sku],
      ["Qty", state.quantity],
      ["Goal", state.goal]
    ].filter(function (row) { return row[1]; });
    if (!rows.length) return '<p class="empty-ticket">' + esc(t("emptyTicket")) + "</p>";
    return "<dl>" + rows.map(function (row) {
      return "<div><dt>" + esc(row[0]) + "</dt><dd>" + esc(row[1]) + "</dd></div>";
    }).join("") + "</dl>";
  }

  function render() {
    var list = intake.steps(state);
    if (stepIndex >= list.length) stepIndex = list.length - 1;
    var step = currentStep();
    var body = "";
    if (result) body = resultView();
    else if (step === "product") body = stepProduct();
    else if (step === "job") body = stepJob();
    else if (step === "specs") body = stepSpecs();
    else if (step === "artwork") body = stepArtwork();
    else if (step === "timing") body = stepTiming();
    else if (step === "contact") body = stepContact();
    else body = stepReview();

    var actions = "";
    if (!result) {
      actions =
        '<div class="actions">' +
          (stepIndex > 0 ? '<button type="button" class="qbtn" data-back>' + esc(t("back")) + "</button>" : "") +
          (step === "review"
            ? '<button type="submit" class="qbtn qbtn-primary"' + (sending ? " disabled" : "") + ">" + esc(t("send")) + "</button>"
            : '<button type="submit" class="qbtn qbtn-primary">' + esc(t("next")) + "</button>") +
        "</div>";
    }

    host.innerHTML =
      '<div class="quote-hero"><h1>' + esc(t("title")) + "</h1><p>" + esc(t("lead")) + "</p></div>" +
      '<div class="quote-layout">' +
        '<form class="crop-card quote-form" novalidate>' +
          '<div class="progress"><span>' + esc(t("stepOf", { n: stepIndex + 1, total: list.length })) + "</span>" +
          '<span class="marks" aria-hidden="true">' + list.map(function (_, i) {
            return "<i class='" + (i <= stepIndex ? "is-on" : "") + "'></i>";
          }).join("") + "</span></div>" +
          errorBox() + body + actions +
        "</form>" +
        '<aside class="ticket-aside" aria-live="polite"><h2>' + esc(t("ticket")) + "</h2>" + ticket() + "</aside>" +
      "</div>";
    bind();
  }

  function readInputs(form) {
    form.querySelectorAll("input, textarea, select").forEach(function (el) {
      var name = el.getAttribute("name");
      if (!name || name === "artworkFile") return;
      if (el.type === "checkbox") state[name] = el.checked;
      else state[name] = el.value;
    });
  }

  function bind() {
    var form = host.querySelector("form");
    if (!form) return;
    host.querySelectorAll("[data-field]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        state[btn.getAttribute("data-field")] = btn.getAttribute("data-value");
        if (btn.getAttribute("data-field") === "product") {
          var first = (catalog.product(state.product) || {}).offers;
          if (first && first[0] && !query.sku) state.sku = first[0].sku;
          intake.applyCatalog(state, catalog);
          stepIndex = 0;
        }
        saveDraft();
        render();
      });
    });
    var file = form.querySelector('input[name="artworkFile"]');
    if (file) {
      file.addEventListener("change", function () {
        var picked = file.files && file.files[0];
        pendingFile = picked || null;
        state.fileName = picked ? picked.name : "";
        state.fileType = picked ? picked.type : "";
        state.fileSize = picked ? picked.size : 0;
        state.artworkStatus = picked ? "selected" : "none";
        render();
      });
    }
    var back = host.querySelector("[data-back]");
    if (back) back.addEventListener("click", function () {
      readInputs(form);
      stepIndex = Math.max(0, stepIndex - 1);
      render();
    });
    form.addEventListener("submit", function (event) {
      event.preventDefault();
      readInputs(form);
      saveDraft();
      var step = currentStep();
      errors = intake.validate(state, step);
      if (errors.length) { render(); return; }
      var list = intake.steps(state);
      if (step !== "review") {
        stepIndex = Math.min(list.length - 1, stepIndex + 1);
        render();
        return;
      }
      send();
    });
  }

  function payloadWithoutPrices() {
    var body = intake.payload(state);
    delete body.unitCents;
    delete body.totalCents;
    delete body.taxCents;
    delete body.price;
    delete body.total;
    return body;
  }

  function uploadAfter(id) {
    if (!pendingFile || !id) {
      if (state.fileName && state.artworkStatus !== "stored") state.artworkStatus = "selected";
      return Promise.resolve();
    }
    var data = new FormData();
    data.append("file", pendingFile);
    data.append("sku", state.sku || "");
    return fetch("/api/print-requests/" + encodeURIComponent(id) + "/artwork", {
      method: "POST",
      credentials: "same-origin",
      body: data
    }).then(function (res) {
      state.artworkStatus = res.ok ? "stored" : "failed";
    }).catch(function () {
      state.artworkStatus = "failed";
    });
  }

  function maybeCheckout() {
    if (!catalog.checkoutAllowed(state.sku)) return Promise.resolve(null);
    var body = catalog.checkoutBody(state.sku, state.design || "front", state.idempotencyKey);
    if (!body) return Promise.resolve(null);
    return fetch("/api/checkout", {
      method: "POST",
      headers: { "content-type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify(body)
    }).then(function (res) {
      if (!res.ok) return null;
      return res.json().catch(function () { return null; });
    }).then(function (json) {
      if (json && typeof json.checkoutUrl === "string" && /^https:\/\//.test(json.checkoutUrl) && json.status !== "paid") {
        w.location.href = json.checkoutUrl;
      }
      return json;
    }).catch(function () { return null; });
  }

  function send() {
    sending = true;
    render();
    var submit = w.VralIntake && w.VralIntake.submitPrintRequest
      ? w.VralIntake.submitPrintRequest
      : function () { return Promise.resolve({ ok: false, status: "BLOCKED", reason: "relay_unavailable" }); };
    submit(payloadWithoutPrices()).then(function (res) {
      result = res;
      var id = res && res.body && res.body.id;
      return uploadAfter(id).then(function () {
        if (res && res.ok) return maybeCheckout();
        return null;
      });
    }).then(function () {
      sending = false;
      saveDraft();
      render();
    });
  }

  d.documentElement.addEventListener("vral:lang", function () {
    if (w.VralSite && typeof w.VralSite.lang === "function") state.language = w.VralSite.lang();
    render();
  });

  render();
})(window, document);
