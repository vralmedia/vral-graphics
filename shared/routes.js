(function (w) {
  "use strict";

  var ROUTES = {
    home: "/",
    need: "/#desk-title",
    work: "/#proof-title",
    offers: "/offers/index.html",
    quote: "/quote/index.html",
    help: "/quote/index.html?product=unsure",
    field: "/field/index.html",
    admin: "/admin/index.html",
    privacy: "/legal/privacy/index.html",
    terms: "/legal/terms/index.html",
    accessibility: "/legal/accessibility/index.html",
    paymentTerms: "/legal/payment/index.html",
  };

  var PRODUCTS = [
    { id: "business-cards", labelEn: "Business Cards", labelEs: "Tarjetas de presentación" },
    { id: "flyers-postcards", labelEn: "Flyers & Postcards", labelEs: "Flyers y postales" },
    { id: "brochures-menus", labelEn: "Brochures & Menus", labelEs: "Brochures y menús" },
    { id: "banners", labelEn: "Banners", labelEs: "Banners" },
    { id: "window-graphics", labelEn: "Window Graphics", labelEs: "Gráficos de ventana" },
    { id: "signs-aframes", labelEn: "Signs & A-Frames", labelEs: "Letreros y A-Frames" },
    { id: "packaging", labelEn: "Packaging", labelEs: "Empaques" },
    { id: "unsure", labelEn: "I’m not sure yet", labelEs: "Todavía no estoy seguro" },
  ];

  var CONTACT = {
    email: "info@vralmedia.com",
    whatsappDigits: "17865911017",
    whatsappDisplay: "+1 786 591 1017",
    city: "Miami, Florida",
  };

  function quoteUrl(productId) {
    var id = encodeURIComponent(productId || "");
    return id ? ROUTES.quote + "?product=" + id : ROUTES.quote;
  }

  w.VralRoutes = {
    ROUTES: ROUTES,
    PRODUCTS: PRODUCTS,
    CONTACT: CONTACT,
    quoteUrl: quoteUrl,
  };
})(window);
