(function () {
  "use strict";

  var SLOTS = ["window", "banner", "aframe"];
  var slotIndex = 0;

  function t(key, vars) {
    return window.VG_I18N ? window.VG_I18N.t(key, vars) : key;
  }

  function applyCopy() {
    if (window.VG_I18N) window.VG_I18N.apply(document);
    document.title = "Vral Graphics — Quality Printing for Less.";
    paintStreet();
  }

  function bindLang() {
    document.documentElement.addEventListener("vral:lang", applyCopy);
    document.querySelectorAll("[data-lang]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        setTimeout(applyCopy, 0);
      });
    });
  }

  function bindReggie() {
    var need = document.getElementById("need");
    if (!need || !window.VralReggie) return;

    document.addEventListener("pointermove", function (event) {
      if (window.VralReggie.reducedMotion) return;
      window.VralReggie.lookAt(event.clientX, event.clientY);
    });

    need.querySelectorAll("[data-product]").forEach(function (item) {
      function select() {
        window.VralReggie.setProduct(item.getAttribute("data-product"));
      }
      function clear() {
        window.VralReggie.setState("idle", "");
      }
      item.addEventListener("pointerenter", select);
      item.addEventListener("focus", select);
      item.addEventListener("pointerleave", clear);
      item.addEventListener("blur", clear);
    });

    document.querySelectorAll("[data-how]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var state = btn.getAttribute("data-how");
        document.querySelectorAll("[data-how]").forEach(function (other) {
          other.setAttribute("aria-pressed", other === btn ? "true" : "false");
        });
        window.VralReggie.setState(state, state === "product_selected" ? "business-cards" : "");
      });
    });
  }

  function paintStreet() {
    var slots = document.querySelectorAll("[data-street-slot]");
    var current = SLOTS[slotIndex];
    slots.forEach(function (slot) {
      var on = slot.getAttribute("data-street-slot") === current;
      slot.classList.toggle("is-active", on);
    });
    var status = document.getElementById("street-status");
    var labelKey = current === "window" ? "slotWindow" : current === "banner" ? "slotBanner" : "slotAframe";
    if (status) status.textContent = t("streetStatus", { piece: t(labelKey) });
    var world = document.querySelector("[data-street-world]");
    if (world) world.setAttribute("data-active", current);
  }

  function bindStreet() {
    var stage = document.getElementById("street-stage");
    var source = document.querySelector("[data-street-source]");
    if (!stage) return;

    function go(delta) {
      slotIndex = (slotIndex + delta + SLOTS.length) % SLOTS.length;
      paintStreet();
      if (window.VralReggie) window.VralReggie.setState("approved", "");
    }

    document.querySelector("[data-street-prev]").addEventListener("click", function () { go(-1); });
    document.querySelector("[data-street-next]").addEventListener("click", function () { go(1); });

    stage.addEventListener("keydown", function (event) {
      if (event.key === "ArrowRight" || event.key === "ArrowDown") {
        event.preventDefault();
        go(1);
      } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
        event.preventDefault();
        go(-1);
      }
    });

    document.querySelectorAll("[data-street-slot]").forEach(function (slot) {
      slot.addEventListener("click", function () {
        slotIndex = SLOTS.indexOf(slot.getAttribute("data-street-slot"));
        if (slotIndex < 0) slotIndex = 0;
        paintStreet();
        if (window.VralReggie) window.VralReggie.setState("approved", "");
      });
    });

    if (source) {
      source.addEventListener("dragstart", function (event) {
        source.setAttribute("aria-grabbed", "true");
        if (event.dataTransfer) {
          event.dataTransfer.setData("text/plain", "artwork");
          event.dataTransfer.effectAllowed = "move";
        }
        if (window.VralReggie) window.VralReggie.setState("thinking", "");
      });
      source.addEventListener("dragend", function () {
        source.setAttribute("aria-grabbed", "false");
      });
    }

    document.querySelectorAll("[data-street-slot]").forEach(function (slot) {
      slot.addEventListener("dragover", function (event) {
        event.preventDefault();
        slot.classList.add("is-drop");
      });
      slot.addEventListener("dragleave", function () {
        slot.classList.remove("is-drop");
      });
      slot.addEventListener("drop", function (event) {
        event.preventDefault();
        slot.classList.remove("is-drop");
        slotIndex = SLOTS.indexOf(slot.getAttribute("data-street-slot"));
        if (slotIndex < 0) slotIndex = 0;
        paintStreet();
        if (window.VralReggie) window.VralReggie.setState("paid", "");
      });
    });
  }

  applyCopy();
  bindLang();
  bindReggie();
  bindStreet();
})();
