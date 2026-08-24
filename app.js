(function () {
  "use strict";

  var STORAGE_KEY = "vral-graphics-print-desk-v2";
  var PHONE = "17864617465";
  var MAX_FILE = 20 * 1024 * 1024;
  var ALLOWED = /\.(pdf|ai|psd|tif|tiff|jpg|jpeg|png|svg)$/i;

  var words = {
    en: {
      skip: "Skip to print desk", start: "Start a print job", heroTitle: "Quality Printing for Less.",
      heroLead: "Vral Graphics is the print division of Vral Media.",
      heroNote: "Tell us what you need, then send your brief on WhatsApp.", trust: "Part of Vral Media.",
      indexTitle: "What do you need?", indexLead: "Pick one. You can change it later.",
      pCards: "Business cards", pCardsUse: "For you and your team.", pPostcards: "Postcards", pPostcardsUse: "For mail and promotions.",
      pBoxes: "Boxes", pBoxesUse: "For products and gifts.", pPosters: "Posters", pPostersUse: "For events and walls.",
      pSigns: "Signs", pSignsUse: "For stores, windows, and streets.",
      deskTitle: "Start a print job", deskLead: "Answer four short questions, then send your brief on WhatsApp.",
      questions: "Questions?", footerNote: "Vral Graphics is part of Vral Media.", clearTitle: "Clear all answers and start over?", keep: "Keep my answers", clear: "Start over",
      step: "Step {n} of 4", q1: "What do you need to print?", q2: "What is it for?", q3: "What do you already have?", q4: "Where should we reply?",
      unsure: "I am not sure yet", other: "Other", back: "Back", continue: "Continue", review: "Review my print brief",
      chooseProduct: "Choose one option to continue.", choosePurpose: "Choose what the print is for.",
      artworkReady: "I have print-ready artwork", artworkSome: "I have a logo or images", artworkHelp: "I need design help", artworkUnsure: "I am not sure",
      addFile: "Add a file — optional", fileHelp: "PDF, AI, PSD, TIFF, JPG, PNG, or SVG. Maximum 20 MB.", noFile: "No file added. You can still continue.",
      localFile: "This file stays on this device. It is not sent with this brief—attach it in WhatsApp after opening.", badFile: "We could not read this file. Try another file or continue without it.",
      note: "Anything we should know? — optional", extraBox: "Do you know the box size? — optional", extraSign: "Where will the sign go? — optional", extraPostcard: "Will you mail these? — optional",
      name: "Your name", company: "Business name — optional", phone: "WhatsApp or phone", email: "Email — optional", timing: "When do you need it? — optional",
      noDate: "No set date", week: "This week", month: "This month", date: "I have a date", nameError: "Enter your name.", contactError: "Enter a phone number or email.", emailError: "Check the email address or leave it empty.",
      ticket: "Your print job", product: "Product", purpose: "Purpose", artwork: "Artwork", reply: "Reply", timingLabel: "Timing", empty: "Not answered yet", fileSelected: "File selected on this device: {name}",
      ready: "Your print brief is ready.", readyLead: "Open WhatsApp to send it to Vral Graphics.", notSent: "Nothing has been sent yet.", openWa: "Open WhatsApp with my print brief", edit: "Edit answers", copy: "Copy print brief",
      resumeTitle: "Continue your print job?", resumeLead: "Your answers were saved in this browser.", resumeFile: "Your file was not saved. Add it again if you want to send it later.",
      storageFail: "This browser cannot save your answers. Keep this page open until you finish.", offline: "You appear to be offline. Your answers are still here. Connect to the internet before opening WhatsApp.",
      waFail: "WhatsApp did not open. Copy your print brief below and send it to Mike at +1 (786) 461-7465.", showTicket: "Show job ticket", hideTicket: "Hide job ticket"
    },
    es: {
      skip: "Saltar al formulario", start: "Empezar un trabajo", heroTitle: "Quality Printing for Less.",
      heroLead: "Vral Graphics es la división de impresión de Vral Media.",
      heroNote: "Dinos qué necesitas y envía tu solicitud por WhatsApp.", trust: "Parte de Vral Media.",
      indexTitle: "¿Qué necesitas?", indexLead: "Elige uno. Puedes cambiarlo después.",
      pCards: "Tarjetas de presentación", pCardsUse: "Para ti y tu equipo.", pPostcards: "Postales", pPostcardsUse: "Para correo y promociones.",
      pBoxes: "Cajas", pBoxesUse: "Para productos y regalos.", pPosters: "Pósters", pPostersUse: "Para eventos y paredes.",
      pSigns: "Letreros", pSignsUse: "Para tiendas, ventanas y calles.",
      deskTitle: "Empieza un trabajo", deskLead: "Responde cuatro preguntas cortas y envía tu solicitud por WhatsApp.",
      questions: "¿Tienes preguntas?", footerNote: "Vral Graphics es parte de Vral Media.", clearTitle: "¿Borrar todas las respuestas y empezar de nuevo?", keep: "Guardar mis respuestas", clear: "Empezar de nuevo",
      step: "Paso {n} de 4", q1: "¿Qué necesitas imprimir?", q2: "¿Para qué lo necesitas?", q3: "¿Qué tienes ahora?", q4: "¿Dónde debemos responder?",
      unsure: "Todavía no estoy seguro", other: "Otro", back: "Atrás", continue: "Continuar", review: "Revisar mi solicitud",
      chooseProduct: "Elige una opción para seguir.", choosePurpose: "Elige para qué necesitas la impresión.",
      artworkReady: "Tengo el diseño listo para imprimir", artworkSome: "Tengo un logo o imágenes", artworkHelp: "Necesito ayuda con el diseño", artworkUnsure: "No estoy seguro",
      addFile: "Agregar un archivo — opcional", fileHelp: "PDF, AI, PSD, TIFF, JPG, PNG o SVG. Máximo 20 MB.", noFile: "No agregaste un archivo. Puedes seguir.",
      localFile: "Este archivo queda en este aparato. No se envía con la solicitud: adjúntalo en WhatsApp después de abrirla.", badFile: "No pudimos leer este archivo. Prueba otro o sigue sin archivo.",
      note: "¿Hay algo que debemos saber? — opcional", extraBox: "¿Sabes la medida de la caja? — opcional", extraSign: "¿Dónde irá el letrero? — opcional", extraPostcard: "¿Vas a enviar estas postales por correo? — opcional",
      name: "Tu nombre", company: "Nombre del negocio — opcional", phone: "WhatsApp o teléfono", email: "Correo — opcional", timing: "¿Cuándo lo necesitas? — opcional",
      noDate: "No tengo fecha", week: "Esta semana", month: "Este mes", date: "Tengo una fecha", nameError: "Escribe tu nombre.", contactError: "Escribe un teléfono o correo.", emailError: "Revisa el correo o déjalo vacío.",
      ticket: "Tu trabajo", product: "Producto", purpose: "Uso", artwork: "Diseño", reply: "Respuesta", timingLabel: "Fecha", empty: "Sin respuesta", fileSelected: "Archivo seleccionado en este aparato: {name}",
      ready: "Tu solicitud está lista.", readyLead: "Abre WhatsApp para enviarla a Vral Graphics.", notSent: "Todavía no se envió nada.", openWa: "Abrir WhatsApp con mi solicitud", edit: "Editar respuestas", copy: "Copiar solicitud",
      resumeTitle: "¿Quieres continuar tu trabajo?", resumeLead: "Tus respuestas se guardaron en este navegador.", resumeFile: "Tu archivo no se guardó. Agrégalo otra vez si quieres enviarlo después.",
      storageFail: "Este navegador no puede guardar tus respuestas. Mantén esta página abierta hasta terminar.", offline: "Parece que no tienes internet. Tus respuestas siguen aquí. Conéctate antes de abrir WhatsApp.",
      waFail: "WhatsApp no abrió. Copia la solicitud y envíala a Mike al +1 (786) 461-7465.", showTicket: "Ver solicitud", hideTicket: "Ocultar solicitud"
    }
  };

  var labels = {
    en: {"business-card":"Business cards",postcard:"Postcards",box:"Boxes",poster:"Posters",sign:"Signs",unsure:"I am not sure yet"},
    es: {"business-card":"Tarjetas de presentación",postcard:"Postales",box:"Cajas",poster:"Pósters",sign:"Letreros",unsure:"Todavía no estoy seguro"}
  };
  var purposes = {
    "business-card": [["new-business","New business","Negocio nuevo"],["team","New team member","Nuevo empleado"],["update","Updated information","Información nueva"],["event","Event","Evento"],["other","Other","Otro"]],
    postcard: [["promotion","Promotion","Promoción"],["mail","Mail campaign","Campaña por correo"],["event","Event","Evento"],["announcement","Announcement","Anuncio"],["other","Other","Otro"]],
    box: [["packaging","Product packaging","Empaque de producto"],["gift","Gift box","Caja de regalo"],["shipping","Shipping box","Caja de envío"],["event-kit","Event kit","Kit para evento"],["other","Other","Otro"]],
    poster: [["promotion","Promotion","Promoción"],["event","Event","Evento"],["store","Store display","Exhibición en tienda"],["information","Information","Información"],["other","Other","Otro"]],
    sign: [["store-sign","Store sign","Letrero de tienda"],["window","Window sign","Letrero de ventana"],["event-sign","Event sign","Letrero para evento"],["direction","Direction sign","Letrero de dirección"],["other","Other","Otro"]],
    unsure: [["promote","Promote my business","Promover mi negocio"],["package","Package a product","Empacar un producto"],["information","Show information","Mostrar información"],["event","Prepare for an event","Preparar un evento"],["other","Other","Otro"]]
  };
  var artworkLabels = { ready:"artworkReady", some:"artworkSome", help:"artworkHelp", unsure:"artworkUnsure" };
  var timingLabels = { none:"noDate", week:"week", month:"month", date:"date" };
  var lang = "en";
  try { lang = localStorage.getItem("vral-graphics-lang") === "es" ? "es" : "en"; } catch (e) {}
  var state = fresh();
  var storageWorks = true;
  var pendingSaved = loadSaved();

  function fresh() { return {version:2,step:0,product:"",purpose:"",artworkState:"",fileMeta:null,note:"",extra:"",name:"",company:"",phone:"",email:"",timing:"",completed:false,updatedAt:""}; }
  function t(key, vars) { var value = words[lang][key] || key; Object.keys(vars || {}).forEach(function(k){ value=value.replace("{"+k+"}",vars[k]); }); return value; }
  function loadSaved() { try { var v=JSON.parse(localStorage.getItem(STORAGE_KEY)||"null"); return v && v.version===2 && (v.product || v.name || v.step) ? Object.assign(fresh(),v) : null; } catch(e){ storageWorks=false; return null; } }
  function save() { state.updatedAt=new Date().toISOString(); try { localStorage.setItem(STORAGE_KEY,JSON.stringify(state)); storageWorks=true; } catch(e){ storageWorks=false; } }
  function escapeHtml(value) { return String(value||"").replace(/[&<>'"]/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[c];}); }
  function staticCopy() { document.documentElement.lang=lang; document.querySelectorAll("[data-copy]").forEach(function(n){n.textContent=t(n.dataset.copy);}); document.querySelectorAll("[data-lang]").forEach(function(n){n.setAttribute("aria-pressed",String(n.dataset.lang===lang));}); }
  function productLabel(id) { return labels[lang][id] || t("empty"); }
  function purposeLabel() { var row=(purposes[state.product]||[]).find(function(p){return p[0]===state.purpose;}); return row ? row[lang==="en"?1:2] : t("empty"); }
  function artworkLabel() { return state.artworkState ? t(artworkLabels[state.artworkState]) : t("empty"); }

  function startDesk(product) {
    if (product) { state.product=product; state.purpose=""; state.step=1; save(); }
    document.getElementById("print-desk").scrollIntoView({behavior:matchMedia("(prefers-reduced-motion: reduce)").matches?"auto":"smooth",block:"start"});
    render();
  }

  function showResume() {
    var root=document.getElementById("resume-banner");
    if (!pendingSaved) { root.hidden=true; return; }
    root.hidden=false;
    root.innerHTML='<div><strong>'+t("resumeTitle")+'</strong><p>'+t("resumeLead")+(pendingSaved.fileMeta?" "+t("resumeFile"):"")+'</p></div><div><button class="button button-primary" data-resume>'+t("continue")+'</button><button class="button button-quiet" data-resume-clear>'+t("clear")+'</button></div>';
    root.querySelector("[data-resume]").onclick=function(){ state=pendingSaved; state.fileMeta=null; pendingSaved=null; root.hidden=true; render(); };
    root.querySelector("[data-resume-clear]").onclick=function(){ pendingSaved=null; clearAll(); };
  }

  function choice(value,label,selected) { return '<button type="button" class="choice'+(selected?' is-selected':'')+'" data-choice="'+escapeHtml(value)+'" aria-pressed="'+String(selected)+'"><span>'+escapeHtml(label)+'</span><b aria-hidden="true">'+(selected?'✓':'↘')+'</b></button>'; }
  function stepHeader(question) { return '<div class="session-head"><p>'+t("step",{n:state.step+1})+'</p><progress max="4" value="'+(state.step+1)+'">'+(state.step+1)+'/4</progress><h3 id="active-question" tabindex="-1">'+question+'</h3></div>'; }
  function errorBox() { return '<p id="session-error" class="session-error" role="alert"></p>'; }

  function renderStep1() {
    var opts=["business-card","postcard","box","poster","sign","unsure"];
    return stepHeader(t("q1"))+'<div class="choices">'+opts.map(function(id){return choice(id,productLabel(id),state.product===id);}).join("")+'</div>'+errorBox();
  }
  function renderStep2() {
    return stepHeader(t("q2"))+'<div class="choices">'+(purposes[state.product]||purposes.unsure).map(function(p){return choice(p[0],p[lang==="en"?1:2],state.purpose===p[0]);}).join("")+'</div>'+errorBox()+'<div class="session-actions"><button class="button button-quiet" data-back>'+t("back")+'</button></div>';
  }
  function renderStep3() {
    var context=state.product==="box"?t("extraBox"):state.product==="sign"?t("extraSign"):state.product==="postcard"?t("extraPostcard"):"";
    return stepHeader(t("q3"))+'<div class="choices">'+Object.keys(artworkLabels).map(function(id){return choice(id,t(artworkLabels[id]),state.artworkState===id);}).join("")+'</div><div class="form-stack"><label>'+t("addFile")+'<input id="artwork-file" type="file" accept=".pdf,.ai,.psd,.tif,.tiff,.jpg,.jpeg,.png,.svg" /></label><p class="field-help">'+t("fileHelp")+'</p><p id="file-status" class="field-status" aria-live="polite">'+(state.fileMeta?t("fileSelected",{name:escapeHtml(state.fileMeta.name)})+" "+t("localFile"):t("noFile"))+'</p><label>'+t("note")+'<textarea id="job-note" rows="3">'+escapeHtml(state.note)+'</textarea></label>'+(context?'<label>'+context+'<input id="job-extra" value="'+escapeHtml(state.extra)+'" /></label>':'')+'</div>'+errorBox()+'<div class="session-actions"><button class="button button-quiet" data-back>'+t("back")+'</button><button class="button button-primary" data-next>'+t("continue")+'</button></div>';
  }
  function field(id,label,value,type,required) { return '<label for="'+id+'">'+label+'<input id="'+id+'" type="'+(type||"text")+'" value="'+escapeHtml(value)+'" '+(required?'required':'')+' /></label>'; }
  function renderStep4() {
    return stepHeader(t("q4"))+'<div class="form-stack form-grid">'+field("contact-name",t("name"),state.name,"text",true)+field("contact-company",t("company"),state.company)+field("contact-phone",t("phone"),state.phone,"tel")+field("contact-email",t("email"),state.email,"email")+'<label class="span-two">'+t("timing")+'<select id="contact-timing"><option value="">—</option>'+Object.keys(timingLabels).map(function(id){return '<option value="'+id+'" '+(state.timing===id?'selected':'')+'>'+t(timingLabels[id])+'</option>';}).join("")+'</select></label></div>'+errorBox()+'<div class="session-actions"><button class="button button-quiet" data-back>'+t("back")+'</button><button class="button button-primary" data-review>'+t("review")+'</button></div>';
  }

  function ticketRows() {
    var reply=state.phone||state.email||t("empty");
    return [[t("product"),productLabel(state.product)],[t("purpose"),purposeLabel()],[t("artwork"),artworkLabel()],[t("reply"),reply],[t("timingLabel"),state.timing?t(timingLabels[state.timing]):t("empty")]];
  }
  function renderTicket() {
    var root=document.getElementById("job-ticket");
    root.innerHTML='<button class="ticket-toggle" type="button" aria-expanded="false" aria-controls="ticket-body">'+t("showTicket")+' · '+productLabel(state.product)+' · '+t("step",{n:Math.min(state.step+1,4)})+'</button><div id="ticket-body" class="ticket-body"><div class="ticket-top"><span>VRAL GRAPHICS</span><span>PRINT DESK</span></div><h3>'+t("ticket")+'</h3><dl>'+ticketRows().map(function(r){return '<div><dt>'+r[0]+'</dt><dd>'+escapeHtml(r[1])+'</dd></div>';}).join("")+'</dl></div>';
    root.querySelector(".ticket-toggle").onclick=function(){var on=this.getAttribute("aria-expanded")==="true";this.setAttribute("aria-expanded",String(!on));this.firstChild.nodeValue=(on?t("showTicket"):t("hideTicket"))+" · ";root.classList.toggle("is-open",!on);};
  }

  function renderCompletion() {
    return '<div class="completion"><p class="completion-mark" aria-hidden="true">✓</p><h3 id="active-question" tabindex="-1">'+t("ready")+'</h3><p>'+t("readyLead")+'</p><strong>'+t("notSent")+'</strong><pre id="brief-preview">'+escapeHtml(buildMessage())+'</pre><p id="session-error" class="session-error" role="alert"></p><div class="session-actions"><button class="button button-primary" data-whatsapp>'+t("openWa")+'</button><button class="button button-quiet" data-edit>'+t("edit")+'</button><button class="text-button" data-clear>'+t("clear")+'</button></div></div>';
  }
  function buildMessage() {
    var p=productLabel(state.product), purpose=purposeLabel(), art=artworkLabel(), time=state.timing?t(timingLabels[state.timing]):t("empty");
    if(lang==="es") return ["Hola Vral Graphics. Necesito ayuda con un trabajo de impresión.","","PRODUCTO",p,"","USO",purpose,"","DISEÑO",art,state.fileMeta?"Archivo seleccionado en mi aparato: "+state.fileMeta.name:"",state.note?"Nota: "+state.note:"",state.extra?"Detalle: "+state.extra:"","","CONTACTO","Nombre: "+state.name,state.company?"Negocio: "+state.company:"",state.phone?"Teléfono: "+state.phone:"",state.email?"Correo: "+state.email:"","Fecha: "+time,"","Entiendo que esta es una solicitud, no una orden ni una cotización."].filter(function(v,i,a){return v!==""||a[i-1]!=="";}).join("\n");
    return ["Hi Vral Graphics. I want help with a print job.","","PRODUCT",p,"","PURPOSE",purpose,"","ARTWORK",art,state.fileMeta?"File selected on my device: "+state.fileMeta.name:"",state.note?"Note: "+state.note:"",state.extra?"Detail: "+state.extra:"","","CONTACT","Name: "+state.name,state.company?"Business: "+state.company:"",state.phone?"Phone: "+state.phone:"",state.email?"Email: "+state.email:"","Timing: "+time,"","I understand that this is a print brief, not an order or quote."].filter(function(v,i,a){return v!==""||a[i-1]!=="";}).join("\n");
  }

  function bind() {
    var root=document.getElementById("print-session");
    root.querySelectorAll("[data-choice]").forEach(function(btn){btn.onclick=function(){var value=btn.dataset.choice;if(state.step===0){state.product=value;state.purpose="";state.step=1;}else if(state.step===1){state.purpose=value;state.step=2;}else{state.artworkState=value;}save();render();};});
    var back=root.querySelector("[data-back]"); if(back) back.onclick=function(){capture();state.step=Math.max(0,state.step-1);state.completed=false;save();render();};
    var next=root.querySelector("[data-next]"); if(next) next.onclick=function(){capture();if(!state.artworkState){showError(t("chooseProduct"));return;}state.step=3;save();render();};
    var review=root.querySelector("[data-review]"); if(review) review.onclick=function(){capture();var name=document.getElementById("contact-name"),email=document.getElementById("contact-email");if(!state.name){name.setAttribute("aria-invalid","true");showError(t("nameError"));name.focus();return;}if(!state.phone&&!state.email){showError(t("contactError"));document.getElementById("contact-phone").focus();return;}if(state.email&&!/^\S+@\S+\.\S+$/.test(state.email)){email.setAttribute("aria-invalid","true");showError(t("emailError"));email.focus();return;}state.completed=true;save();render();};
    var file=document.getElementById("artwork-file"); if(file) file.onchange=function(){var f=file.files&&file.files[0],status=document.getElementById("file-status");if(!f)return;if(f.size>MAX_FILE||!ALLOWED.test(f.name)){state.fileMeta=null;status.textContent=t("badFile");status.classList.add("is-error");file.value="";return;}state.fileMeta={name:f.name,size:f.size,type:f.type};status.textContent=t("fileSelected",{name:f.name})+" "+t("localFile");status.classList.remove("is-error");save();renderTicket();};
    var wa=root.querySelector("[data-whatsapp]"); if(wa) wa.onclick=function(){if(!navigator.onLine){showError(t("offline"));return;}var opened=window.open("https://wa.me/"+PHONE+"?text="+encodeURIComponent(buildMessage()),"_blank","noopener");if(!opened){showError(t("waFail"));addCopyButton();}};
    var edit=root.querySelector("[data-edit]"); if(edit) edit.onclick=function(){state.completed=false;state.step=3;save();render();};
    var clear=root.querySelector("[data-clear]"); if(clear) clear.onclick=openClear;
  }
  function capture(){var n=document.getElementById("job-note"),x=document.getElementById("job-extra");if(n)state.note=n.value.trim();if(x)state.extra=x.value.trim();[["contact-name","name"],["contact-company","company"],["contact-phone","phone"],["contact-email","email"],["contact-timing","timing"]].forEach(function(pair){var el=document.getElementById(pair[0]);if(el)state[pair[1]]=el.value.trim();});}
  function showError(message){var n=document.getElementById("session-error");if(n)n.textContent=message;}
  function addCopyButton(){var area=document.querySelector(".completion .session-actions");if(!area||area.querySelector("[data-copy-brief]"))return;var b=document.createElement("button");b.type="button";b.className="button button-quiet";b.dataset.copyBrief="";b.textContent=t("copy");b.onclick=function(){navigator.clipboard&&navigator.clipboard.writeText(buildMessage());};area.appendChild(b);}
  function openClear(){var d=document.getElementById("start-over-dialog");if(d.showModal)d.showModal();else if(confirm(t("clearTitle")))clearAll();}
  function clearAll(){try{localStorage.removeItem(STORAGE_KEY);}catch(e){}state=fresh();pendingSaved=null;document.getElementById("start-over-dialog").close();showResume();render();}

  function render() {
    staticCopy(); showResume(); renderTicket();
    var root=document.getElementById("print-session");
    root.innerHTML=state.completed?renderCompletion():state.step===0?renderStep1():state.step===1?renderStep2():state.step===2?renderStep3():renderStep4();
    if(!storageWorks) showError(t("storageFail"));
    bind();
    var q=document.getElementById("active-question"); if(q&&document.activeElement!==document.body)setTimeout(function(){q.focus({preventScroll:true});},0);
  }

  document.querySelectorAll("[data-start-desk]").forEach(function(n){n.onclick=function(){startDesk();};});
  document.querySelectorAll("[data-product]").forEach(function(n){n.onclick=function(){startDesk(n.dataset.product);};});
  document.querySelectorAll("[data-lang]").forEach(function(n){n.onclick=function(){lang=n.dataset.lang;localStorage.setItem("vral-graphics-lang",lang);render();};});
  document.querySelector("[data-dialog-keep]").onclick=function(){document.getElementById("start-over-dialog").close();};
  document.querySelector("[data-dialog-clear]").onclick=clearAll;
  document.getElementById("start-over-dialog").addEventListener("click",function(e){if(e.target===this)this.close();});
  function money(cents) { return new Intl.NumberFormat("en-US", { style:"currency", currency:"USD" }).format(cents / 100); }
  function renderSpecials() { var printing=document.querySelector('input[name="special"]:checked'),design=document.querySelector('input[name="design"]:checked');if(!printing||!design)return;var p=Number(printing.value),d=Number(design.value),tax=Math.round(p*0.07),back=d===8500?1000:0;document.querySelector("[data-printing]").textContent=money(p);document.querySelector("[data-front]").textContent=money(7500);document.querySelector("[data-back]").textContent=money(back);document.querySelector("[data-taxable]").textContent=money(p);document.querySelector("[data-tax]").textContent=money(tax);document.querySelector("[data-total]").textContent=money(p+d+tax); }
  document.querySelectorAll('input[name="special"],input[name="design"]').forEach(function(n){n.addEventListener("change",renderSpecials);}); renderSpecials();
  render();
})();
