(function (w, d) {
  "use strict";
  var COPY = {
    en: { skip:"Skip to content",products:"Products",how:"How it works",work:"Work",offers:"Offers",track:"Track a job",account:"My jobs",need:"What do you need?",language:"Language",help:"Help me choose",privacy:"Privacy",terms:"Terms",accessibility:"Accessibility",payment:"Payment terms",slogan:"Quality Printing for Less.",part:"Part of Vral Media.",menu:"Menu",copyright:"© 2026 Vral Graphics. Part of Vral Media." },
    es: { skip:"Saltar al contenido",products:"Productos",how:"Cómo funciona",work:"Trabajos",offers:"Ofertas",track:"Rastrear trabajo",account:"Mis trabajos",need:"¿Qué necesitas?",language:"Idioma",help:"Ayúdame a elegir",privacy:"Privacidad",terms:"Términos",accessibility:"Accesibilidad",payment:"Términos de pago",slogan:"Impresión de calidad por menos.",part:"Parte de Vral Media.",menu:"Menú",copyright:"© 2026 Vral Graphics. Parte de Vral Media." }
  };
  function lang(){ try{return localStorage.getItem("vral-lang")==="es"?"es":"en";}catch(err){return d.documentElement.lang==="es"?"es":"en";} }
  function setLang(next){ try{localStorage.setItem("vral-lang",next);}catch(err){} d.documentElement.lang=next;render();d.documentElement.dispatchEvent(new CustomEvent("vral:lang",{detail:{lang:next}})); }
  function t(key){ var table=COPY[lang()]||COPY.en;return table[key]||COPY.en[key]||key; }
  function routes(){ return (w.VralRoutes&&w.VralRoutes.ROUTES)||{}; }
  function contact(){ return (w.VralRoutes&&w.VralRoutes.CONTACT)||{}; }
  function pageName(){ return (d.body&&d.body.getAttribute("data-page"))||"home"; }
  function markSrc(){ var explicit=d.body&&d.body.getAttribute("data-mark");if(explicit)return explicit;return pageName()==="home"?"assets/vral-printmark.png":"../assets/vral-printmark.png"; }
  function headerHTML(){
    var r=routes(),current=lang(),privateChrome=pageName()==="field"||pageName()==="admin";
    var nav=privateChrome?"":'<nav class="site-nav" data-site-nav aria-label="Primary"><a href="'+r.need+'">'+t("products")+'</a><a href="'+r.how+'">'+t("how")+'</a><a href="'+r.work+'">'+t("work")+'</a><a href="'+r.offers+'">'+t("offers")+'</a></nav>';
    return '<a class="skip-link" href="#content">'+t("skip")+'</a><header class="site-header shell">'+
      '<a class="brand" href="'+r.home+'" aria-label="Vral Graphics home"><img src="'+markSrc()+'" width="43" height="43" alt=""><span class="brand-wordmark"><strong>Vral</strong><small>Graphics</small></span></a>'+nav+
      '<div class="header-actions"><div class="language-switch" role="group" aria-label="'+t("language")+'"><button type="button" data-lang="en" aria-pressed="'+(current==="en"?'true':'false')+'">EN</button><span aria-hidden="true">/</span><button type="button" data-lang="es" aria-pressed="'+(current==="es"?'true':'false')+'">ES</button></div>'+(privateChrome?'':'<a class="header-track" href="'+r.track+'">'+t("track")+'</a><a class="header-need" href="'+r.need+'">'+t("need")+'</a>')+'</div>'+ (privateChrome?'':'<button class="menu-toggle" type="button" data-menu-toggle aria-expanded="false">'+t("menu")+'</button>')+'</header>';
  }
  function footerHTML(){
    var r=routes(),c=contact();
    return '<footer class="site-footer"><div class="shell"><div class="footer-main"><div class="footer-brand"><strong>Vral Graphics</strong><small>'+t("slogan")+'</small><p class="footer-contact">Miami, Florida · <a href="mailto:'+c.email+'">'+c.email+'</a></p></div><nav class="footer-links" aria-label="Footer"><a href="'+r.need+'">'+t("products")+'</a><a href="'+r.how+'">'+t("how")+'</a><a href="'+r.offers+'">'+t("offers")+'</a><a href="'+r.track+'">'+t("track")+'</a><a href="'+r.help+'">'+t("help")+'</a><a href="'+r.privacy+'">'+t("privacy")+'</a><a href="'+r.terms+'">'+t("terms")+'</a><a href="'+r.accessibility+'">'+t("accessibility")+'</a><a href="'+r.paymentTerms+'">'+t("payment")+'</a></nav></div><div class="footer-end"><span>'+t("copyright")+'</span><span>EN / ES</span></div></div></footer>';
  }
  function bind(root){
    root.querySelectorAll("[data-lang]").forEach(function(btn){btn.addEventListener("click",function(){setLang(btn.getAttribute("data-lang"));});});
    var toggle=root.querySelector("[data-menu-toggle]"),nav=root.querySelector("[data-site-nav]");
    if(toggle&&nav)toggle.addEventListener("click",function(){var open=nav.classList.toggle("is-open");toggle.setAttribute("aria-expanded",open?"true":"false");});
  }
  function render(){
    var headerHost=d.querySelector("[data-vral-header]"),footerHost=d.querySelector("[data-vral-footer]");
    if(headerHost){headerHost.innerHTML=headerHTML();bind(headerHost);} if(footerHost)footerHost.innerHTML=footerHTML();d.documentElement.lang=lang();
  }
  w.VralSite={render:render,setLang:setLang,lang:lang,t:t};
  if(d.readyState==="loading")d.addEventListener("DOMContentLoaded",render);else render();
})(window,document);
