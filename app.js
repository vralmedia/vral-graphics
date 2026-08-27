(function () {
  "use strict";

  var PRODUCTS = {
    "business-cards": { title: "cards", use: "cardsUse", image: "assets/products/cards.webp", alt: "cardsAlt" },
    "flyers-postcards": { title: "flyers", use: "flyersUse", image: "assets/products/flyers.webp", alt: "flyersAlt" },
    "brochures-menus": { title: "menus", use: "menusUse", image: "assets/products/menus.webp", alt: "menusAlt" },
    banners: { title: "banners", use: "bannersUse", image: "assets/products/banners.webp", alt: "bannersAlt" },
    "window-graphics": { title: "windows", use: "windowsUse", image: "assets/products/windows.webp", alt: "windowsAlt" },
    "signs-aframes": { title: "signs", use: "signsUse", image: "assets/products/signs.webp", alt: "signsAlt" }
  };
  var selected = "business-cards";

  function t(key) { return window.VG_I18N ? window.VG_I18N.t(key) : key; }
  function escapeHTML(value) {
    return String(value || "").replace(/[&<>'"]/g, function (char) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[char];
    });
  }

  function offerRows(id) {
    var catalog = window.VralOfferCatalog;
    var product = catalog && catalog.product(id);
    if (!product) return "";
    return product.offers.slice(0, 2).map(function (offer) {
      return '<div class="offer-chip"><strong>' + escapeHTML(offer.priceLabel) + '</strong><span>' + escapeHTML(offer.detail) + "</span></div>";
    }).join("");
  }

  function actions(id) {
    var catalog = window.VralOfferCatalog;
    var product = catalog && catalog.product(id);
    var sku = product && product.offers[0] ? product.offers[0].sku : "";
    var href = catalog ? catalog.quoteHref(id, sku, { source: "live-desk" }) : "/quote/index.html?product=" + encodeURIComponent(id);
    var primary = product && product.kind === "measure" ? t("measureMine") : t("chooseThis");
    return '<a class="button-primary" href="' + escapeHTML(href) + '">' + escapeHTML(primary) + '</a><a class="button-secondary" href="/offers/index.html#' + escapeHTML(id) + '">' + escapeHTML(t("allOptions")) + "</a>";
  }

  function renderProduct(id, announce) {
    var data = PRODUCTS[id] || PRODUCTS["business-cards"];
    var card = document.querySelector(".active-job");
    if (!card) return;
    selected = id;
    card.classList.add("is-changing");
    window.setTimeout(function () {
      var image = card.querySelector("[data-active-image]");
      image.src = data.image;
      image.alt = t(data.alt);
      card.querySelector("[data-active-title]").textContent = t(data.title);
      card.querySelector("[data-active-use]").textContent = t(data.use);
      card.querySelector("[data-active-offers]").innerHTML = offerRows(id);
      card.querySelector("[data-active-actions]").innerHTML = actions(id);
      card.setAttribute("data-active-product", id);
      card.classList.remove("is-changing");
    }, 145);

    document.querySelectorAll(".product-object").forEach(function (button) {
      var on = button.getAttribute("data-product") === id;
      button.classList.toggle("is-selected", on);
      button.setAttribute("aria-pressed", on ? "true" : "false");
    });
    if (window.VralReggie) window.VralReggie.setProduct(id);
    if (announce) {
      var live = document.querySelector("[data-live-product]");
      if (live) live.textContent = t("selectedProduct") + " " + t(data.title) + ".";
    }
  }

  function applyCopy() {
    if (window.VG_I18N) window.VG_I18N.apply(document);
    document.title = t("pageTitle");
    renderProduct(selected, false);
  }

  function bindProducts() {
    document.querySelectorAll(".product-object").forEach(function (button) {
      button.addEventListener("click", function () { renderProduct(button.getAttribute("data-product"), true); });
      button.addEventListener("pointerenter", function () {
        if (window.VralReggie) window.VralReggie.setProduct(button.getAttribute("data-product"));
      });
      button.addEventListener("pointerleave", function () {
        if (window.VralReggie) window.VralReggie.setProduct(selected);
      });
    });
  }

  function bindReggie() {
    if (!window.VralReggie) return;
    document.addEventListener("pointermove", function (event) {
      if (!window.VralReggie.reducedMotion) window.VralReggie.lookAt(event.clientX, event.clientY);
    });
  }

  document.documentElement.addEventListener("vral:lang", function () { window.setTimeout(applyCopy, 0); });
  applyCopy();
  bindProducts();
  bindReggie();
  renderProduct(selected, false);
})();
