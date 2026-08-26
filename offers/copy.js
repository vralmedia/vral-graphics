(function (root) {
  "use strict";

  var COPY = {
    en: {
      title: "Fresh off the press.",
      lead: "One piece at a time, the way a print rack works. Pick the sample in front. We confirm the job before anything is paid or printed.",
      live: "Showing",
      tabs: "Print samples",
      tickets: "This offer",
      designWhen: "When we design it for you",
      designCards: "Business cards design is $75 front, +$10 back. That fee is only for business cards.",
      cardsName: "Business cards",
      cardsDeck: "Full color. Thick stock. Built to be handed over, not buried in a drawer.",
      flyersName: "Flyers & postcards",
      flyersDeck: "Street and mailbox work. The listed flyer is two-sided 4 × 6.",
      menusName: "Brochures & menus",
      menusDeck: "8.5 × 11 with folding included. Restaurant, clinic, or shop.",
      bannersName: "Banners",
      bannersDeck: "Full color by the square foot. We need width and height.",
      wrapsName: "Window graphics",
      wrapsDeck: "Window wraps by the square foot. Measure the glass first.",
      aframeName: "Signs & A-frames",
      aframeDeck: "Sidewalk A-frame at a set price. Other signs go to quote.",
      request: "Request this offer",
      measure: "Measure and get a quote",
      checkoutNote: "Card prices are confirmed on the server. This page does not send a price.",
      other: "Need something else? Start a print request.",
      hint: "Arrow keys move the rack. Enter opens the request.",
      footerNote: "Listed prices are the flyer offers. A person at Vral confirms the job before production.",
      noscript: "JavaScript is off. The offers are listed below. Request them on WhatsApp or open /quote/."
    },
    es: {
      title: "Saliendo de la prensa.",
      lead: "Una pieza a la vez, como un rack de imprenta. Elige la muestra de enfrente. Confirmamos el trabajo antes de cobrar o imprimir.",
      live: "Mostrando",
      tabs: "Muestras de impresión",
      tickets: "Esta oferta",
      designWhen: "Cuando lo diseñamos para ti",
      designCards: "El diseño de tarjetas de presentación es $75 frente, +$10 reverso. Esa tarifa es solo para tarjetas.",
      cardsName: "Tarjetas de presentación",
      cardsDeck: "A todo color. Cartulina gruesa. Para entregar en mano.",
      flyersName: "Flyers y postales",
      flyersDeck: "Para calle y buzón. El flyer listado es 4 × 6 a dos caras.",
      menusName: "Brochures y menús",
      menusDeck: "8.5 × 11 con doblez incluido. Restaurante, clínica o tienda.",
      bannersName: "Banners",
      bannersDeck: "A todo color por pie cuadrado. Necesitamos ancho y alto.",
      wrapsName: "Gráficos de ventana",
      wrapsDeck: "Vinilo de ventana por pie cuadrado. Primero se mide el vidrio.",
      aframeName: "Letreros y A-Frames",
      aframeDeck: "A-frame de acera a precio fijo. Otros letreros van a presupuesto.",
      request: "Pedir esta oferta",
      measure: "Medir y pedir presupuesto",
      checkoutNote: "El precio de las tarjetas lo confirma el servidor. Esta página no envía un precio.",
      other: "¿Necesitas otra cosa? Empieza un pedido de impresión.",
      hint: "Las flechas mueven el rack. Enter abre el pedido.",
      footerNote: "Los precios listados son las ofertas de los flyers. Una persona en Vral confirma el trabajo antes de producir.",
      noscript: "JavaScript está apagado. Las ofertas están abajo. Pídelas por WhatsApp o abre /quote/."
    }
  };

  var NAMES = {
    "business-cards": "cardsName",
    "flyers-postcards": "flyersName",
    "brochures-menus": "menusName",
    banners: "bannersName",
    "window-graphics": "wrapsName",
    "signs-aframes": "aframeName"
  };

  var DECKS = {
    "business-cards": "cardsDeck",
    "flyers-postcards": "flyersDeck",
    "brochures-menus": "menusDeck",
    banners: "bannersDeck",
    "window-graphics": "wrapsDeck",
    "signs-aframes": "aframeDeck"
  };

  function lang() {
    try {
      if (root.VralSite && typeof root.VralSite.lang === "function") return root.VralSite.lang();
      return localStorage.getItem("vral-lang") === "es" ? "es" : "en";
    } catch (err) {
      return "en";
    }
  }

  function t(key) {
    var table = COPY[lang()] || COPY.en;
    return table[key] || COPY.en[key] || key;
  }

  function productName(id) {
    return t(NAMES[id] || id);
  }

  function productDeck(id) {
    return t(DECKS[id] || "");
  }

  root.VralOffersCopy = { COPY: COPY, t: t, lang: lang, productName: productName, productDeck: productDeck };
})(typeof window !== "undefined" ? window : globalThis);
