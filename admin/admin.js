(function (w, d) {
  "use strict";

  var COLUMNS = [
    "New", "Contacted", "Quoted", "Awaiting Artwork", "Awaiting Approval",
    "Payment Pending", "Paid", "In Production", "Ready", "Completed", "Lost"
  ];

  var COPY = {
    en: {
      kicker: "Press room board",
      title: "Leads",
      lead: "Mike sees his own tickets. Anthony sees every ticket. Paid never appears before a verified payment webhook.",
      loginTitle: "Sign in",
      username: "Username",
      password: "Password",
      signIn: "Sign in",
      signOut: "Sign out",
      blocked: "Admin login is BLOCKED until field credentials are configured. Nothing was simulated.",
      unauthorized: "That sign-in did not work.",
      paidBlocked: "Paid stays closed until a verified payment webhook.",
      empty: "Empty",
      signedIn: "Signed in as"
    },
    es: {
      kicker: "Sala de prensa",
      title: "Leads",
      lead: "Mike ve sus tickets. Anthony ve todos. Paid no aparece antes de un webhook de pago verificado.",
      loginTitle: "Entrar",
      username: "Usuario",
      password: "Contraseña",
      signIn: "Entrar",
      signOut: "Salir",
      blocked: "El admin está BLOCKED hasta configurar credenciales. Nada fue simulado.",
      unauthorized: "Ese acceso no funcionó.",
      paidBlocked: "Paid sigue cerrado hasta un webhook de pago verificado.",
      empty: "Vacío",
      signedIn: "Sesión de"
    }
  };

  var loginPanel = d.getElementById("login-panel");
  var boardPanel = d.getElementById("board-panel");
  var board = d.getElementById("board");
  var loginStatus = d.getElementById("login-status");
  var boardStatus = d.getElementById("board-status");
  var sessionLine = d.getElementById("session-line");
  var state = { viewer: null, leads: [], columns: COLUMNS };

  function lang() { return (w.VralSite && w.VralSite.lang && w.VralSite.lang()) || "en"; }
  function t(key) { return (COPY[lang()] || COPY.en)[key] || COPY.en[key]; }
  function applyCopy() {
    d.querySelectorAll("[data-copy]").forEach(function (node) { node.textContent = t(node.getAttribute("data-copy")); });
  }
  function escapeHtml(value) {
    return String(value == null ? "" : value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }
  async function api(url, options) {
    var res = await fetch(url, Object.assign({ credentials: "same-origin", headers: { "content-type": "application/json" } }, options || {}));
    var body = await res.json().catch(function () { return {}; });
    return { res: res, body: body };
  }
  function deliveryLine(lead, channel) {
    var item = (lead.delivery || []).find(function (entry) { return entry && entry.channel === channel; });
    return item ? item.status : "BLOCKED";
  }
  function neighbors(status) {
    var index = COLUMNS.indexOf(status);
    var next = [];
    if (index > 0) next.push(COLUMNS[index - 1]);
    if (index >= 0 && index < COLUMNS.length - 1) next.push(COLUMNS[index + 1]);
    if (status !== "Lost") next.push("Lost");
    return next;
  }

  function render() {
    board.innerHTML = COLUMNS.map(function (column) {
      var cards = state.leads.filter(function (lead) { return lead.status === column; });
      var body = cards.length ? cards.map(cardHtml).join("") : '<p class="empty">' + t("empty") + "</p>";
      return '<section class="column" data-status="' + escapeHtml(column) + '"><h2>' + escapeHtml(column) + " · " + cards.length + "</h2>" + body + "</section>";
    }).join("");
    board.querySelectorAll("[data-move]").forEach(function (btn) {
      btn.addEventListener("click", function () { move(btn.getAttribute("data-id"), btn.getAttribute("data-move")); });
    });
  }

  function cardHtml(lead) {
    var moves = neighbors(lead.status).map(function (status) {
      var blockedPaid = status === "Paid" && lead.paymentVerified !== true;
      return '<button type="button" data-id="' + escapeHtml(lead.id) + '" data-move="' + escapeHtml(status) + '"' + (blockedPaid ? " disabled" : "") + ">" + (blockedPaid ? t("paidBlocked") : escapeHtml(status)) + "</button>";
    }).join("");
    var audit = (lead.audit || []).map(function (item) {
      return "<div>" + escapeHtml(item.type) + ": " + escapeHtml(item.to || item.eventId || "") + " · " + escapeHtml(item.actor || "") + "</div>";
    }).join("");
    return (
      '<article class="card" data-lead-id="' + escapeHtml(lead.id) + '">' +
        "<b>" + escapeHtml(lead.business || lead.name) + "</b>" +
        "<small>" + escapeHtml(lead.name) + " · " + escapeHtml(lead.phone) + "</small>" +
        "<p>source " + escapeHtml(lead.source) + " · owner " + escapeHtml(lead.owner) + "</p>" +
        "<p>" + escapeHtml(lead.interest || lead.product || "Printing") + "</p>" +
        "<p>CRM " + escapeHtml(deliveryLine(lead, "crm")) + " · flyer " + escapeHtml(deliveryLine(lead, "flyer_email")) + "</p>" +
        "<p>payment " + (lead.paymentVerified ? "verified" : "unverified") + "</p>" +
        "<p>" + escapeHtml(lead.nextAction || "") + "</p>" +
        '<div class="moves">' + moves + "</div>" +
        (audit ? '<div class="audit">' + audit + "</div>" : "") +
      "</article>"
    );
  }

  async function move(id, status) {
    boardStatus.textContent = "";
    var got = await api("/api/admin/leads/" + encodeURIComponent(id), { method: "PATCH", body: JSON.stringify({ status: status }) });
    if (got.res.status === 409) {
      boardStatus.className = "status is-error";
      boardStatus.textContent = t("paidBlocked");
      return;
    }
    if (!got.res.ok) {
      boardStatus.className = "status is-error";
      boardStatus.textContent = got.body.error || t("paidBlocked");
      return;
    }
    await loadBoard();
  }

  function showBoard(session) {
    state.viewer = session;
    loginPanel.hidden = true;
    boardPanel.hidden = false;
    sessionLine.textContent = t("signedIn") + " " + session.name + " · " + session.role;
    loadBoard();
  }

  async function loadBoard() {
    var got = await api("/api/admin/leads", { method: "GET", headers: {} });
    if (!got.res.ok) return;
    state.leads = got.body.leads || [];
    state.columns = got.body.columns || COLUMNS;
    render();
  }

  d.getElementById("login-form").addEventListener("submit", async function (event) {
    event.preventDefault();
    var form = event.currentTarget;
    var got = await api("/api/field/login", { method: "POST", body: JSON.stringify({ username: form.username.value, password: form.password.value }) });
    if (got.res.status === 503) {
      loginStatus.className = "status is-error";
      loginStatus.textContent = t("blocked");
      return;
    }
    if (!got.res.ok) {
      loginStatus.className = "status is-error";
      loginStatus.textContent = t("unauthorized");
      return;
    }
    showBoard(got.body);
  });

  d.getElementById("sign-out").addEventListener("click", async function () {
    await api("/api/field/logout", { method: "POST", body: "{}" });
    loginPanel.hidden = false;
    boardPanel.hidden = true;
  });

  applyCopy();
  d.documentElement.addEventListener("vral:lang", function () { applyCopy(); render(); });
  api("/api/field/session", { method: "GET", headers: {} }).then(function (got) {
    if (got.res.ok) showBoard(got.body);
  });
})(window, document);
