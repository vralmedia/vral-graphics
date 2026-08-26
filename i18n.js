/* Vral Graphics homepage — EN default, ES for Miami. No Portuguese on the public page. */
(function (w) {
  "use strict";

  var en = {
    description: "Business cards, flyers, menus, banners, wraps and signs—designed, printed and delivered for businesses that need to be seen.",
    heroTitle: "Quality Printing for Less.",
    heroLead: "Business cards, flyers, menus, banners, wraps and signs—designed, printed and delivered for businesses that need to be seen.",
    heroLine: "Choose what you need below. We will help with the rest.",
    reggieCaption: "Reggie, the press registration mark.",
    reggieIdle: "Reggie is waiting on press.",
    reggieLooking: "Reggie is watching the page.",
    reggieProduct: "Reggie takes the shape of {product}.",
    reggieThinking: "Reggie is lining up the job.",
    reggieError: "Reggie is off register. We will realign.",
    reggieApproved: "Reggie approved the proof.",
    reggiePaid: "Reggie is ready to print.",
    needTitle: "What do you need?",
    needLead: "Pick the printed piece. We take it from there.",
    pCards: "Business Cards",
    pCardsUse: "Name, number, first impression.",
    pFlyers: "Flyers & Postcards",
    pFlyersUse: "Handouts and mailbox pieces.",
    pMenus: "Brochures & Menus",
    pMenusUse: "Folded pages for tables and hands.",
    pBanners: "Banners",
    pBannersUse: "Wide vinyl for events and storefronts.",
    pWindows: "Window Graphics",
    pWindowsUse: "Wraps, vinyl, and glass that sells.",
    pSigns: "Signs & A-Frames",
    pSignsUse: "Sidewalk and storefront signs.",
    pPack: "Packaging",
    pPackUse: "Boxes that leave the shop looking finished.",
    pUnsure: "I’m not sure yet",
    pUnsureUse: "Tell us the job. We will help you choose.",
    streetTitle: "From screen to street.",
    streetLead: "Move the art from the glass onto the piece people actually see.",
    streetKeys: "Use arrow keys to move the artwork onto the window, banner, or A-frame. You can also drag it.",
    streetScreen: "On screen",
    streetArt: "Artwork",
    slotWindow: "Window",
    slotBanner: "Banner",
    slotAframe: "A-Frame",
    streetPrev: "Previous piece",
    streetNext: "Next piece",
    streetStatus: "Artwork is on the {piece}.",
    streetFallback: "On the left, the file. On the right, the printed piece on the street.",
    pressTitle: "Fresh off the press.",
    pressLead: "One offer on the sheet. The rest live on the print rack.",
    pressKicker: "This week’s sheet",
    pressOffer: "1,000 business cards — $99",
    pressOfferLead: "Full color, when we design it for you.",
    seeOffers: "See all offers",
    howTitle: "Pick it. Shape it. Print it.",
    how1: "Pick it",
    how1Lead: "Choose the piece you need.",
    how2: "Shape it",
    how2Lead: "We confirm size, paper, and proof.",
    how3: "Print it",
    how3Lead: "Approve, print, deliver.",
    helpTitle: "Not sure what to order?",
    helpLead: "That is normal.",
    helpCta: "Help me choose",
    privacyTitle: "Privacy",
    privacyBody: "Vral Graphics, part of Vral Media, uses the details you send only to quote, print, and deliver your job. We do not sell contact lists. Artwork files stay with the job.",
    termsTitle: "Terms",
    termsBody: "A request on this site is not an order until Vral Graphics confirms price, quantity, and timing. Printed work is produced after proof approval.",
    a11yTitle: "Accessibility",
    a11yBody: "This site works with keyboard, screen readers, and reduced motion. If something is in the way, email info@vralmedia.com.",
    payTitle: "Payment terms",
    payBody: "Offers with a closed price can be paid after a confirmed order. Custom and measured jobs are quoted first. Tax and processing are confirmed with the invoice, not guessed on this page."
  };

  var es = {
    description: "Tarjetas, flyers, menús, banners, vinilos y letreros: diseñados, impresos y entregados para negocios que necesitan verse.",
    heroTitle: "Quality Printing for Less.",
    heroLead: "Tarjetas, flyers, menús, banners, vinilos y letreros: diseñados, impresos y entregados para negocios que necesitan verse.",
    heroLine: "Elige lo que necesitas abajo. Nosotros te ayudamos con el resto.",
    reggieCaption: "Reggie, la marca de registro de prensa.",
    reggieIdle: "Reggie espera en la prensa.",
    reggieLooking: "Reggie mira la página.",
    reggieProduct: "Reggie toma la forma de {product}.",
    reggieThinking: "Reggie está alineando el trabajo.",
    reggieError: "Reggie está fuera de registro. Lo realineamos.",
    reggieApproved: "Reggie aprobó la prueba.",
    reggiePaid: "Reggie está listo para imprimir.",
    needTitle: "¿Qué necesitas?",
    needLead: "Elige la pieza impresa. De ahí seguimos nosotros.",
    pCards: "Tarjetas de presentación",
    pCardsUse: "Nombre, número, primera impresión.",
    pFlyers: "Flyers y postales",
    pFlyersUse: "Volantes y piezas para el correo.",
    pMenus: "Brochures y menús",
    pMenusUse: "Páginas dobladas para mesas y manos.",
    pBanners: "Banners",
    pBannersUse: "Vinilo ancho para eventos y fachadas.",
    pWindows: "Gráficos de ventana",
    pWindowsUse: "Vinilos y vidrio que venden.",
    pSigns: "Letreros y A-Frames",
    pSignsUse: "Letreros de acera y de tienda.",
    pPack: "Empaques",
    pPackUse: "Cajas que salen de la tienda ya listas.",
    pUnsure: "Todavía no estoy seguro",
    pUnsureUse: "Cuéntanos el trabajo. Te ayudamos a elegir.",
    streetTitle: "De la pantalla a la calle.",
    streetLead: "Pasa el arte del vidrio a la pieza que la gente ve de verdad.",
    streetKeys: "Usa las flechas para poner el arte en la ventana, el banner o el A-frame. También puedes arrastrarlo.",
    streetScreen: "En pantalla",
    streetArt: "Arte",
    slotWindow: "Ventana",
    slotBanner: "Banner",
    slotAframe: "A-Frame",
    streetPrev: "Pieza anterior",
    streetNext: "Pieza siguiente",
    streetStatus: "El arte está en el {piece}.",
    streetFallback: "A la izquierda, el archivo. A la derecha, la pieza impresa en la calle.",
    pressTitle: "Fresh off the press.",
    pressLead: "Una oferta en la hoja. El resto vive en el rack de impresión.",
    pressKicker: "La hoja de esta semana",
    pressOffer: "1,000 tarjetas — $99",
    pressOfferLead: "A todo color, cuando nosotros hacemos el diseño.",
    seeOffers: "See all offers",
    howTitle: "Pick it. Shape it. Print it.",
    how1: "Pick it",
    how1Lead: "Elige la pieza que necesitas.",
    how2: "Shape it",
    how2Lead: "Confirmamos medida, papel y prueba.",
    how3: "Print it",
    how3Lead: "Aprueba, imprime, entrega.",
    helpTitle: "¿No sabes qué pedir?",
    helpLead: "Es normal.",
    helpCta: "Help me choose",
    privacyTitle: "Privacidad",
    privacyBody: "Vral Graphics, parte de Vral Media, usa los datos que envías solo para cotizar, imprimir y entregar el trabajo. No vendemos listas de contacto. El arte se queda con el trabajo.",
    termsTitle: "Términos",
    termsBody: "Una solicitud en este sitio no es un pedido hasta que Vral Graphics confirma precio, cantidad y tiempo. Se imprime después de aprobar la prueba.",
    a11yTitle: "Accesibilidad",
    a11yBody: "Este sitio funciona con teclado, lectores de pantalla y movimiento reducido. Si algo estorba, escribe a info@vralmedia.com.",
    payTitle: "Términos de pago",
    payBody: "Las ofertas con precio cerrado se pagan después de un pedido confirmado. Los trabajos a medida se cotizan primero. Impuesto y procesamiento se confirman en la factura, no se adivinan en esta página."
  };

  function lang() {
    try {
      return localStorage.getItem("vral-lang") === "es" ? "es" : "en";
    } catch (err) {
      return document.documentElement.lang === "es" ? "es" : "en";
    }
  }

  function t(key, vars) {
    var table = (lang() === "es" ? es : en);
    var value = table[key] || en[key] || key;
    Object.keys(vars || {}).forEach(function (name) {
      value = value.replace("{" + name + "}", vars[name]);
    });
    return value;
  }

  function apply(root) {
    var scope = root || document;
    document.documentElement.lang = lang();
    scope.querySelectorAll("[data-i18n]").forEach(function (node) {
      node.textContent = t(node.getAttribute("data-i18n"));
    });
    scope.querySelectorAll("[data-i18n-html]").forEach(function (node) {
      node.innerHTML = t(node.getAttribute("data-i18n-html"));
    });
    scope.querySelectorAll("[data-i18n-aria]").forEach(function (node) {
      node.setAttribute("aria-label", t(node.getAttribute("data-i18n-aria")));
    });
    scope.querySelectorAll("[data-i18n-content]").forEach(function (node) {
      node.setAttribute("content", t(node.getAttribute("data-i18n-content")));
    });
  }

  w.VG_I18N = {
    defaultLang: "en",
    strings: { en: en, es: es },
    t: t,
    lang: lang,
    apply: apply
  };
})(window);
