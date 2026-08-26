(function (w) {
  "use strict";

  var CONTACT = (w.VralRoutes && w.VralRoutes.CONTACT) || {
    email: "info@vralmedia.com",
    whatsappDigits: "17865911017",
    whatsappDisplay: "+1 786 591 1017",
  };

  function whatsappUrl(text) {
    var message = encodeURIComponent(text || "Hello Vral Graphics. I need help with a print job.");
    return "https://wa.me/" + CONTACT.whatsappDigits + "?text=" + message;
  }

  function submitPrintRequest(payload) {
    return fetch("/api/print-requests", {
      method: "POST",
      headers: { "content-type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify(payload || {}),
    }).then(function (res) {
      if (res.status === 404 || res.status === 501 || res.status === 503) {
        return { ok: false, status: "BLOCKED", reason: "relay_unavailable" };
      }
      if (!res.ok) {
        return res.json().catch(function () { return {}; }).then(function (body) {
          return { ok: false, status: "ERROR", http: res.status, body: body };
        });
      }
      return res.json().then(function (body) {
        return { ok: true, status: body.persistence || "RECORDED", body: body };
      });
    }).catch(function () {
      return { ok: false, status: "BLOCKED", reason: "offline" };
    });
  }

  w.VralIntake = {
    submitPrintRequest: submitPrintRequest,
    whatsappUrl: whatsappUrl,
    contact: CONTACT,
  };
})(window);
