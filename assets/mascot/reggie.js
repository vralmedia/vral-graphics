/* Reggie — registration-mark mascot. SVG + JS + CSS. No Rive. */
(function (w, d) {
  "use strict";

  var STATES = ["idle", "looking", "product_selected", "thinking", "off_register_error", "approved", "paid"];
  var PRODUCTS = {
    "business-cards": "card",
    "flyers-postcards": "flyer",
    "brochures-menus": "menu",
    banners: "banner",
    "window-graphics": "window",
    "signs-aframes": "aframe",
    packaging: "pack",
    unsure: ""
  };

  var MARKUP =
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240" class="reggie" data-state="idle" focusable="false" aria-hidden="true">' +
      '<g class="reggie-ghosts">' +
        '<circle class="ghost-c" cx="112" cy="114" r="74" fill="#12c7ff"/>' +
        '<circle class="ghost-m" cx="128" cy="122" r="74" fill="#ff2f88"/>' +
        '<circle class="ghost-y" cx="120" cy="108" r="74" fill="#ffd21c"/>' +
      "</g>" +
      '<g class="reggie-marks" fill="none" stroke-width="10" stroke-linecap="square">' +
        '<path class="mark-y" stroke="#ffd21c" d="M28 118h28M42 104v28"/>' +
        '<path class="mark-c" stroke="#12c7ff" transform="rotate(28 188 58)" d="M174 58h28M188 44v28"/>' +
        '<path class="mark-m" stroke="#ff2f88" d="M112 196h28M126 182v28"/>' +
      "</g>" +
      '<g class="reggie-body">' +
        '<circle class="body-disc" cx="120" cy="118" r="74" fill="#071fdd" stroke="#070a12" stroke-width="8"/>' +
        '<rect class="morph morph-card" x="52" y="78" width="136" height="84" rx="8" fill="#071fdd" stroke="#070a12" stroke-width="8"/>' +
        '<rect class="morph morph-flyer" x="70" y="52" width="100" height="140" rx="4" fill="#071fdd" stroke="#070a12" stroke-width="8"/>' +
        '<g class="morph morph-menu"><rect x="58" y="58" width="62" height="124" fill="#12c7ff" stroke="#070a12" stroke-width="7"/><rect x="120" y="58" width="62" height="124" fill="#071fdd" stroke="#070a12" stroke-width="7"/></g>' +
        '<rect class="morph morph-banner" x="28" y="88" width="184" height="64" rx="4" fill="#071fdd" stroke="#070a12" stroke-width="8"/>' +
        '<g class="morph morph-window"><rect x="68" y="48" width="104" height="144" fill="#071fdd" stroke="#070a12" stroke-width="8"/><path d="M120 48v144M68 120h104" stroke="#070a12" stroke-width="6"/></g>' +
        '<g class="morph morph-aframe"><path d="M120 46 L186 186 H54 Z" fill="#071fdd" stroke="#070a12" stroke-width="8" stroke-linejoin="round"/><rect x="92" y="110" width="56" height="36" fill="#fff" stroke="#070a12" stroke-width="5"/></g>' +
        '<g class="morph morph-pack"><path d="M72 92h96l18 28v58H54V120Z" fill="#071fdd" stroke="#070a12" stroke-width="7" stroke-linejoin="round"/><path d="M72 92l48-22 48 22" fill="#12c7ff" stroke="#070a12" stroke-width="7" stroke-linejoin="round"/></g>' +
      "</g>" +
      '<g class="reggie-face">' +
        '<circle class="face-disc" cx="120" cy="118" r="34" fill="#ffffff" stroke="#070a12" stroke-width="6"/>' +
        '<g class="eyes">' +
          '<circle class="eye-l" cx="107" cy="114" r="6.5" fill="#070a12"/>' +
          '<circle class="eye-r" cx="133" cy="114" r="6.5" fill="#070a12"/>' +
          '<circle class="pupil-l" cx="107" cy="114" r="2.4" fill="#f6f7fb"/>' +
          '<circle class="pupil-r" cx="133" cy="114" r="2.4" fill="#f6f7fb"/>' +
        "</g>" +
        '<path class="mouth mouth-idle" d="M108 130c6 10 18 10 24 0" fill="none" stroke="#070a12" stroke-width="5" stroke-linecap="round"/>' +
        '<path class="mouth mouth-think" d="M112 132h16" fill="none" stroke="#070a12" stroke-width="5" stroke-linecap="round"/>' +
        '<path class="mouth mouth-joy" d="M106 128c7 14 21 14 28 0" fill="none" stroke="#070a12" stroke-width="5" stroke-linecap="round"/>' +
        '<path class="check" d="M108 118l8 8 16-16" fill="none" stroke="#070a12" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>' +
      "</g>" +
    "</svg>";

  var instances = [];
  var reduced = false;
  try {
    reduced = w.matchMedia && w.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch (err) {
    reduced = false;
  }

  function announce(state, product) {
    var live = d.querySelector("[data-reggie-live]");
    var i18n = w.VG_I18N;
    if (!live || !i18n) return;
    var map = {
      idle: "reggieIdle",
      looking: "reggieLooking",
      product_selected: "reggieProduct",
      thinking: "reggieThinking",
      off_register_error: "reggieError",
      approved: "reggieApproved",
      paid: "reggiePaid"
    };
    live.textContent = i18n.t(map[state] || "reggieIdle", { product: product || "" });
  }

  function paint(node, state, product) {
    var svg = node.querySelector("svg.reggie");
    if (!svg) return;
    svg.setAttribute("data-state", state);
    svg.setAttribute("data-morph", PRODUCTS[product] || "");
    node.setAttribute("data-state", state);
    node.setAttribute("data-morph", PRODUCTS[product] || "");
  }

  function mount(root) {
    if (!root || root.querySelector("svg.reggie")) return;
    var wrap = d.createElement("div");
    wrap.className = "reggie-live";
    wrap.innerHTML = MARKUP;
    var fallback = root.querySelector(".reggie-fallback");
    root.appendChild(wrap);
    if (fallback) fallback.setAttribute("hidden", "");
    root.removeAttribute("hidden");
    root.setAttribute("role", "img");
    root.setAttribute("aria-label", "Reggie, Vral Graphics registration mark");
    instances.push({ root: root, state: "idle", product: "" });
    paint(root, "idle", "");
  }

  function setState(state, product) {
    if (STATES.indexOf(state) === -1) return;
    instances.forEach(function (item) {
      item.state = state;
      if (typeof product === "string") item.product = product;
      if (state !== "product_selected") item.product = product || item.product;
      if (state === "idle") item.product = "";
      paint(item.root, item.state, item.product);
    });
    announce(state, product || "");
  }

  function setProduct(id) {
    if (!id || id === "unsure") {
      setState("looking", "");
      return;
    }
    setState("product_selected", id);
  }

  function lookAt(clientX, clientY) {
    if (reduced) return;
    instances.forEach(function (item) {
      if (item.state !== "idle" && item.state !== "looking") return;
      var svg = item.root.querySelector("svg.reggie");
      if (!svg) return;
      var box = svg.getBoundingClientRect();
      var nx = ((clientX - box.left) / box.width - 0.5) * 2;
      var ny = ((clientY - box.top) / box.height - 0.5) * 2;
      nx = Math.max(-1, Math.min(1, nx));
      ny = Math.max(-1, Math.min(1, ny));
      svg.style.setProperty("--look-x", (nx * 4).toFixed(2) + "px");
      svg.style.setProperty("--look-y", (ny * 3).toFixed(2) + "px");
      if (item.state === "idle") {
        item.state = "looking";
        paint(item.root, "looking", "");
      }
    });
  }

  function resetLook() {
    instances.forEach(function (item) {
      var svg = item.root.querySelector("svg.reggie");
      if (svg) {
        svg.style.setProperty("--look-x", "0px");
        svg.style.setProperty("--look-y", "0px");
      }
      if (item.state === "looking") {
        item.state = "idle";
        paint(item.root, "idle", "");
      }
    });
  }

  function boot() {
    d.querySelectorAll("[data-reggie]").forEach(mount);
    if (reduced) d.documentElement.classList.add("reggie-static");
  }

  w.VralReggie = {
    STATES: STATES,
    PRODUCTS: PRODUCTS,
    reducedMotion: reduced,
    mount: mount,
    setState: setState,
    setProduct: setProduct,
    lookAt: lookAt,
    resetLook: resetLook,
    instances: instances
  };

  if (d.readyState === "loading") d.addEventListener("DOMContentLoaded", boot);
  else boot();
})(window, document);
