(function (w, d) {
  "use strict";

  var catalog = w.VralOfferCatalog;
  var host = d.getElementById("rack");
  if (!host || !catalog) return;

  var query = catalog.parseSearch(w.location.search);
  var focus = catalog.RACK.indexOf(query.product) !== -1 ? query.product : "business-cards";

  function copy() {
    return w.VralOffersCopy;
  }

  function esc(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/"/g, "&quot;");
  }

  function piece(id) {
    if (id === "business-cards") {
      return '<div class="piece piece-cards"><i class="clip" aria-hidden="true"></i><div class="card-stack"><i></i><i></i><i></i></div></div>';
    }
    if (id === "flyers-postcards") return '<div class="piece piece-flyers"><i class="clip" aria-hidden="true"></i></div>';
    if (id === "brochures-menus") return '<div class="piece piece-menus"><i class="clip" aria-hidden="true"></i><b>Lunch<br>today</b><em>Fold<br>free</em></div>';
    if (id === "banners") return '<div class="piece piece-banner"><i class="clip" aria-hidden="true"></i>Get seen</div>';
    if (id === "window-graphics") return '<div class="piece piece-window"><i class="clip" aria-hidden="true"></i></div>';
    return '<div class="piece piece-aframe"><i class="clip" aria-hidden="true"></i>Open</div>';
  }

  function reggie() {
    if (w.VralReggie && typeof w.VralReggie.svg === "function") return w.VralReggie.svg("looking");
    return (
      '<svg viewBox="0 0 92 92" role="img" aria-label="Reggie">' +
        '<g class="reggie-body">' +
          '<rect x="22" y="28" width="48" height="46" fill="#071fdd" stroke="#070a12" stroke-width="3"/>' +
          '<circle cx="46" cy="28" r="16" fill="#fff" stroke="#070a12" stroke-width="3"/>' +
          '<path d="M46 8v12M40 14h12" stroke="#070a12" stroke-width="3"/>' +
          '<circle class="reggie-eye" cx="40" cy="28" r="3" fill="#070a12"/>' +
          '<circle class="reggie-eye" cx="52" cy="28" r="3" fill="#070a12"/>' +
        "</g>" +
      "</svg>"
    );
  }

  function tickets(product) {
    var c = copy();
    return product.offers.map(function (offer) {
      var href = catalog.quoteHref(product.id, offer.sku, query);
      var label = product.cta === "measure" ? c.t("measure") : c.t("request");
      var cls = product.cta === "measure" ? "ticket ticket-measure" : "ticket";
      return (
        '<a class="' + cls + '" href="' + esc(href) + '" data-sku="' + esc(offer.sku) + '">' +
          "<b>" + esc(offer.priceLabel) + "</b>" +
          "<small>" + esc(offer.detail) + "</small>" +
          '<span class="cta">' + esc(label) + "</span>" +
        "</a>"
      );
    }).join("");
  }

  function render() {
    var c = copy();
    var product = catalog.product(focus);
    var idx = catalog.RACK.indexOf(focus);
    var tabs = catalog.RACK.map(function (id) {
      return (
        '<button type="button" class="rack-tab" data-focus="' + id + '" aria-pressed="' + (id === focus) + '">' +
          esc(c.productName(id)) +
        "</button>"
      );
    }).join("");
    var specimens = catalog.RACK.map(function (id, i) {
      var cls = "specimen";
      if (id === focus) cls += " is-focus";
      else if (i === (idx + 1) % catalog.RACK.length) cls += " is-next";
      return '<div class="' + cls + '" data-specimen="' + id + '">' + piece(id) + "</div>";
    }).join("");

    host.innerHTML =
      '<section class="rack" aria-labelledby="offers-title">' +
        '<div class="shell rack-copy">' +
          '<div class="reggie-slot" data-state="looking" aria-hidden="true">' + reggie() + "</div>" +
          '<h1 id="offers-title">' + esc(c.t("title")) + "</h1>" +
          '<p class="rack-lead">' + esc(c.t("lead")) + "</p>" +
          '<p class="rack-hint">' + esc(c.t("hint")) + "</p>" +
          '<div class="rack-tabs" role="toolbar" aria-label="' + esc(c.t("tabs")) + '">' + tabs + "</div>" +
        "</div>" +
        '<div class="rack-stage">' +
          '<div class="rail" aria-hidden="true"><span></span><span></span></div>' +
          '<div class="shell">' +
            '<div class="specimens">' + specimens + "</div>" +
            '<div class="live" aria-live="polite">' +
              "<div><p>" + esc(c.t("live")) + "</p>" +
              "<h2>" + esc(c.productName(focus)) + "</h2>" +
              "<p>" + esc(c.productDeck(focus)) + "</p></div>" +
            "</div>" +
            '<div class="tickets" aria-label="' + esc(c.t("tickets")) + '">' + tickets(product) + "</div>" +
            (product.designNote
              ? '<div class="stamp"><strong>' + esc(c.t("designWhen")) + "</strong><p>" + esc(c.t("designCards")) + "</p><p>" + esc(c.t("checkoutNote")) + "</p></div>"
              : "") +
          "</div>" +
        "</div>" +
      "</section>" +
      '<div class="shell offers-rest">' +
        '<p>' + esc(c.t("footerNote")) + ' <a href="/quote/index.html?product=packaging&amp;sku=packaging">' + esc(c.t("other")) + "</a></p>" +
      "</div>";
  }

  function setFocus(id) {
    if (catalog.RACK.indexOf(id) === -1) return;
    focus = id;
    render();
    bind();
    var live = host.querySelector(".live h2");
    if (live) live.focus();
  }

  function bind() {
    host.querySelectorAll("[data-focus]").forEach(function (btn) {
      btn.addEventListener("click", function () { setFocus(btn.getAttribute("data-focus")); });
    });
  }

  d.addEventListener("keydown", function (event) {
    if (!host.contains(d.activeElement) && d.activeElement !== d.body) return;
    var idx = catalog.RACK.indexOf(focus);
    if (event.key === "ArrowRight" || event.key === "ArrowDown") {
      event.preventDefault();
      setFocus(catalog.RACK[(idx + 1) % catalog.RACK.length]);
    }
    if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
      event.preventDefault();
      setFocus(catalog.RACK[(idx - 1 + catalog.RACK.length) % catalog.RACK.length]);
    }
  });

  d.documentElement.addEventListener("vral:lang", function () {
    render();
    bind();
  });

  render();
  bind();
})(window, document);
