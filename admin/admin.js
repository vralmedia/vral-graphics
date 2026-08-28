(function (w, d) {
  "use strict";

  var COLUMNS = ["New", "Contacted", "Quoted", "Awaiting Artwork", "Awaiting Approval", "Payment Pending", "Paid", "In Production", "Ready", "Completed", "Lost"];
  var COPY = {
    en: {
      workspace:"Operations",loginTitle:"Operations sign in",loginLead:"One job. One thread. Every team.",username:"Email or username",password:"Password",signIn:"Sign in",signOut:"Sign out",
      blocked:"Operations login is not configured. No session was simulated.",unauthorized:"That sign-in did not work.",today:"Today",exceptions:"Exceptions",jobs:"Jobs",customers:"Customers",pipeline:"Pipeline",
      search:"Search",searchPlaceholder:"Search jobs or customers",preview:"Local experience preview",previewNote:"Synthetic data. Never production.",
      todayLead:"The work that needs a decision now.",exceptionsLead:"Only work that left the normal path.",jobsLead:"Every active job, one operational truth.",customersLead:"Accounts with their current work attached.",pipelineLead:"Flow without a horizontal Kanban.",
      needsAttention:"Needs attention",newRequests:"New requests",inProgress:"In progress",ready:"Ready",nextUp:"Next up",recent:"Recent jobs",noExceptions:"No exceptions. Normal work can keep moving.",noJobs:"No jobs match this view.",
      job:"Job",customer:"Customer",status:"Status",owner:"Owner",nextAction:"Next action",updated:"Updated",open:"Open",jobsCount:"Jobs",active:"Active",
      integrationBlocked:"Delivery integration is not configured",deliveryFailed:"A delivery action failed",followOverdue:"Follow-up is overdue",paymentWaiting:"Payment is not verified",artworkWaiting:"Artwork is still needed",approvalWaiting:"Customer approval is still needed",
      paidBlocked:"Paid stays unavailable until a verified payment webhook.",move:"Move to",signedIn:"Signed in as",loading:"Loading live operations…",contact:"Contact",jobDetails:"Job details",activity:"Activity",source:"Source",received:"Received",notes:"Notes",noActivity:"No activity yet.",call:"Call",emailAction:"Email",stageActions:"Stage actions"
    },
    es: {
      workspace:"Operaciones",loginTitle:"Entrada de operaciones",loginLead:"Un trabajo. Un hilo. Todo el equipo.",username:"Correo o usuario",password:"Contraseña",signIn:"Entrar",signOut:"Salir",
      blocked:"El acceso de operaciones no está configurado. No se simuló una sesión.",unauthorized:"Ese acceso no funcionó.",today:"Hoy",exceptions:"Excepciones",jobs:"Trabajos",customers:"Clientes",pipeline:"Flujo",
      search:"Buscar",searchPlaceholder:"Buscar trabajos o clientes",preview:"Vista local de experiencia",previewNote:"Datos sintéticos. Nunca producción.",
      todayLead:"El trabajo que necesita una decisión ahora.",exceptionsLead:"Solo lo que salió del camino normal.",jobsLead:"Cada trabajo activo, una sola verdad.",customersLead:"Cuentas con su trabajo actual.",pipelineLead:"Flujo sin un Kanban horizontal.",
      needsAttention:"Necesita atención",newRequests:"Pedidos nuevos",inProgress:"En proceso",ready:"Listo",nextUp:"Lo próximo",recent:"Trabajos recientes",noExceptions:"No hay excepciones. El trabajo normal puede seguir.",noJobs:"No hay trabajos en esta vista.",
      job:"Trabajo",customer:"Cliente",status:"Estado",owner:"Dueño",nextAction:"Siguiente acción",updated:"Actualizado",open:"Abrir",jobsCount:"Trabajos",active:"Activos",
      integrationBlocked:"La integración de entrega no está configurada",deliveryFailed:"Falló una acción de entrega",followOverdue:"El seguimiento está vencido",paymentWaiting:"El pago no está verificado",artworkWaiting:"Todavía falta el arte",approvalWaiting:"Todavía falta la aprobación del cliente",
      paidBlocked:"Paid no está disponible hasta un webhook de pago verificado.",move:"Mover a",signedIn:"Sesión de",loading:"Cargando operaciones reales…",contact:"Contacto",jobDetails:"Detalles del trabajo",activity:"Actividad",source:"Origen",received:"Recibido",notes:"Notas",noActivity:"Todavía no hay actividad.",call:"Llamar",emailAction:"Email",stageActions:"Acciones de etapa"
    }
  };
  var DEMO = [
    {id:"demo-1001",business:"Palms Dental",name:"Maya Stone",phone:"305-555-0101",email:"maya@example.com",interest:"Window graphics",product:"window-graphics",source:"Field",owner:"Mike",status:"New",receivedAt:new Date(Date.now()-28*60000).toISOString(),updatedAt:new Date(Date.now()-28*60000).toISOString(),followUpDue:new Date(Date.now()+4*3600000).toISOString(),paymentVerified:false,delivery:[{channel:"crm",status:"BLOCKED"}],audit:[]},
    {id:"demo-1002",business:"The Grill House",name:"Luis Perez",phone:"305-555-0102",email:"luis@example.com",interest:"Menus",product:"brochures-menus",source:"Website",owner:"Mike",status:"Awaiting Approval",receivedAt:new Date(Date.now()-2*86400000).toISOString(),updatedAt:new Date(Date.now()-6*3600000).toISOString(),followUpDue:new Date(Date.now()-2*3600000).toISOString(),paymentVerified:false,delivery:[{channel:"crm",status:"DELIVERED"}],audit:[{type:"status",to:"Awaiting Approval",actor:"Design",at:new Date(Date.now()-6*3600000).toISOString()}]},
    {id:"demo-1003",business:"Elevate Fitness",name:"Dana Cole",phone:"305-555-0103",email:"dana@example.com",interest:"Flyers",product:"flyers-postcards",source:"Website",owner:"Anthony",status:"In Production",receivedAt:new Date(Date.now()-5*86400000).toISOString(),updatedAt:new Date(Date.now()-3*3600000).toISOString(),followUpDue:null,paymentVerified:true,delivery:[{channel:"crm",status:"DELIVERED"}],audit:[{type:"payment",eventId:"demo-event",actor:"webhook",at:new Date(Date.now()-26*3600000).toISOString()}]},
    {id:"demo-1004",business:"Brickell Realty",name:"Nora Lee",phone:"305-555-0104",email:"nora@example.com",interest:"A-frame sign",product:"signs-aframes",source:"Field",owner:"Mike",status:"Ready",receivedAt:new Date(Date.now()-7*86400000).toISOString(),updatedAt:new Date(Date.now()-40*60000).toISOString(),followUpDue:null,paymentVerified:true,delivery:[{channel:"crm",status:"DELIVERED"}],audit:[]}
  ];

  var loginPanel=d.getElementById("login-panel"),boardPanel=d.getElementById("board-panel"),host=d.getElementById("ops-view");
  var loginStatus=d.getElementById("login-status"),boardStatus=d.getElementById("board-status"),sessionLine=d.getElementById("session-line");
  var state={viewer:null,leads:[],view:"today",search:"",preview:false,selected:null};
  function lang(){return(w.VralSite&&w.VralSite.lang&&w.VralSite.lang())||"en";}
  function t(key){return(COPY[lang()]||COPY.en)[key]||COPY.en[key]||key;}
  function esc(value){return String(value==null?"":value).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");}
  function applyCopy(){
    d.querySelectorAll("[data-copy]").forEach(function(node){node.textContent=t(node.getAttribute("data-copy"));});
    d.querySelectorAll("[data-copy-placeholder]").forEach(function(node){node.setAttribute("placeholder",t(node.getAttribute("data-copy-placeholder")));});
  }
  function api(url,options){return fetch(url,Object.assign({credentials:"same-origin",headers:{"content-type":"application/json"}},options||{})).then(function(res){return res.json().catch(function(){return{};}).then(function(body){return{res:res,body:body};});});}
  function previewAllowed(){return /^(localhost|127\.0\.0\.1)$/.test(w.location.hostname)&&new URLSearchParams(w.location.search).get("demo")==="1";}
  function formatDate(value){if(!value)return"—";try{return new Intl.DateTimeFormat(lang()==="es"?"es-US":"en-US",{month:"short",day:"numeric",hour:"numeric",minute:"2-digit"}).format(new Date(value));}catch(_){return"—";}}
  function deliveryIssue(lead){
    var items=lead.delivery||[];
    if(items.some(function(item){return item.status==="FAILED";}))return t("deliveryFailed");
    if(items.some(function(item){return item.status==="BLOCKED";}))return t("integrationBlocked");
    return"";
  }
  function nextAction(lead){
    if(deliveryIssue(lead))return deliveryIssue(lead);
    if(lead.status==="New")return t("nextAction")+": contact";
    if(lead.status==="Awaiting Artwork")return t("artworkWaiting");
    if(lead.status==="Awaiting Approval")return t("approvalWaiting");
    if(lead.status==="Payment Pending"&&!lead.paymentVerified)return t("paymentWaiting");
    if(lead.status==="Ready")return lang()==="es"?"Coordinar entrega":"Coordinate fulfillment";
    return lang()==="es"?"Seguir el trabajo":"Keep job moving";
  }
  function exceptions(){
    var rows=[];
    state.leads.forEach(function(lead){
      var issue=deliveryIssue(lead);
      if(issue)rows.push({lead:lead,label:issue});
      if(lead.followUpDue&&Date.parse(lead.followUpDue)<Date.now()&&lead.status!=="Completed"&&lead.status!=="Lost")rows.push({lead:lead,label:t("followOverdue")});
      if(lead.status==="Payment Pending"&&!lead.paymentVerified)rows.push({lead:lead,label:t("paymentWaiting")});
      if(lead.status==="Awaiting Artwork")rows.push({lead:lead,label:t("artworkWaiting")});
    });
    return rows;
  }
  function filtered(){
    var q=state.search.trim().toLowerCase();
    if(!q)return state.leads.slice();
    return state.leads.filter(function(lead){return[lead.id,lead.business,lead.name,lead.email,lead.phone,lead.interest,lead.status,lead.owner].join(" ").toLowerCase().indexOf(q)!==-1;});
  }
  function table(leads){
    if(!leads.length)return'<div class="empty-state">'+esc(t("noJobs"))+"</div>";
    return'<div class="ops-table-wrap"><table class="ops-table"><thead><tr><th>'+esc(t("job"))+'</th><th>'+esc(t("status"))+'</th><th>'+esc(t("owner"))+'</th><th>'+esc(t("nextAction"))+'</th><th>'+esc(t("updated"))+'</th></tr></thead><tbody>'+leads.map(function(lead){
      return'<tr data-open="'+esc(lead.id)+'"><td><b>'+esc(lead.business||lead.name)+'</b><small>'+esc(String(lead.id).slice(0,8).toUpperCase())+' · '+esc(lead.interest||lead.product||"Printing")+'</small></td><td><span class="status-pill" data-state="'+esc(lead.status)+'">'+esc(lead.status)+'</span></td><td>'+esc(lead.owner||"—")+'</td><td>'+esc(nextAction(lead))+'</td><td>'+esc(formatDate(lead.updatedAt||lead.receivedAt))+"</td></tr>";
    }).join("")+"</tbody></table></div>";
  }
  function section(title,note,body){return'<section class="ops-section"><div class="section-head"><h2>'+esc(title)+'</h2>'+(note?'<span>'+esc(note)+'</span>':"")+"</div>"+body+"</section>";}
  function metrics(){
    var x=exceptions().length,n=state.leads.filter(function(l){return l.status==="New";}).length,p=state.leads.filter(function(l){return["Contacted","Quoted","Awaiting Artwork","Awaiting Approval","Payment Pending","Paid","In Production"].indexOf(l.status)!==-1;}).length,r=state.leads.filter(function(l){return l.status==="Ready";}).length;
    return'<div class="metric-strip"><div class="metric"><span>'+esc(t("needsAttention"))+'</span><strong>'+x+'</strong></div><div class="metric"><span>'+esc(t("newRequests"))+'</span><strong>'+n+'</strong></div><div class="metric"><span>'+esc(t("inProgress"))+'</span><strong>'+p+'</strong></div><div class="metric"><span>'+esc(t("ready"))+'</span><strong>'+r+"</strong></div></div>";
  }
  function exceptionList(rows){
    if(!rows.length)return'<div class="empty-state">'+esc(t("noExceptions"))+"</div>";
    return'<div class="exception-list">'+rows.map(function(item){return'<article class="exception-row"><span class="exception-icon">!</span><div><b>'+esc(item.label)+'</b><small>'+esc(item.lead.business||item.lead.name)+' · '+esc(item.lead.status)+'</small></div><button type="button" data-open="'+esc(item.lead.id)+'">'+esc(t("open"))+"</button></article>";}).join("")+"</div>";
  }
  function todayView(){
    var recent=filtered().sort(function(a,b){return Date.parse(b.updatedAt||b.receivedAt)-Date.parse(a.updatedAt||a.receivedAt);}).slice(0,8);
    return metrics()+section(t("nextUp"),exceptions().length+" "+t("exceptions").toLowerCase(),exceptionList(exceptions().slice(0,5)))+section(t("recent"),"",table(recent));
  }
  function exceptionsView(){return section(t("exceptions"),exceptions().length+" "+t("needsAttention").toLowerCase(),exceptionList(exceptions()));}
  function jobsView(){return section(t("jobs"),filtered().length+" "+t("jobs").toLowerCase(),table(filtered()));}
  function customersView(){
    var map={};
    filtered().forEach(function(lead){var key=lead.business||lead.name||"Unknown";if(!map[key])map[key]=[];map[key].push(lead);});
    var cards=Object.keys(map).sort().map(function(name){var rows=map[name],active=rows.filter(function(l){return l.status!=="Completed"&&l.status!=="Lost";}).length,last=rows.sort(function(a,b){return Date.parse(b.updatedAt||b.receivedAt)-Date.parse(a.updatedAt||a.receivedAt);})[0];return'<article class="customer-row" data-open="'+esc(last.id)+'"><h3>'+esc(name)+'</h3><p>'+esc(last.name||"")+'</p><dl><div><dt>'+esc(t("jobsCount"))+'</dt><dd>'+rows.length+'</dd></div><div><dt>'+esc(t("active"))+'</dt><dd>'+active+"</dd></div></dl></article>";}).join("");
    return section(t("customers"),Object.keys(map).length+" "+t("customers").toLowerCase(),cards?'<div class="customer-grid">'+cards+"</div>":'<div class="empty-state">'+esc(t("noJobs"))+"</div>");
  }
  function pipelineView(){
    var max=Math.max(1,state.leads.length),rows=COLUMNS.map(function(column){var count=state.leads.filter(function(l){return l.status===column;}).length;return'<div class="pipeline-row"><span>'+esc(column)+'</span><div class="pipeline-track"><i style="width:'+Math.max(2,Math.round(count/max*100))+'%"></i></div><b>'+count+"</b></div>";}).join("");
    return section(t("pipeline"),state.leads.length+" "+t("jobs").toLowerCase(),'<div class="pipeline-list">'+rows+"</div>");
  }
  function viewMeta(){
    var keys={today:["today","todayLead"],exceptions:["exceptions","exceptionsLead"],jobs:["jobs","jobsLead"],customers:["customers","customersLead"],pipeline:["pipeline","pipelineLead"]};
    return keys[state.view]||keys.today;
  }
  function render(){
    var meta=viewMeta();d.getElementById("view-title").textContent=t(meta[0]);d.getElementById("view-lead").textContent=t(meta[1]);
    d.querySelectorAll("[data-view]").forEach(function(btn){btn.setAttribute("aria-current",btn.getAttribute("data-view")===state.view?"page":"false");});
    var count=exceptions().length;d.querySelectorAll("[data-exception-count]").forEach(function(node){node.textContent=count;});
    host.innerHTML=state.view==="today"?todayView():state.view==="exceptions"?exceptionsView():state.view==="jobs"?jobsView():state.view==="customers"?customersView():pipelineView();
    bindRows();
  }
  function neighbors(status){
    var index=COLUMNS.indexOf(status),next=[];if(index>0)next.push(COLUMNS[index-1]);if(index>=0&&index<COLUMNS.length-1)next.push(COLUMNS[index+1]);if(status!=="Lost")next.push("Lost");return next.filter(function(value,i,list){return list.indexOf(value)===i;});
  }
  function openDetail(id){
    var lead=state.leads.filter(function(item){return item.id===id;})[0];if(!lead)return;state.selected=lead;
    var moves=neighbors(lead.status).map(function(status){var blocked=status==="Paid"&&lead.paymentVerified!==true;return'<button type="button" data-move="'+esc(status)+'"'+(blocked?" disabled":"")+'>'+esc(t("move"))+" "+esc(status)+(blocked?" · "+esc(t("paidBlocked")):"")+"</button>";}).join("");
    var contactLinks=(lead.phone?'<a href="tel:'+esc(String(lead.phone).replace(/[^0-9+]/g,""))+'">'+esc(t("call"))+'</a>':"")+(lead.email?'<a href="mailto:'+esc(lead.email)+'">'+esc(t("emailAction"))+'</a>':"");
    var audit=(lead.audit||[]).slice().reverse().map(function(event){return'<li><i></i><div><b>'+esc(event.to||event.type||"Update")+'</b><small>'+esc(event.actor||"System")+' · '+esc(formatDate(event.at||event.createdAt))+'</small></div></li>';}).join("");
    var panel=d.createElement("section");panel.className="detail-panel";panel.setAttribute("aria-label",lead.business||lead.name);panel.innerHTML='<button class="detail-close" type="button" aria-label="Close">×</button><h2>'+esc(lead.business||lead.name)+'</h2><p>'+esc(String(lead.id).slice(0,8).toUpperCase())+' · '+esc(lead.interest||lead.product||"Printing")+'</p><div class="detail-summary"><div><span>'+esc(t("status"))+'</span><b>'+esc(lead.status)+'</b></div><div><span>'+esc(t("owner"))+'</span><b>'+esc(lead.owner||"—")+'</b></div><div><span>'+esc(t("customer"))+'</span><b>'+esc(lead.name||"—")+'</b></div><div><span>'+esc(t("nextAction"))+'</span><b>'+esc(nextAction(lead))+'</b></div></div><section class="detail-block"><h3>'+esc(t("contact"))+'</h3><p>'+esc(lead.phone||"—")+'<br>'+esc(lead.email||"—")+'</p><div class="contact-actions">'+contactLinks+'</div></section><section class="detail-block"><h3>'+esc(t("jobDetails"))+'</h3><dl><div><dt>'+esc(t("source"))+'</dt><dd>'+esc(lead.source||"—")+'</dd></div><div><dt>'+esc(t("received"))+'</dt><dd>'+esc(formatDate(lead.receivedAt))+'</dd></div>'+(lead.notes?'<div><dt>'+esc(t("notes"))+'</dt><dd>'+esc(lead.notes)+'</dd></div>':"")+'</dl></section><section class="detail-block"><h3>'+esc(t("activity"))+'</h3>'+(audit?'<ol class="detail-activity">'+audit+'</ol>':'<p>'+esc(t("noActivity"))+'</p>')+'</section><section class="detail-block"><h3>'+esc(t("stageActions"))+'</h3><div class="detail-actions">'+moves+'</div></section>';
    d.body.appendChild(panel);panel.querySelector(".detail-close").addEventListener("click",function(){panel.remove();state.selected=null;});
    panel.querySelectorAll("[data-move]").forEach(function(btn){btn.addEventListener("click",function(){move(lead.id,btn.getAttribute("data-move"),panel);});});
  }
  function bindRows(){host.querySelectorAll("[data-open]").forEach(function(node){node.addEventListener("click",function(){openDetail(node.getAttribute("data-open"));});});}
  function move(id,status,panel){
    if(state.preview){var lead=state.leads.filter(function(item){return item.id===id;})[0];if(lead){lead.status=status;lead.updatedAt=new Date().toISOString();}if(panel)panel.remove();render();return;}
    boardStatus.textContent="";
    api("/api/admin/leads/"+encodeURIComponent(id),{method:"PATCH",body:JSON.stringify({status:status})}).then(function(got){
      if(got.res.status===409){boardStatus.className="ops-status is-error";boardStatus.textContent=t("paidBlocked");return;}
      if(!got.res.ok){boardStatus.className="ops-status is-error";boardStatus.textContent=got.body.error||"Update failed.";return;}
      if(panel)panel.remove();loadBoard();
    });
  }
  function showBoard(session,preview){
    state.viewer=session;state.preview=preview===true;loginPanel.hidden=true;boardPanel.hidden=false;sessionLine.textContent=t("signedIn")+" "+session.name+" · "+session.role;
    d.getElementById("preview-banner").hidden=!state.preview;
    if(state.preview){state.leads=DEMO.map(function(item){return Object.assign({},item);});render();}else loadBoard();
  }
  function loadBoard(){
    host.innerHTML='<div class="skeleton"></div><div class="skeleton"></div><div class="skeleton"></div>';
    api("/api/admin/operations",{method:"GET",headers:{}}).then(function(got){if(!got.res.ok){boardStatus.className="ops-status is-error";boardStatus.textContent=got.body.error||t("blocked");return;}state.leads=got.body.jobs||[];render();}).catch(function(){boardStatus.className="ops-status is-error";boardStatus.textContent=t("blocked");});
  }
  d.getElementById("login-form").addEventListener("submit",function(event){
    event.preventDefault();var form=event.currentTarget;
    api("/api/field/login",{method:"POST",body:JSON.stringify({username:form.username.value,password:form.password.value})}).then(function(got){
      if(got.res.status===503){loginStatus.className="ops-status is-error";loginStatus.textContent=t("blocked");return;}
      if(!got.res.ok){loginStatus.className="ops-status is-error";loginStatus.textContent=t("unauthorized");return;}
      showBoard(got.body,false);
    }).catch(function(){loginStatus.className="ops-status is-error";loginStatus.textContent=t("blocked");});
  });
  d.getElementById("sign-out").addEventListener("click",function(){if(state.preview){w.location.href="/admin/index.html";return;}api("/api/field/logout",{method:"POST",body:"{}"}).then(function(){loginPanel.hidden=false;boardPanel.hidden=true;});});
  d.querySelectorAll("[data-view]").forEach(function(btn){btn.addEventListener("click",function(){state.view=btn.getAttribute("data-view");render();});});
  d.getElementById("global-search").addEventListener("input",function(event){state.search=event.target.value;render();});
  d.documentElement.addEventListener("vral:lang",function(){applyCopy();render();});
  applyCopy();
  if(previewAllowed())showBoard({name:"Local preview",role:"experience"},true);
  else api("/api/field/session",{method:"GET",headers:{}}).then(function(got){if(got.res.ok)showBoard(got.body,false);}).catch(function(){});
})(window,document);
