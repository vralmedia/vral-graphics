(function (w, d) {
  "use strict";
  var host = d.getElementById("jobs-app");
  if (!host || !w.VralJobStore) return;

  var COPY = {
    en: {
      title: "My print job", lead: "One job. One place to follow it.", next: "Next", reviewing: "We’re reviewing your request.", reviewingNote: "A Vral Graphics representative will confirm the details before price or production.", timeline: "Job timeline", details: "Job details", request: "Request", product: "Product", quantity: "Quantity", artwork: "Artwork", fulfillment: "Fulfillment", received: "Received", waiting: "Waiting", addArtwork: "Add artwork", upload: "Upload", uploading: "Uploading…", stored: "Artwork stored with this job.", failed: "The artwork was not stored. Your existing request is still safe.", emptyTitle: "No saved job here yet.", emptyNote: "Jobs appear here after the website confirms that your request was recorded. You can also enter a job code from this device.", code: "Job code", find: "Find job", notFound: "That job is not saved on this device. Use the secure link sent by Vral Graphics.", start: "What do you need?",
      proofTitle:"Review your proof",proofLead:"Check every name, number, color, and edge before approving.",proofLoading:"Loading your secure proof…",approve:"Approve proof",changes:"Request changes",changeNote:"What should change?",decisionSaved:"Your decision was recorded.",decisionFailed:"Your decision was not recorded. Try again or contact Vral.",quote:"Quote",total:"Total",stageArtwork:"Add your artwork.",stageApproval:"Your proof is ready.",stagePayment:"Payment is next.",stagePaid:"Released for production.",stageProduction:"Your job is on press.",stageReady:"Your job is ready.",stageComplete:"Delivered.",secureArtwork:"A secure artwork link appears after the production workspace is connected."
    },
    es: {
      title: "Mi trabajo", lead: "Un trabajo. Un lugar para seguirlo.", next: "Siguiente", reviewing: "Estamos revisando tu pedido.", reviewingNote: "Una persona de Vral Graphics confirmará los detalles antes del precio o la producción.", timeline: "Línea del trabajo", details: "Detalles", request: "Pedido", product: "Producto", quantity: "Cantidad", artwork: "Arte", fulfillment: "Entrega", received: "Recibido", waiting: "Esperando", addArtwork: "Agregar arte", upload: "Subir", uploading: "Subiendo…", stored: "Arte guardado con este trabajo.", failed: "El arte no se guardó. Tu pedido existente sigue seguro.", emptyTitle: "Todavía no hay un trabajo guardado aquí.", emptyNote: "Los trabajos aparecen después de que el sitio confirma que el pedido fue registrado. También puedes escribir un código guardado en este aparato.", code: "Código", find: "Buscar", notFound: "Ese trabajo no está guardado en este aparato. Usa el enlace seguro enviado por Vral Graphics.", start: "¿Qué necesitas?",
      proofTitle:"Revisa tu prueba",proofLead:"Revisa nombres, números, colores y bordes antes de aprobar.",proofLoading:"Cargando tu prueba segura…",approve:"Aprobar prueba",changes:"Pedir cambios",changeNote:"¿Qué debemos cambiar?",decisionSaved:"Tu decisión fue guardada.",decisionFailed:"No pudimos guardar tu decisión. Intenta otra vez o contacta a Vral.",quote:"Presupuesto",total:"Total",stageArtwork:"Agrega tu arte.",stageApproval:"Tu prueba está lista.",stagePayment:"El pago es lo próximo.",stagePaid:"Liberado para producción.",stageProduction:"Tu trabajo está en prensa.",stageReady:"Tu trabajo está listo.",stageComplete:"Entregado.",secureArtwork:"El enlace seguro para el arte aparece cuando se conecta el workspace de producción."
    }
  };
  var FILES = { "business-cards":"cards.webp", "flyers-postcards":"flyers.webp", "brochures-menus":"menus.webp", banners:"banners.webp", "window-graphics":"windows.webp", "signs-aframes":"signs.webp" };
  var remoteLoaded = false;
  var proofLoadedFor = "";
  function lang() { return w.VralSite && w.VralSite.lang ? w.VralSite.lang() : "en"; }
  function t(key) { return (COPY[lang()] || COPY.en)[key] || COPY.en[key] || key; }
  function esc(value) { return String(value == null ? "" : value).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/"/g,"&quot;"); }
  function activeForUrl() {
    var job = w.VralJobStore.active();
    var id = new URLSearchParams(w.location.search).get("id");
    if (!job) return null;
    return !id || id === job.id || id.toUpperCase() === job.shortId ? job : null;
  }
  function date(value) { try { return new Intl.DateTimeFormat(lang() === "es" ? "es-US" : "en-US", { month:"short", day:"numeric", hour:"numeric", minute:"2-digit" }).format(new Date(value)); } catch (_) { return ""; } }
  function emptyView() {
    return '<section class="empty-jobs" id="track"><img src="../assets/mascot/reggie-static.svg" width="112" height="112" alt=""><h1>' + esc(t("emptyTitle")) + '</h1><p>' + esc(t("emptyNote")) + '</p><form class="track-form"><label class="visually-hidden" for="job-code">' + esc(t("code")) + '</label><input id="job-code" name="code" autocomplete="off" placeholder="' + esc(t("code")) + '"><button class="job-button" type="submit">' + esc(t("find")) + '</button></form><p class="track-message" role="status"></p><a class="job-button" href="/#desk-title">' + esc(t("start")) + "</a></section>";
  }
  function timeline(job) {
    return '<ol class="timeline">' + job.events.map(function (event, index) {
      return '<li class="' + (event.at ? "is-done" : "") + '"><i>' + (event.at ? "✓" : index + 1) + '</i><div><b>' + esc(event.label) + '</b><small>' + (event.at ? esc(date(event.at)) : esc(t("waiting"))) + "</small></div></li>";
    }).join("") + "</ol>";
  }
  function nextTitle(job) {
    var key = {"Awaiting Artwork":"stageArtwork","Awaiting Approval":"stageApproval","Payment Pending":"stagePayment",Paid:"stagePaid","In Production":"stageProduction",Ready:"stageReady",Completed:"stageComplete"}[job.status];
    return key ? t(key) : t("reviewing");
  }
  function quoteBlock(job) {
    if (!job.quote) return "";
    var total = Number(job.quote.totalCents);
    var amount = Number.isFinite(total) ? new Intl.NumberFormat(lang()==="es"?"es-US":"en-US",{style:"currency",currency:job.quote.currency||"USD"}).format(total/100) : "";
    return '<section class="job-panel quote-summary"><div><span>'+esc(t("quote"))+' · v'+esc(job.quote.version||1)+'</span><strong>'+esc(job.quote.status||"")+'</strong></div><div><span>'+esc(t("total"))+'</span><strong>'+esc(amount)+'</strong></div></section>';
  }
  function proofBlock(job) {
    if (!job.proof) return "";
    var canDecide = job.proof.status === "review" || job.status === "Awaiting Approval";
    return '<section class="job-panel proof-review"><h2>'+esc(t("proofTitle"))+'</h2><p>'+esc(t("proofLead"))+'</p><div class="proof-preview" data-proof-preview><span>'+esc(t("proofLoading"))+'</span></div>'+(canDecide?'<label class="proof-note"><span>'+esc(t("changeNote"))+'</span><textarea name="proofNote"></textarea></label><div class="proof-actions"><button class="job-button" type="button" data-decision="approved">'+esc(t("approve"))+'</button><button class="job-button is-secondary" type="button" data-decision="changes_requested">'+esc(t("changes"))+'</button></div><p class="proof-status" role="status"></p>':"")+'</section>';
  }
  function jobView(job) {
    var image = FILES[job.product];
    var upload=job.trackingToken?'<form class="upload-control"><strong>' + esc(t("addArtwork")) + '</strong><input type="file" name="file" accept=".pdf,.jpg,.jpeg,.png,.webp,.ai,.eps"><button class="job-button" type="submit">' + esc(t("upload")) + '</button><p class="job-status" role="status"></p></form>':'<p class="job-status secure-artwork">'+esc(t("secureArtwork"))+'</p>';
    return '<header class="jobs-head"><div><h1>' + esc(t("title")) + '</h1><p>' + esc(t("lead")) + '</p></div><span class="job-id">' + esc(t("request")) + " · " + esc(job.shortId) + '</span></header><div class="job-layout"><div><section class="next-action"><span>' + esc(t("next")) + '</span><h2>' + esc(nextTitle(job)) + '</h2><p>' + esc(t("reviewingNote")) + '</p></section>'+quoteBlock(job)+proofBlock(job)+'<section class="job-panel"><h2>' + esc(t("timeline")) + "</h2>" + timeline(job) + '</section></div><aside><section class="job-panel">' + (image ? '<div class="job-product"><img src="../assets/products/' + image + '" width="900" height="900" alt=""></div>' : "") + '<h2>' + esc(t("details")) + '</h2><dl class="job-spec"><div><dt>' + esc(t("product")) + '</dt><dd>' + esc(job.productLabel) + '</dd></div>' + (job.quantity ? '<div><dt>' + esc(t("quantity")) + '</dt><dd>' + esc(job.quantity) + '</dd></div>' : "") + '<div><dt>' + esc(t("artwork")) + '</dt><dd>' + esc(job.artwork || t("waiting")) + '</dd></div><div><dt>' + esc(t("fulfillment")) + '</dt><dd>' + esc(job.fulfillment || t("waiting")) + '</dd></div></dl>'+upload+'</section></aside></div>';
  }
  function render() {
    var job = activeForUrl();
    host.innerHTML = job ? jobView(job) : emptyView();
    bind(job);
    if (job && job.trackingToken && !remoteLoaded) loadRemote(job);
  }
  function remoteJob(body, local) {
    var events = Array.isArray(body.events) && body.events.length ? body.events.map(function(event){
      return { type:event.type || event.eventType || "event", at:event.at || event.createdAt || null, label:event.label || event.title || event.type || "Update" };
    }) : local.events;
    return Object.assign({}, local, {
      status: body.status || body.stage || local.status,
      product: body.product || body.productId || local.product,
      productLabel: body.productLabel || local.productLabel,
      quantity: body.quantity || local.quantity,
      artwork: body.artwork || body.artworkStatus || local.artwork,
      fulfillment: body.fulfillment || local.fulfillment,
      nextAction: body.nextAction || local.nextAction,
      updatedAt: body.updatedAt || local.updatedAt,
      events: events
      ,proof: body.proof || local.proof || null
      ,quote: body.quote || local.quote || null
    });
  }
  function loadRemote(job) {
    remoteLoaded = true;
    fetch("/api/jobs/track", { method:"GET", credentials:"same-origin", headers:{ "x-vral-job-token":job.trackingToken } })
      .then(function(res){return res.ok ? res.json() : null;})
      .then(function(body){if(!body)return;w.VralJobStore.updateActive(remoteJob(body,job));render();})
      .catch(function(){});
  }
  function loadProof(job) {
    if (!job.proof || !job.trackingToken || proofLoadedFor === job.proof.id) return;
    proofLoadedFor = job.proof.id;
    fetch("/api/jobs/"+encodeURIComponent(job.id)+"/proof",{credentials:"same-origin",headers:{"x-vral-job-token":job.trackingToken}})
      .then(function(res){if(!res.ok)throw new Error("proof");return res.blob();})
      .then(function(blob){var host=d.querySelector("[data-proof-preview]");if(!host)return;var url=URL.createObjectURL(blob);host.innerHTML=blob.type==="application/pdf"?'<iframe title="'+esc(t("proofTitle"))+'" src="'+esc(url)+'"></iframe>':'<img alt="'+esc(t("proofTitle"))+'" src="'+esc(url)+'">';})
      .catch(function(){var host=d.querySelector("[data-proof-preview]");if(host)host.textContent=t("decisionFailed");});
  }
  function decide(job,decision) {
    var status=host.querySelector(".proof-status"),note=host.querySelector('[name="proofNote"]');
    host.querySelectorAll("[data-decision]").forEach(function(btn){btn.disabled=true;});
    fetch("/api/jobs/"+encodeURIComponent(job.id)+"/approval",{method:"POST",credentials:"same-origin",headers:{"content-type":"application/json","x-vral-job-token":job.trackingToken||""},body:JSON.stringify({decision:decision,note:note?note.value:""})})
      .then(function(res){if(!res.ok)throw new Error("decision");status.textContent=t("decisionSaved");remoteLoaded=false;proofLoadedFor="";setTimeout(render,450);})
      .catch(function(){status.textContent=t("decisionFailed");host.querySelectorAll("[data-decision]").forEach(function(btn){btn.disabled=false;});});
  }
  function bind(job) {
    var track = host.querySelector(".track-form");
    if (track) track.addEventListener("submit", function (event) {
      event.preventDefault();
      var saved = w.VralJobStore.active();
      var code = track.code.value.trim().toUpperCase();
      if (saved && (code === saved.shortId || code === saved.id.toUpperCase())) { w.location.search = "?id=" + encodeURIComponent(saved.id); return; }
      host.querySelector(".track-message").textContent = t("notFound");
    });
    var upload = host.querySelector(".upload-control");
    if (upload && job) upload.addEventListener("submit", function (event) {
      event.preventDefault();
      var file = upload.file.files[0];
      if (!file) return;
      var button = upload.querySelector("button");
      var status = upload.querySelector(".job-status");
      button.disabled = true; button.textContent = t("uploading"); status.textContent = "";
      var data = new FormData(); data.append("file", file); data.append("sku", job.sku || "");
      fetch("/api/print-requests/" + encodeURIComponent(job.id) + "/artwork", { method:"POST", credentials:"same-origin", headers:{ "x-vral-job-token":job.trackingToken || "" }, body:data })
        .then(function (res) { status.textContent = res.ok ? t("stored") : t("failed"); })
        .catch(function () { status.textContent = t("failed"); })
        .then(function () { button.disabled = false; button.textContent = t("upload"); });
    });
    host.querySelectorAll("[data-decision]").forEach(function(btn){btn.addEventListener("click",function(){decide(job,btn.getAttribute("data-decision"));});});
    if(job)loadProof(job);
  }
  d.documentElement.addEventListener("vral:lang", render);
  render();
})(window, document);
