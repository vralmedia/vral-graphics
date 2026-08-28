(function (w, d) {
  "use strict";

  var COPY = {
    en: {skip:"Skip to content",products:"Products",how:"How it works",work:"Work",offers:"Offers",track:"Track a job",need:"What do you need?",language:"Language",chooseLanguage:"Choose language",help:"Help me choose",privacy:"Privacy",terms:"Terms",accessibility:"Accessibility",payment:"Payment terms",slogan:"Design. Print. Deliver.",part:"Part of Vral Media.",menu:"Open menu",close:"Close menu",explore:"Explore",order:"Order",company:"Company",copyright:"© 2026 Vral Graphics. Part of Vral Media."},
    es: {skip:"Saltar al contenido",products:"Productos",how:"Cómo funciona",work:"Trabajos",offers:"Ofertas",track:"Rastrear trabajo",need:"¿Qué necesitas?",language:"Idioma",chooseLanguage:"Elegir idioma",help:"Ayúdame a elegir",privacy:"Privacidad",terms:"Términos",accessibility:"Accesibilidad",payment:"Términos de pago",slogan:"Diseño. Impresión. Entrega.",part:"Parte de Vral Media.",menu:"Abrir menú",close:"Cerrar menú",explore:"Explorar",order:"Pedir",company:"Compañía",copyright:"© 2026 Vral Graphics. Parte de Vral Media."}
  };
  function lang(){try{return localStorage.getItem("vral-lang")==="es"?"es":"en";}catch(err){return d.documentElement.lang==="es"?"es":"en";}}
  function setLang(next){try{localStorage.setItem("vral-lang",next);}catch(err){}d.documentElement.lang=next;render();d.documentElement.dispatchEvent(new CustomEvent("vral:lang",{detail:{lang:next}}));}
  function t(key){var table=COPY[lang()]||COPY.en;return table[key]||COPY.en[key]||key;}
  function routes(){return (w.VralRoutes&&w.VralRoutes.ROUTES)||{};}
  function contact(){return (w.VralRoutes&&w.VralRoutes.CONTACT)||{};}
  function pageName(){return (d.body&&d.body.getAttribute("data-page"))||"home";}
  function markSrc(){var explicit=d.body&&d.body.getAttribute("data-mark");if(explicit)return explicit;return pageName()==="home"?"assets/vral-printmark.png":"../assets/vral-printmark.png";}

  function languageDockHTML(){var current=lang();return '<div class="language-dock" data-language-dock><div class="language-options" role="group" aria-label="'+t("chooseLanguage")+'"><button type="button" data-lang="en" aria-label="English" aria-pressed="'+(current==="en"?'true':'false')+'"><span aria-hidden="true">🇺🇸</span><b>English</b></button><button type="button" data-lang="es" aria-label="Español" aria-pressed="'+(current==="es"?'true':'false')+'"><span aria-hidden="true">🇪🇸</span><b>Español</b></button></div><button class="language-handle" type="button" data-language-toggle aria-expanded="false" aria-label="'+t("language")+'"><span aria-hidden="true">'+(current==="es"?'🇪🇸':'🇺🇸')+'</span></button></div>';}
  function headerHTML(){
    var r=routes(),privateChrome=pageName()==="field"||pageName()==="admin";
    var nav=privateChrome?"":'<nav class="site-nav" data-site-nav id="site-menu" aria-label="Primary"><div class="site-nav-links"><a href="'+r.need+'">'+t("products")+'</a><a href="'+r.how+'">'+t("how")+'</a><a href="'+r.work+'">'+t("work")+'</a><a href="'+r.offers+'">'+t("offers")+'</a></div><div class="site-nav-actions"><a href="'+r.track+'">'+t("track")+'</a><a class="nav-need" href="'+r.need+'">'+t("need")+'</a></div></nav>';
    return '<a class="skip-link" href="#content">'+t("skip")+'</a><header class="site-header shell">'+(privateChrome?'':'<button class="menu-toggle" type="button" data-menu-toggle aria-controls="site-menu" aria-expanded="false" aria-label="'+t("menu")+'"><span></span><span></span><span></span></button>')+'<a class="brand" href="'+r.home+'" aria-label="Vral Graphics home"><img src="'+markSrc()+'" width="43" height="43" alt=""><span class="brand-wordmark"><strong>Vral</strong><small>Graphics</small></span></a>'+nav+(privateChrome?'':'<span class="mobile-header-spacer" aria-hidden="true"></span>')+'</header>'+(privateChrome?'':languageDockHTML());
  }
  function footerGroup(title,links){return '<details class="footer-group" open><summary>'+title+'<span aria-hidden="true">+</span></summary><div>'+links.join("")+'</div></details>';}
  function footerHTML(){
    var r=routes(),c=contact();
    var explore=['<a href="'+r.home+'">Vral Graphics</a>','<a href="'+r.how+'">'+t("how")+'</a>','<a href="'+r.work+'">'+t("work")+'</a>'];
    var order=['<a href="'+r.need+'">'+t("products")+'</a>','<a href="'+r.offers+'">'+t("offers")+'</a>','<a href="'+r.track+'">'+t("track")+'</a>','<a href="'+r.help+'">'+t("help")+'</a>'];
    var company=['<a href="mailto:'+c.email+'">'+c.email+'</a>','<a href="'+r.privacy+'">'+t("privacy")+'</a>','<a href="'+r.terms+'">'+t("terms")+'</a>','<a href="'+r.accessibility+'">'+t("accessibility")+'</a>','<a href="'+r.paymentTerms+'">'+t("payment")+'</a>'];
    return '<footer class="site-footer"><div class="shell"><div class="footer-intro"><a class="footer-lockup" href="'+r.home+'"><img src="'+markSrc()+'" width="58" height="58" alt=""><span><strong>Vral Graphics</strong><small>'+t("slogan")+'</small></span></a><p>Miami, Florida</p></div><div class="footer-directory">'+footerGroup(t("explore"),explore)+footerGroup(t("order"),order)+footerGroup(t("company"),company)+'</div><div class="footer-end"><span>'+t("copyright")+'</span><span>'+t("part")+'</span></div></div></footer>';
  }
  function setMenu(root,open){var toggle=root.querySelector("[data-menu-toggle]"),nav=root.querySelector("[data-site-nav]");if(!toggle||!nav)return;nav.classList.toggle("is-open",open);toggle.classList.toggle("is-open",open);toggle.setAttribute("aria-expanded",open?"true":"false");toggle.setAttribute("aria-label",open?t("close"):t("menu"));d.body.classList.toggle("menu-open",open);}
  function bind(root){
    root.querySelectorAll("[data-lang]").forEach(function(btn){btn.addEventListener("click",function(){setLang(btn.getAttribute("data-lang"));});});
    var toggle=root.querySelector("[data-menu-toggle]");if(toggle)toggle.addEventListener("click",function(){setMenu(root,toggle.getAttribute("aria-expanded")!=="true");});
    root.querySelectorAll("[data-site-nav] a").forEach(function(link){link.addEventListener("click",function(){setMenu(root,false);});});
    var languageToggle=root.querySelector("[data-language-toggle]"),dock=root.querySelector("[data-language-dock]");if(languageToggle&&dock)languageToggle.addEventListener("click",function(){var open=dock.classList.toggle("is-open");languageToggle.setAttribute("aria-expanded",open?"true":"false");});
    d.addEventListener("keydown",function(event){if(event.key==="Escape"){setMenu(root,false);if(dock){dock.classList.remove("is-open");languageToggle.setAttribute("aria-expanded","false");}}});
  }
  function tuneFooter(root){var groups=root.querySelectorAll(".footer-group"),desktop=w.matchMedia("(min-width: 861px)");function sync(){groups.forEach(function(group){if(desktop.matches)group.setAttribute("open","");else group.removeAttribute("open");});}sync();if(desktop.addEventListener)desktop.addEventListener("change",sync);}
  function render(){var headerHost=d.querySelector("[data-vral-header]"),footerHost=d.querySelector("[data-vral-footer]");if(headerHost){headerHost.innerHTML=headerHTML();bind(headerHost);}if(footerHost){footerHost.innerHTML=footerHTML();tuneFooter(footerHost);}d.documentElement.lang=lang();}
  w.VralSite={render:render,setLang:setLang,lang:lang,t:t};if(d.readyState==="loading")d.addEventListener("DOMContentLoaded",render);else render();
})(window,document);
