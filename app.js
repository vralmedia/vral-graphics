/* Vral Graphics Press — boots extras. Does not edit Foil's HTML or CSS files. */
(function (w, d) {
  "use strict";

  var FILES = ["i18n.js", "extras/data.js", "extras/press.js"];
  var STYLE_ID = "vg-press-runtime";

  function injectStyle() {
    if (d.getElementById(STYLE_ID)) return;
    var css = [
      ".vg-root{color:#111111;background:#FFFFFF;font-family:\"Schibsted Grotesk\",ui-sans-serif,system-ui,sans-serif;max-width:52rem}",
      ".vg-root *{box-sizing:border-box}",
      ".vg-k{margin:0 0 .35rem;font-size:.68rem;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#444444}",
      ".vg-h{margin:0 0 .5rem;font-size:clamp(1.2rem,2.4vw,1.6rem);letter-spacing:-.03em;line-height:1.15;color:#111111}",
      ".vg-lead,.vg-hint{margin:0 0 1rem;color:#444444;font-size:.92rem;line-height:1.45}",
      ".vg-honest{margin:0 0 1rem;padding:.7rem .85rem;border:1px solid #d0d0d0;background:#FFFFFF;color:#111111;font-size:.88rem}",
      ".vg-row{display:grid;grid-template-columns:1fr 1fr;gap:.75rem;margin:0 0 .75rem}",
      ".vg-field{display:flex;flex-direction:column;gap:.35rem;margin:0 0 .75rem;font-size:.78rem;letter-spacing:.04em;text-transform:uppercase;color:#444444}",
      ".vg-input{width:100%;padding:.7rem .75rem;border:1px solid #c8c8c8;background:#FFFFFF;color:#111111;font:inherit;text-transform:none;letter-spacing:0}",
      ".vg-input:focus{outline:2px solid #111111;outline-offset:1px}",
      ".vg-finishes{margin:0 0 1rem;padding:.75rem;border:1px solid #d0d0d0;background:#FFFFFF}",
      ".vg-finishes legend{padding:0 .3rem;color:#444444}",
      ".vg-checks,.vg-finishes{display:grid;grid-template-columns:1fr 1fr;gap:.4rem .75rem}",
      ".vg-check{display:flex;gap:.5rem;align-items:flex-start;color:#111111;font-size:.9rem;text-transform:none;letter-spacing:0}",
      ".vg-actions{display:flex;flex-wrap:wrap;gap:.5rem;margin:1rem 0}",
      ".vg-btn{appearance:none;border:1px solid #111111;background:#FFFFFF;color:#111111;padding:.65rem .9rem;font:inherit;letter-spacing:.02em;cursor:pointer}",
      ".vg-btn.primary{background:#111111;border:1px solid #111111;color:#FFFFFF}",
      ".vg-btn.ghost{background:#FFFFFF}",
      ".vg-btn.on{background:#111111;color:#FFFFFF}",
      ".vg-note{min-height:1.2em;margin:.4rem 0 0;font-size:.88rem;color:#444444}",
      ".vg-note.ok,.vg-ok{color:#111111;border-color:#111111}",
      ".vg-ok,.vg-fail{margin:.4rem 0;padding:.65rem .75rem;border:1px solid #d0d0d0;background:#FFFFFF}",
      ".vg-fail{border-color:#111111}",
      ".vg-brief{white-space:pre-wrap;background:#FFFFFF;border:1px solid #d0d0d0;padding:.85rem;color:#111111;font-size:.82rem;line-height:1.45;overflow:auto}",
      ".vg-cards{display:grid;grid-template-columns:1fr 1fr;gap:.75rem;margin:0 0 1rem}",
      ".vg-card{padding:.85rem;border:1px solid #d0d0d0;background:#FFFFFF}",
      ".vg-steps{margin:0;padding:0;list-style:none;display:grid;gap:.4rem}",
      ".vg-steps li{display:flex;justify-content:space-between;gap:.75rem;align-items:center;border:1px solid #d0d0d0;padding:.45rem .6rem;background:#FFFFFF}",
      ".vg-steps li.on{border-color:#111111}",
      ".vg-step-btn{background:none;border:0;color:#111111;font:inherit;text-align:left;cursor:pointer}",
      ".vg-order{margin:0 0 1rem;padding:0;list-style:none;display:grid;gap:.4rem}",
      ".vg-order-item{display:grid;grid-template-columns:2rem 1fr auto;gap:.6rem;align-items:center;border:1px solid #d0d0d0;padding:.45rem .55rem;background:#FFFFFF}",
      ".vg-order-item.dragging{opacity:.5}",
      ".vg-handle{color:#444444;font-size:.8rem}",
      ".vg-order-btns{display:flex;gap:.3rem}",
      ".vg-lang{display:flex;align-items:center;gap:.5rem}",
      ".vg-file-status{margin:0 0 1rem}",
      "#vg-ai-canvas{width:100%;max-width:700px;height:auto;border:1px solid #d0d0d0;background:#FFFFFF}",
      "#press-status{display:none!important}",
      ".vg-session-on .board{display:none}",
      "form#brief[hidden],form[data-brief][hidden]{display:none!important}",
      ".vg-session{max-width:36rem;padding:0 0 5.5rem;background:#FFFFFF;color:#111111}",
      ".vg-progress{margin:0 0 .75rem;color:#444444;font-size:.9rem}",
      ".vg-session-q{margin:0 0 1.25rem;font-size:clamp(1.6rem,4vw,2.15rem);font-weight:600;letter-spacing:-.03em;line-height:1.15;color:#111111}",
      ".vg-choices{display:flex;flex-direction:column;gap:.5rem;margin:0 0 1.25rem}",
      ".vg-choice{appearance:none;width:100%;text-align:left;padding:1rem 1.1rem;border:1px solid #111111;background:#FFFFFF;color:#111111;font:inherit;cursor:pointer}",
      ".vg-choice.on{background:#111111;color:#FFFFFF}",
      ".vg-finishes-inline{margin:0 0 1rem}",
      ".vg-session .vg-actions{position:sticky;bottom:0;z-index:2;padding:12px 0 calc(12px + env(safe-area-inset-bottom,0px));background:#FFFFFF;margin:1.25rem 0 0}",
      ".vg-session .vg-btn.primary{min-width:12rem}",
      "@media (max-width:720px){.vg-row,.vg-cards,.vg-checks,.vg-finishes{grid-template-columns:1fr}.vg-session .vg-btn.primary{width:100%}}"
    ].join("");
    var style = d.createElement("style");
    style.id = STYLE_ID;
    style.textContent = css;
    (d.head || d.documentElement).appendChild(style);
  }

  function loadScript(src) {
    return new Promise(function (resolve, reject) {
      var found = d.querySelector('script[src="' + src + '"]');
      if (found && found.getAttribute("data-vg-loaded") === "1") {
        resolve();
        return;
      }
      var s = d.createElement("script");
      s.src = src;
      s.async = false;
      s.onload = function () {
        s.setAttribute("data-vg-loaded", "1");
        resolve();
      };
      s.onerror = function () {
        reject(new Error(src));
      };
      (d.head || d.documentElement).appendChild(s);
    });
  }

  function declareBootFail(err) {
    var host = d.getElementById("brief-ai") || d.getElementById("vg-session-host");
    if (!host) return;
    var p = d.createElement("p");
    p.className = "vg-fail";
    p.textContent = "The brief session did not load: " + (err && err.message ? err.message : "unknown error") + ". WhatsApp +1 786 591 1017 still works from the page links.";
    host.appendChild(p);
  }

  function start() {
    injectStyle();
    var chain = Promise.resolve();
    if (!w.VG_I18N) chain = chain.then(function () { return loadScript(FILES[0]); });
    if (!w.VG_DATA) chain = chain.then(function () { return loadScript(FILES[1]); });
    if (!w.VralPress || !w.VralPress.boot) chain = chain.then(function () { return loadScript(FILES[2]); });
    chain
      .then(function () {
        if (!w.VralPress || !w.VralPress.boot) throw new Error("VralPress missing after extras/press.js");
        if (w.VralPress.failed) throw new Error(w.VralPress.reason || "extras failed");
        w.VralPress.boot();
      })
      .catch(declareBootFail);
  }

  if (d.readyState === "loading") d.addEventListener("DOMContentLoaded", start);
  else start();
})(window, document);
