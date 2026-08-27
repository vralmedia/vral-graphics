(function (w, d) {
  "use strict";

  var COPY = {
    en: {
      skip: "Skip to content",
      need: "What do you need?",
      offers: "Offers",
      how: "How it works",
      language: "Language",
      explore: "Explore",
      contact: "Contact",
      legal: "Legal",
      help: "Get help choosing",
      privacy: "Privacy",
      terms: "Terms",
      accessibility: "Accessibility",
      payment: "Payment terms",
      slogan: "Quality Printing for Less.",
      part: "Part of Vral Media.",
      menu: "Menu",
      copyright: "© 2026 Vral Graphics. Part of Vral Media.",
    },
    es: {
      skip: "Saltar al contenido",
      need: "¿Qué necesitas?",
      offers: "Ofertas",
      how: "Cómo funciona",
      language: "Idioma",
      explore: "Explorar",
      contact: "Contacto",
      legal: "Legal",
      help: "Ayúdame a elegir",
      privacy: "Privacidad",
      terms: "Términos",
      accessibility: "Accesibilidad",
      payment: "Términos de pago",
      slogan: "Quality Printing for Less.",
      part: "Parte de Vral Media.",
      menu: "Menú",
      copyright: "© 2026 Vral Graphics. Parte de Vral Media.",
    },
  };

  function lang() {
    try {
      return localStorage.getItem("vral-lang") === "es" ? "es" : "en";
    } catch (err) {
      return d.documentElement.lang === "es" ? "es" : "en";
    }
  }

  function setLang(next) {
    try { localStorage.setItem("vral-lang", next); } catch (err) {}
    d.documentElement.lang = next;
    d.documentElement.dispatchEvent(new CustomEvent("vral:lang", { detail: { lang: next } }));
    render();
  }

  function t(key) {
    var table = COPY[lang()] || COPY.en;
    return table[key] || COPY.en[key] || key;
  }

  function routes() {
    return (w.VralRoutes && w.VralRoutes.ROUTES) || {
      home: "/",
      need: "/#need",
      how: "/#how",
      offers: "/offers/index.html",
      help: "/quote/index.html?product=unsure",
      privacy: "/#privacy",
      terms: "/#terms",
      accessibility: "/#accessibility",
      paymentTerms: "/#payment-terms",
    };
  }

  function contact() {
    return (w.VralRoutes && w.VralRoutes.CONTACT) || {
      email: "info@vralmedia.com",
      whatsappDigits: "17865911017",
      whatsappDisplay: "+1 786 591 1017",
      city: "Miami, Florida",
    };
  }

  function pageName() {
    return (d.body && d.body.getAttribute("data-page")) || "home";
  }

  function mark(href, page) {
    var current = pageName();
    if (page === "offers" && current === "offers") {
      return ' aria-current="page"';
    }
    if (current === "quote" && href.indexOf("need") !== -1) {
      return ' aria-current="page"';
    }
    if (page === "home" && current === "home" && href.indexOf("#") === -1) {
      return ' aria-current="page"';
    }
    return "";
  }

  function markSrc() {
    var explicit = d.body && d.body.getAttribute("data-mark");
    if (explicit) return explicit;
    return pageName() === "home" ? "assets/vral-printmark.png" : "../assets/vral-printmark.png";
  }

  function headerHTML() {
    var r = routes();
    var current = lang();
    var privateChrome = pageName() === "field" || pageName() === "admin";
    var nav = privateChrome
      ? ""
      : '<nav class="site-nav" data-site-nav aria-label="Primary">' +
          '<a href="' + r.need + '"' + mark(r.need, "home") + ">" + t("need") + "</a>" +
          '<a href="' + r.offers + '"' + mark(r.offers, "offers") + ">" + t("offers") + "</a>" +
          '<a href="' + r.how + '"' + mark(r.how, "home") + ">" + t("how") + "</a>" +
        "</nav>";
    return (
      '<a class="skip-link" href="#content">' + t("skip") + "</a>" +
      '<header class="site-header shell">' +
        (privateChrome ? "" : '<button class="menu-toggle" type="button" data-menu-toggle aria-expanded="false">' + t("menu") + "</button>") +
        '<a class="brand" href="' + r.home + '" aria-label="Vral Graphics home">' +
          '<img src="' + markSrc() + '" width="54" height="54" alt="" />' +
          '<span class="brand-wordmark"><strong>Vral</strong><small>Graphics</small></span>' +
        "</a>" +
        nav +
        '<div class="header-actions">' +
          '<div class="language-switch" role="group" aria-label="' + t("language") + '">' +
            '<button type="button" data-lang="en" aria-pressed="' + (current === "en" ? "true" : "false") + '">EN</button>' +
            "<span aria-hidden=\"true\">/</span>" +
            '<button type="button" data-lang="es" aria-pressed="' + (current === "es" ? "true" : "false") + '">ES</button>' +
          "</div>" +
        "</div>" +
      "</header>"
    );
  }

  function footerHTML() {
    var r = routes();
    var c = contact();
    return (
      '<footer class="site-footer">' +
        '<div class="shell">' +
          '<div class="footer-grid">' +
            '<div class="footer-brand">' +
              "<strong>Vral Graphics</strong>" +
              "<small>" + t("slogan") + "</small>" +
              "<p>" + t("part") + "</p>" +
            "</div>" +
            "<div><h2>" + t("explore") + "</h2><ul>" +
              '<li><a href="' + r.need + '">' + t("need") + "</a></li>" +
              '<li><a href="' + r.offers + '">' + t("offers") + "</a></li>" +
              '<li><a href="' + r.how + '">' + t("how") + "</a></li>" +
              '<li><a href="' + r.help + '">' + t("help") + "</a></li>" +
            "</ul></div>" +
            "<div><h2>" + t("contact") + "</h2><ul>" +
              '<li><a href="mailto:' + c.email + '">' + c.email + "</a></li>" +
              '<li><a href="https://wa.me/' + c.whatsappDigits + '">WhatsApp ' + c.whatsappDisplay + "</a></li>" +
              "<li>" + c.city + "</li>" +
            "</ul></div>" +
            "<div><h2>" + t("legal") + "</h2><ul>" +
              '<li><a href="' + r.privacy + '">' + t("privacy") + "</a></li>" +
              '<li><a href="' + r.terms + '">' + t("terms") + "</a></li>" +
              '<li><a href="' + r.accessibility + '">' + t("accessibility") + "</a></li>" +
              '<li><a href="' + r.paymentTerms + '">' + t("payment") + "</a></li>" +
            "</ul></div>" +
          "</div>" +
          '<div class="footer-end"><span>' + t("copyright") + "</span><span>EN / ES</span></div>" +
        "</div>" +
      "</footer>"
    );
  }

  function bind(root) {
    root.querySelectorAll("[data-lang]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        setLang(btn.getAttribute("data-lang"));
      });
    });
    var toggle = root.querySelector("[data-menu-toggle]");
    var nav = root.querySelector("[data-site-nav]");
    if (toggle && nav) {
      toggle.addEventListener("click", function () {
        var open = nav.classList.toggle("is-open");
        toggle.setAttribute("aria-expanded", open ? "true" : "false");
      });
    }
  }

  function render() {
    var headerHost = d.querySelector("[data-vral-header]");
    var footerHost = d.querySelector("[data-vral-footer]");
    if (headerHost) {
      headerHost.innerHTML = headerHTML();
      bind(headerHost);
    }
    if (footerHost) {
      footerHost.innerHTML = footerHTML();
    }
    d.documentElement.lang = lang();
  }

  w.VralSite = { render: render, setLang: setLang, lang: lang, t: t };
  if (d.readyState === "loading") d.addEventListener("DOMContentLoaded", render);
  else render();
})(window, document);
