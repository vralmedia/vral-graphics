(function (w, d) {
  "use strict";

  var DRAFT_KEY = "vg-field-draft-v1";
  var DRAFT_TTL = 4 * 60 * 60 * 1000;
  var COPY = {
    en: {
      kicker: "Private field ticket",
      title: "Field",
      lead: "One-hand capture for Mike. Login required. Nothing is saved until the server says so.",
      loginTitle: "Sign in",
      username: "Username",
      password: "Password",
      signIn: "Sign in",
      signOut: "Sign out",
      name: "Name",
      phone: "Phone",
      email: "Email",
      address: "Address",
      business: "Business",
      interest: "Interest",
      consent: "They asked to be contacted about printing.",
      save: "Save lead",
      saveOffers: "Save and send offers",
      saveWhatsapp: "Save and open WhatsApp",
      another: "Create another lead",
      mine: "Leads you can see",
      blocked: "Login is BLOCKED until field credentials are configured on the server. Nothing was simulated.",
      unauthorized: "That sign-in did not work.",
      offline: "The phone is offline. A protected draft stays on this device for 4 hours. The lead is not recorded and CRM is not saved.",
      recorded: "Lead recorded.",
      duplicate: "Same lead already on file.",
      notRecorded: "The server did not record this lead.",
      crmSaved: "CRM Saved",
      crmBlocked: "CRM BLOCKED — no real webhook URL",
      crmQueued: "CRM queued",
      crmFailed: "CRM failed",
      flyerBlocked: "Flyer BLOCKED — no real email endpoint",
      flyerQueued: "Flyer queued",
      flyerDelivered: "Flyer sent",
      flyerFailed: "Flyer failed",
      owner: "Owner",
      follow: "Follow-up due",
      signedIn: "Signed in as",
      empty: "No leads yet.",
      draftKept: "Draft kept on this phone. CRM is not saved.",
      offersHint: "Offers page is ready to send. Flyer email only if the server reports it.",
    },
    es: {
      kicker: "Ticket privado de campo",
      title: "Campo",
      lead: "Captura a una mano para Mike. Hay que entrar. Nada se guarda hasta que el servidor confirme.",
      loginTitle: "Entrar",
      username: "Usuario",
      password: "Contraseña",
      signIn: "Entrar",
      signOut: "Salir",
      name: "Nombre",
      phone: "Teléfono",
      email: "Correo",
      address: "Dirección",
      business: "Negocio",
      interest: "Interés",
      consent: "Pidieron que los contactemos sobre impresión.",
      save: "Guardar lead",
      saveOffers: "Guardar y enviar ofertas",
      saveWhatsapp: "Guardar y abrir WhatsApp",
      another: "Crear otro lead",
      mine: "Leads que puedes ver",
      blocked: "El acceso está BLOCKED hasta configurar credenciales en el servidor. Nada fue simulado.",
      unauthorized: "Ese acceso no funcionó.",
      offline: "El teléfono está sin red. Un borrador protegido queda 4 horas. El lead no está grabado y el CRM no está guardado.",
      recorded: "Lead grabado.",
      duplicate: "Ese lead ya está en el archivo.",
      notRecorded: "El servidor no grabó este lead.",
      crmSaved: "CRM Saved",
      crmBlocked: "CRM BLOCKED — no hay URL real",
      crmQueued: "CRM en cola",
      crmFailed: "CRM falló",
      flyerBlocked: "Flyer BLOCKED — no hay envío real",
      flyerQueued: "Flyer en cola",
      flyerDelivered: "Flyer enviado",
      flyerFailed: "Flyer falló",
      owner: "Dueño",
      follow: "Seguimiento",
      signedIn: "Sesión de",
      empty: "Todavía no hay leads.",
      draftKept: "Borrador en este teléfono. CRM no está guardado.",
      offersHint: "La página de ofertas está lista para enviar. El flyer de correo solo si el servidor lo confirma.",
    }
  };

  var loginPanel = d.getElementById("login-panel");
  var appPanel = d.getElementById("app-panel");
  var loginForm = d.getElementById("login-form");
  var leadForm = d.getElementById("lead-form");
  var loginStatus = d.getElementById("login-status");
  var formStatus = d.getElementById("form-status");
  var result = d.getElementById("result");
  var list = d.getElementById("lead-list");
  var sessionLine = d.getElementById("session-line");
  var pendingAction = "save";
  var idempotencyKey = newKey();
  var viewer = null;

  function lang() {
    return (w.VralSite && w.VralSite.lang && w.VralSite.lang()) || "en";
  }

  function t(key) {
    return (COPY[lang()] || COPY.en)[key] || COPY.en[key] || key;
  }

  function applyCopy() {
    d.querySelectorAll("[data-copy]").forEach(function (node) {
      node.textContent = t(node.getAttribute("data-copy"));
    });
  }

  function newKey() {
    var bytes = new Uint8Array(18);
    (w.crypto || {}).getRandomValues ? crypto.getRandomValues(bytes) : bytes.forEach(function (_, i) { bytes[i] = Math.floor(Math.random() * 256); });
    return Array.from(bytes, function (b) { return ("0" + b.toString(16)).slice(-2); }).join("").slice(0, 24);
  }

  function setStatus(node, message, kind) {
    node.textContent = message || "";
    node.className = "status" + (kind ? " is-" + kind : "");
  }

  function formPayload(action) {
    return {
      name: leadForm.name.value,
      phone: leadForm.phone.value,
      email: leadForm.email.value,
      address: leadForm.address.value,
      business: leadForm.business.value,
      interest: leadForm.interest.value || "Printing",
      consent: leadForm.consent.checked,
      website: leadForm.website.value,
      idempotencyKey: idempotencyKey,
      language: lang(),
      action: action,
      source: "Field"
    };
  }

  async function protectDraft(payload) {
    try {
      if (!w.crypto || !crypto.subtle) return;
      var raw = crypto.getRandomValues(new Uint8Array(32));
      var iv = crypto.getRandomValues(new Uint8Array(12));
      var key = await crypto.subtle.importKey("raw", raw, "AES-GCM", false, ["encrypt"]);
      var cipher = await crypto.subtle.encrypt({ name: "AES-GCM", iv: iv }, key, new TextEncoder().encode(JSON.stringify(payload)));
      sessionStorage.setItem(DRAFT_KEY, JSON.stringify({
        exp: Date.now() + DRAFT_TTL,
        iv: Array.from(iv),
        key: Array.from(raw),
        data: Array.from(new Uint8Array(cipher))
      }));
    } catch (_) {}
  }

  async function readDraft() {
    try {
      var raw = sessionStorage.getItem(DRAFT_KEY);
      if (!raw || !crypto.subtle) return null;
      var bundle = JSON.parse(raw);
      if (!bundle || bundle.exp < Date.now()) {
        sessionStorage.removeItem(DRAFT_KEY);
        return null;
      }
      var key = await crypto.subtle.importKey("raw", new Uint8Array(bundle.key), "AES-GCM", false, ["decrypt"]);
      var plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv: new Uint8Array(bundle.iv) }, key, new Uint8Array(bundle.data));
      return JSON.parse(new TextDecoder().decode(plain));
    } catch (_) {
      return null;
    }
  }

  function clearDraft() {
    try { sessionStorage.removeItem(DRAFT_KEY); } catch (_) {}
  }

  async function restoreDraft() {
    var draft = await readDraft();
    if (!draft) return;
    ["name", "phone", "email", "address", "business", "interest"].forEach(function (key) {
      if (draft[key]) leadForm[key].value = draft[key];
    });
    leadForm.consent.checked = draft.consent === true;
    if (draft.idempotencyKey) idempotencyKey = draft.idempotencyKey;
  }

  function channel(delivery, name) {
    return (delivery || []).find(function (item) { return item && item.channel === name; }) || null;
  }

  function crmText(delivery) {
    var item = channel(delivery, "crm");
    if (!item) return t("crmBlocked");
    if (item.status === "DELIVERED") return t("crmSaved");
    if (item.status === "QUEUED" || item.status === "RETRYING") return t("crmQueued");
    if (item.status === "FAILED") return t("crmFailed");
    return t("crmBlocked");
  }

  function flyerText(delivery) {
    var item = channel(delivery, "flyer_email");
    if (!item) return t("flyerBlocked");
    if (item.status === "DELIVERED") return t("flyerDelivered");
    if (item.status === "QUEUED" || item.status === "RETRYING") return t("flyerQueued");
    if (item.status === "FAILED") return t("flyerFailed");
    return t("flyerBlocked");
  }

  function whatsappUrl(payload) {
    var text = "Vral Graphics field lead: " + payload.name + " / " + payload.business + " / " + payload.phone + " / " + (payload.interest || "Printing");
    if (w.VralIntake && w.VralIntake.whatsappUrl) return w.VralIntake.whatsappUrl(text);
    var digits = (w.VralRoutes && w.VralRoutes.CONTACT && w.VralRoutes.CONTACT.whatsappDigits) || "17865911017";
    return "https://wa.me/" + digits + "?text=" + encodeURIComponent(text);
  }

  function offersUrl() {
    return (w.VralRoutes && w.VralRoutes.ROUTES && w.VralRoutes.ROUTES.offers) || "/offers/";
  }

  async function api(url, options) {
    var res = await fetch(url, Object.assign({ credentials: "same-origin", headers: { "content-type": "application/json" } }, options || {}));
    var body = await res.json().catch(function () { return {}; });
    return { res: res, body: body };
  }

  function showApp(session) {
    viewer = session;
    loginPanel.hidden = true;
    appPanel.hidden = false;
    sessionLine.textContent = t("signedIn") + " " + session.name + " · " + session.role;
    restoreDraft().then(function () { loadLeads(); });
  }

  function showLogin() {
    viewer = null;
    loginPanel.hidden = false;
    appPanel.hidden = true;
  }

  async function loadSession() {
    try {
      var got = await api("/api/field/session", { method: "GET", headers: {} });
      if (got.res.ok) showApp(got.body);
      else showLogin();
    } catch (_) {
      showLogin();
    }
  }

  async function loadLeads() {
    try {
      var got = await api("/api/field/leads", { method: "GET", headers: {} });
      if (!got.res.ok) {
        list.textContent = t("empty");
        return;
      }
      var leads = got.body.leads || [];
      if (!leads.length) {
        list.textContent = t("empty");
        return;
      }
      list.innerHTML = leads.map(function (lead) {
        return '<article class="lead-card"><b>' + escapeHtml(lead.business || lead.name) + "</b><span>" + escapeHtml(lead.name) + " · " + escapeHtml(lead.phone) + "</span><span>" + escapeHtml(lead.status) + " · " + escapeHtml(lead.owner) + "</span></article>";
      }).join("");
    } catch (_) {
      list.textContent = t("empty");
    }
  }

  function escapeHtml(value) {
    return String(value == null ? "" : value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  function renderSuccess(body, action) {
    var persistence = body.persistence;
    var title = persistence === "DUPLICATE" ? t("duplicate") : t("recorded");
    result.hidden = false;
    result.innerHTML =
      "<strong>" + escapeHtml(title) + "</strong>" +
      "<p>" + t("owner") + ": " + escapeHtml(body.owner || "Mike") + "</p>" +
      "<p>" + escapeHtml(crmText(body.delivery)) + "</p>" +
      "<p>" + escapeHtml(flyerText(body.delivery)) + "</p>" +
      (body.followUpDue ? "<p>" + t("follow") + ": " + escapeHtml(body.followUpDue) + "</p>" : "") +
      (action === "save_and_send_offers" ? "<p>" + t("offersHint") + "</p>" : "");
    setStatus(formStatus, title, "ok");
  }

  loginForm.addEventListener("submit", async function (event) {
    event.preventDefault();
    setStatus(loginStatus, "", "");
    try {
      var got = await api("/api/field/login", {
        method: "POST",
        body: JSON.stringify({ username: loginForm.username.value, password: loginForm.password.value })
      });
      if (got.res.status === 503) return setStatus(loginStatus, t("blocked"), "error");
      if (!got.res.ok) return setStatus(loginStatus, t("unauthorized"), "error");
      showApp(got.body);
    } catch (_) {
      setStatus(loginStatus, t("blocked"), "error");
    }
  });

  d.getElementById("sign-out").addEventListener("click", async function () {
    await api("/api/field/logout", { method: "POST", body: "{}" });
    showLogin();
  });

  leadForm.addEventListener("submit", async function (event) {
    event.preventDefault();
    var action = pendingAction || "save";
    var payload = formPayload(action);
    await protectDraft(payload);
    result.hidden = true;
    Array.prototype.forEach.call(leadForm.querySelectorAll("button[type='submit']"), function (btn) { btn.disabled = true; });
    try {
      var got = await api("/api/field/leads", { method: "POST", body: JSON.stringify(payload) });
      if (!got.res.ok || !got.body.id) {
        setStatus(formStatus, (got.body && got.body.error) || t("notRecorded") + " " + t("draftKept"), "error");
        return;
      }
      clearDraft();
      renderSuccess(got.body, action);
      if (action === "save_and_send_offers") w.open(offersUrl(), "_blank", "noopener");
      if (action === "save_and_open_whatsapp") w.open(whatsappUrl(payload), "_blank", "noopener");
      loadLeads();
    } catch (_) {
      setStatus(formStatus, t("offline"), "error");
    } finally {
      Array.prototype.forEach.call(leadForm.querySelectorAll("button[type='submit']"), function (btn) { btn.disabled = false; });
    }
  });

  Array.prototype.forEach.call(leadForm.querySelectorAll("button[data-action]"), function (btn) {
    btn.addEventListener("click", function () { pendingAction = btn.getAttribute("data-action"); });
  });

  d.getElementById("another").addEventListener("click", function () {
    leadForm.reset();
    leadForm.interest.value = "Printing";
    idempotencyKey = newKey();
    result.hidden = true;
    result.innerHTML = "";
    setStatus(formStatus, "", "");
    clearDraft();
    leadForm.name.focus();
  });

  d.documentElement.addEventListener("vral:lang", applyCopy);
  applyCopy();
  loadSession();
})(window, document);
