(function (w, d) {
  "use strict";
  var DRAFT_KEY="vg-field-draft-v2",DRAFT_TTL=4*60*60*1000;
  var COPY={
    en:{loginTitle:"Field sign in",loginLead:"Fast capture for conversations in the real world.",username:"Username",password:"Password",signIn:"Sign in",signOut:"Sign out",fieldMode:"Field",preview:"Local experience preview",previewNote:"Nothing will be recorded.",timePromise:"About 60 seconds",title:"Quick capture",lead:"Save the conversation. The system handles the follow-up.",business:"Business",name:"Contact",phone:"Phone / WhatsApp",email:"Email",need:"What do they need?",cards:"Cards",flyers:"Flyers",menus:"Menus",banners:"Banners",windows:"Windows",signs:"Signs",other:"Other",more:"Add context",address:"Address",optional:"optional",notes:"Note",notesPlaceholder:"What should happen next?",consent:"They asked to be contacted about printing.",save:"Save lead",mine:"Recent leads",private:"Only what you can see",blocked:"Field login is not configured. Nothing was simulated.",unauthorized:"That sign-in did not work.",contactRequired:"Add a phone or email.",consentRequired:"Confirm that they asked to be contacted.",required:"Add the business and contact name.",offline:"No connection. An encrypted draft stays on this device for four hours. The lead is not recorded yet.",recorded:"Lead recorded.",duplicate:"Lead already on file.",notRecorded:"The server did not record this lead.",crmBlocked:"CRM delivery is not configured.",crmQueued:"CRM update queued.",crmDelivered:"CRM updated.",offers:"Open offers",whatsapp:"Open WhatsApp",another:"Capture another",empty:"No leads yet.",signedIn:"Signed in as",previewSaved:"Preview complete. Nothing was recorded."},
    es:{loginTitle:"Entrada de campo",loginLead:"Captura rápida para conversaciones en el mundo real.",username:"Usuario",password:"Contraseña",signIn:"Entrar",signOut:"Salir",fieldMode:"Campo",preview:"Vista local de experiencia",previewNote:"Nada será grabado.",timePromise:"Aproximadamente 60 segundos",title:"Captura rápida",lead:"Guarda la conversación. El sistema maneja el seguimiento.",business:"Negocio",name:"Contacto",phone:"Teléfono / WhatsApp",email:"Correo",need:"¿Qué necesita?",cards:"Tarjetas",flyers:"Flyers",menus:"Menús",banners:"Banners",windows:"Ventanas",signs:"Letreros",other:"Otro",more:"Agregar contexto",address:"Dirección",optional:"opcional",notes:"Nota",notesPlaceholder:"¿Qué debe pasar después?",consent:"Pidió que lo contactemos sobre impresión.",save:"Guardar lead",mine:"Leads recientes",private:"Solo lo que puedes ver",blocked:"El acceso de campo no está configurado. Nada fue simulado.",unauthorized:"Ese acceso no funcionó.",contactRequired:"Agrega un teléfono o correo.",consentRequired:"Confirma que pidió ser contactado.",required:"Agrega el negocio y el contacto.",offline:"Sin conexión. Un borrador cifrado queda cuatro horas. El lead todavía no está grabado.",recorded:"Lead grabado.",duplicate:"El lead ya existe.",notRecorded:"El servidor no grabó este lead.",crmBlocked:"La entrega al CRM no está configurada.",crmQueued:"Actualización de CRM en cola.",crmDelivered:"CRM actualizado.",offers:"Abrir ofertas",whatsapp:"Abrir WhatsApp",another:"Capturar otro",empty:"Todavía no hay leads.",signedIn:"Sesión de",previewSaved:"Vista completada. Nada fue grabado."}
  };
  var loginPanel=d.getElementById("login-panel"),appPanel=d.getElementById("app-panel"),loginForm=d.getElementById("login-form"),leadForm=d.getElementById("lead-form");
  var loginStatus=d.getElementById("login-status"),formStatus=d.getElementById("form-status"),result=d.getElementById("result"),list=d.getElementById("lead-list"),sessionLine=d.getElementById("session-line");
  var idempotencyKey=newKey(),preview=false;
  var DEMO=[{business:"Palms Dental",name:"Maya",status:"New",interest:"Window graphics"},{business:"The Grill House",name:"Luis",status:"Contacted",interest:"Menus"}];
  function lang(){return(w.VralSite&&w.VralSite.lang&&w.VralSite.lang())||"en";}
  function t(key){return(COPY[lang()]||COPY.en)[key]||COPY.en[key]||key;}
  function esc(value){return String(value==null?"":value).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");}
  function applyCopy(){d.querySelectorAll("[data-copy]").forEach(function(node){node.textContent=t(node.getAttribute("data-copy"));});d.querySelectorAll("[data-copy-placeholder]").forEach(function(node){node.setAttribute("placeholder",t(node.getAttribute("data-copy-placeholder")));});}
  function newKey(){var bytes=new Uint8Array(18);if(w.crypto&&crypto.getRandomValues)crypto.getRandomValues(bytes);else bytes.forEach(function(_,i){bytes[i]=Math.floor(Math.random()*256);});return Array.from(bytes,function(b){return("0"+b.toString(16)).slice(-2);}).join("").slice(0,24);}
  function api(url,options){return fetch(url,Object.assign({credentials:"same-origin",headers:{"content-type":"application/json"}},options||{})).then(function(res){return res.json().catch(function(){return{};}).then(function(body){return{res:res,body:body};});});}
  function setStatus(node,message,kind){node.textContent=message||"";node.className="field-status"+(kind?" is-"+kind:"");}
  function localPreview(){return/^(localhost|127\.0\.0\.1)$/.test(w.location.hostname)&&new URLSearchParams(w.location.search).get("demo")==="1";}
  function payload(){
    return{name:leadForm.name.value.trim(),business:leadForm.business.value.trim(),phone:leadForm.phone.value.trim(),email:leadForm.email.value.trim(),address:leadForm.address.value.trim(),interest:leadForm.interest.value||"Printing",notes:leadForm.notes.value.trim(),consent:leadForm.consent.checked,website:leadForm.website.value,idempotencyKey:idempotencyKey,language:lang(),action:"save",source:"Field"};
  }
  function validate(data){if(!data.name||!data.business)return t("required");if(!data.phone&&!data.email)return t("contactRequired");if(!data.consent)return t("consentRequired");return"";}
  async function protectDraft(data){
    try{if(!w.crypto||!crypto.subtle)return;var raw=crypto.getRandomValues(new Uint8Array(32)),iv=crypto.getRandomValues(new Uint8Array(12)),key=await crypto.subtle.importKey("raw",raw,"AES-GCM",false,["encrypt"]),cipher=await crypto.subtle.encrypt({name:"AES-GCM",iv:iv},key,new TextEncoder().encode(JSON.stringify(data)));sessionStorage.setItem(DRAFT_KEY,JSON.stringify({exp:Date.now()+DRAFT_TTL,iv:Array.from(iv),key:Array.from(raw),data:Array.from(new Uint8Array(cipher))}));}catch(_){}
  }
  async function readDraft(){
    try{var value=sessionStorage.getItem(DRAFT_KEY);if(!value||!crypto.subtle)return null;var bundle=JSON.parse(value);if(!bundle||bundle.exp<Date.now()){sessionStorage.removeItem(DRAFT_KEY);return null;}var key=await crypto.subtle.importKey("raw",new Uint8Array(bundle.key),"AES-GCM",false,["decrypt"]),plain=await crypto.subtle.decrypt({name:"AES-GCM",iv:new Uint8Array(bundle.iv)},key,new Uint8Array(bundle.data));return JSON.parse(new TextDecoder().decode(plain));}catch(_){return null;}
  }
  function clearDraft(){try{sessionStorage.removeItem(DRAFT_KEY);}catch(_){}}
  async function restoreDraft(){var data=await readDraft();if(!data)return;["name","business","phone","email","address","interest","notes"].forEach(function(key){if(data[key]!=null&&leadForm[key])leadForm[key].value=data[key];});leadForm.consent.checked=data.consent===true;if(data.idempotencyKey)idempotencyKey=data.idempotencyKey;syncInterest();}
  function syncInterest(){d.querySelectorAll("[data-interest]").forEach(function(button){button.setAttribute("aria-pressed",button.getAttribute("data-interest")===leadForm.interest.value?"true":"false");});}
  function crmState(delivery){var item=(delivery||[]).filter(function(entry){return entry.channel==="crm";})[0];if(!item||item.status==="BLOCKED")return t("crmBlocked");if(item.status==="DELIVERED")return t("crmDelivered");return t("crmQueued");}
  function whatsappUrl(data){var text="Vral Graphics field lead: "+data.name+" / "+data.business+" / "+(data.phone||data.email)+" / "+data.interest;if(w.VralIntake&&w.VralIntake.whatsappUrl)return w.VralIntake.whatsappUrl(text);return"https://wa.me/17865911017?text="+encodeURIComponent(text);}
  function renderResult(body,data){
    var title=body.persistence==="DUPLICATE"?t("duplicate"):t("recorded");
    result.hidden=false;result.innerHTML="<strong>"+esc(title)+"</strong><p>"+esc(crmState(body.delivery))+"</p><div class=\"result-actions\"><a href=\"/offers/index.html\" target=\"_blank\" rel=\"noopener\">"+esc(t("offers"))+"</a><a href=\""+esc(whatsappUrl(data))+"\" target=\"_blank\" rel=\"noopener\">"+esc(t("whatsapp"))+"</a><a href=\"#\" data-another>"+esc(t("another"))+"</a></div>";
    result.querySelector("[data-another]").addEventListener("click",function(event){event.preventDefault();resetForm();});
  }
  function renderLeads(leads){
    if(!leads.length){list.innerHTML='<div class="field-empty">'+esc(t("empty"))+"</div>";return;}
    list.innerHTML=leads.slice(0,8).map(function(lead){return'<article class="lead-row"><div><b>'+esc(lead.business||lead.name)+'</b><small>'+esc(lead.name||"")+' · '+esc(lead.interest||"Printing")+'</small></div><span>'+esc(lead.status||"New")+"</span></article>";}).join("");
  }
  function loadLeads(){
    if(preview){renderLeads(DEMO);return;}
    api("/api/field/leads",{method:"GET",headers:{}}).then(function(got){renderLeads(got.res.ok?(got.body.leads||[]):[]);}).catch(function(){renderLeads([]);});
  }
  function showApp(session,isPreview){
    preview=isPreview===true;loginPanel.hidden=true;appPanel.hidden=false;sessionLine.textContent=t("signedIn")+" "+session.name+" · "+session.role;d.getElementById("preview-banner").hidden=!preview;restoreDraft().then(loadLeads);
  }
  function showLogin(){loginPanel.hidden=false;appPanel.hidden=true;}
  function resetForm(){leadForm.reset();leadForm.interest.value="Printing";idempotencyKey=newKey();result.hidden=true;result.innerHTML="";clearDraft();syncInterest();setStatus(formStatus,"","");leadForm.business.focus();}
  loginForm.addEventListener("submit",function(event){
    event.preventDefault();api("/api/field/login",{method:"POST",body:JSON.stringify({username:loginForm.username.value,password:loginForm.password.value})}).then(function(got){if(got.res.status===503)return setStatus(loginStatus,t("blocked"),"error");if(!got.res.ok)return setStatus(loginStatus,t("unauthorized"),"error");showApp(got.body,false);}).catch(function(){setStatus(loginStatus,t("blocked"),"error");});
  });
  d.getElementById("sign-out").addEventListener("click",function(){if(preview){w.location.href="/field/index.html";return;}api("/api/field/logout",{method:"POST",body:"{}"}).then(showLogin);});
  d.querySelectorAll("[data-interest]").forEach(function(button){button.addEventListener("click",function(){leadForm.interest.value=button.getAttribute("data-interest");syncInterest();});});
  leadForm.addEventListener("submit",async function(event){
    event.preventDefault();var data=payload(),error=validate(data);if(error)return setStatus(formStatus,error,"error");
    await protectDraft(data);var button=leadForm.querySelector(".save-button");button.disabled=true;result.hidden=true;
    if(preview){setTimeout(function(){button.disabled=false;setStatus(formStatus,t("previewSaved"),"ok");renderResult({persistence:"RECORDED",delivery:[]},data);},250);return;}
    api("/api/field/leads",{method:"POST",body:JSON.stringify(data)}).then(function(got){if(!got.res.ok||!got.body.id){setStatus(formStatus,(got.body&&got.body.error)||t("notRecorded"),"error");return;}clearDraft();setStatus(formStatus,got.body.persistence==="DUPLICATE"?t("duplicate"):t("recorded"),"ok");renderResult(got.body,data);loadLeads();}).catch(function(){setStatus(formStatus,t("offline"),"error");}).then(function(){button.disabled=false;});
  });
  d.documentElement.addEventListener("vral:lang",function(){applyCopy();loadLeads();});
  applyCopy();syncInterest();
  if(localPreview())showApp({name:"Local preview",role:"experience"},true);
  else api("/api/field/session",{method:"GET",headers:{}}).then(function(got){if(got.res.ok)showApp(got.body,false);else showLogin();}).catch(showLogin);
})(window,document);
