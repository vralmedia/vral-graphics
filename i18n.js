/* Vral Graphics homepage — EN default, ES for Miami. */
(function (w) {
  "use strict";
  var en = {
    pageTitle: "Vral Graphics — Quality Printing for Less.",
    description: "Choose a print product. Vral Graphics handles design, print and delivery in Miami.",
    trustLine: "Quality printing for less.",
    deskTitle: "What are we making?",
    deskSupport: "Choose a product. We’ll handle design, print and delivery.",
    productShelfLabel: "Print products",
    cards: "Cards", flyers: "Flyers", menus: "Menus", banners: "Banners", windows: "Windows", signs: "Signs",
    cardsUse: "Make the first impression count.",
    flyersUse: "Put the offer in their hands.",
    menusUse: "Make every choice look good.",
    bannersUse: "Own the room from across it.",
    windowsUse: "Turn glass into a storefront.",
    signsUse: "Get seen from the sidewalk.",
    cardsAlt: "A stack of full-color business cards",
    flyersAlt: "A fan of full-color flyers",
    menusAlt: "An open folded menu",
    bannersAlt: "A partially unrolled vinyl banner",
    windowsAlt: "A storefront with installed window graphics",
    signsAlt: "A printed sidewalk A-frame sign",
    onDesk: "On the desk",
    chooseThis: "Choose this",
    measureMine: "Measure mine",
    allOptions: "All options",
    selectedProduct: "Selected",
    helpChoose: "Help me choose",
    proofTitle: "Made to be seen.",
    proofSteps: "Designed. Printed. Delivered.",
    confidenceLabel: "Why Vral Graphics",
    proofBefore: "Proof before print",
    humanConfirmation: "Human confirmation",
    notSure: "Not sure?",
    showHelper: "Add a photo or tell us the goal.",
    showUs: "Show us",
    reggieIdle: "Reggie is waiting on press.",
    reggieLooking: "Reggie is watching the page.",
    reggieProduct: "Reggie takes the shape of {product}.",
    reggieThinking: "Reggie is lining up the job.",
    reggieError: "Reggie is off register. We will realign.",
    reggieApproved: "Reggie approved the proof.",
    reggiePaid: "Reggie is ready to print."
  };
  var es = {
    pageTitle: "Vral Graphics — Impresión de calidad por menos.",
    description: "Elige un producto impreso. Vral Graphics se encarga del diseño, impresión y entrega en Miami.",
    trustLine: "Impresión de calidad por menos.",
    deskTitle: "¿Qué vamos a crear?",
    deskSupport: "Elige un producto. Nosotros hacemos el diseño, impresión y entrega.",
    productShelfLabel: "Productos impresos",
    cards: "Tarjetas", flyers: "Flyers", menus: "Menús", banners: "Banners", windows: "Ventanas", signs: "Letreros",
    cardsUse: "Haz que la primera impresión cuente.",
    flyersUse: "Pon la oferta en sus manos.",
    menusUse: "Haz que cada opción se vea bien.",
    bannersUse: "Domina el espacio desde lejos.",
    windowsUse: "Convierte el vidrio en vitrina.",
    signsUse: "Hazte ver desde la acera.",
    cardsAlt: "Una pila de tarjetas de presentación a todo color",
    flyersAlt: "Un abanico de flyers a todo color",
    menusAlt: "Un menú plegado abierto",
    bannersAlt: "Un banner de vinilo parcialmente desenrollado",
    windowsAlt: "Una tienda con gráficos instalados en las ventanas",
    signsAlt: "Un letrero A-frame impreso para la acera",
    onDesk: "En la mesa",
    chooseThis: "Elegir",
    measureMine: "Medir el mío",
    allOptions: "Ver opciones",
    selectedProduct: "Seleccionado",
    helpChoose: "Ayúdame a elegir",
    proofTitle: "Hecho para destacar.",
    proofSteps: "Diseñado. Impreso. Entregado.",
    confidenceLabel: "Por qué Vral Graphics",
    proofBefore: "Prueba antes de imprimir",
    humanConfirmation: "Confirmación humana",
    notSure: "¿No sabes?",
    showHelper: "Agrega una foto o dinos el objetivo.",
    showUs: "Muéstranos",
    reggieIdle: "Reggie espera en la prensa.",
    reggieLooking: "Reggie mira la página.",
    reggieProduct: "Reggie toma la forma de {product}.",
    reggieThinking: "Reggie está alineando el trabajo.",
    reggieError: "Reggie está fuera de registro. Lo realineamos.",
    reggieApproved: "Reggie aprobó la prueba.",
    reggiePaid: "Reggie está listo para imprimir."
  };
  function lang() {
    try { return localStorage.getItem("vral-lang") === "es" ? "es" : "en"; }
    catch (err) { return document.documentElement.lang === "es" ? "es" : "en"; }
  }
  function t(key, vars) {
    var table = lang() === "es" ? es : en;
    var value = table[key] || en[key] || key;
    Object.keys(vars || {}).forEach(function (name) { value = value.replace("{" + name + "}", vars[name]); });
    return value;
  }
  function apply(root) {
    var scope = root || document;
    document.documentElement.lang = lang();
    scope.querySelectorAll("[data-i18n]").forEach(function (node) { node.textContent = t(node.getAttribute("data-i18n")); });
    scope.querySelectorAll("[data-i18n-aria]").forEach(function (node) { node.setAttribute("aria-label", t(node.getAttribute("data-i18n-aria"))); });
    scope.querySelectorAll("[data-i18n-content]").forEach(function (node) { node.setAttribute("content", t(node.getAttribute("data-i18n-content"))); });
    scope.querySelectorAll("[data-i18n-alt]").forEach(function (node) { node.setAttribute("alt", t(node.getAttribute("data-i18n-alt"))); });
  }
  w.VG_I18N = { defaultLang: "en", strings: { en: en, es: es }, t: t, lang: lang, apply: apply };
})(window);
