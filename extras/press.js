/* Vral Graphics — 4-step brief. White. Honest empties. No lab dump. */
(function (w, d) {
  "use strict";

  var DATA = w.VG_DATA;
  var I18N = w.VG_I18N;
  if (!DATA || !I18N) {
    w.VralPress = { failed: true, reason: "i18n.js or extras/data.js did not load" };
    return;
  }

  var HOOKS = [
    "lang",
    "paper-spec",
    "checklist",
    "kits",
    "sample-kit",
    "eddm",
    "timeline",
    "brief-ai",
    "reorder",
    "press-status",
    "mockup",
    "dieline"
  ];

  var MAIN_PIECES = ["business-card", "postcard", "eddm-postcard", "poster", "box"];
  var STEP_FINISHES = ["matte-aq", "gloss-aq", "soft-touch", "foil-gold", "spot-uv"];
  var PIECE_MAP = {
    cards: "business-card",
    postcards: "postcard",
    box: "box",
    poster: "poster",
    eddm: "eddm-postcard"
  };

  var state = {
    lang: "en",
    storageOk: true,
    mounts: {},
    missing: [],
    step: 0,
    showMore: false,
    showDetails: false,
    logo: { name: "", dataUrl: "", standIn: true },
    file: { name: "", type: "", size: 0, kind: "", w: 0, h: 0, note: "" },
    layout: { ok: false, failed: false, dataUrl: "" }
  };

  function t(key, vars) {
    var pack = I18N.strings[state.lang] || I18N.strings.en;
    var alt = String(key || "").replace(/-/g, "_");
    var s = pack[key] || pack[alt] || I18N.strings.en[key] || I18N.strings.en[alt] || key;
    if (vars) {
      Object.keys(vars).forEach(function (k) {
        s = s.replace(new RegExp("\\{" + k + "\\}", "g"), String(vars[k]));
      });
    }
    return s;
  }

  function $(id) {
    return d.getElementById(id);
  }

  function el(tag, attrs, kids) {
    var n = d.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (k) {
        if (k === "class") n.className = attrs[k];
        else if (k === "text") n.textContent = attrs[k];
        else if (k.indexOf("on") === 0 && typeof attrs[k] === "function") n.addEventListener(k.slice(2), attrs[k]);
        else if (attrs[k] === true) n.setAttribute(k, "");
        else if (attrs[k] !== false && attrs[k] != null) n.setAttribute(k, attrs[k]);
      });
    }
    (kids || []).forEach(function (c) {
      if (c) n.appendChild(typeof c === "string" ? d.createTextNode(c) : c);
    });
    return n;
  }

  function clear(node) {
    while (node.firstChild) node.removeChild(node.firstChild);
  }

  function loadStore() {
    try {
      var raw = w.localStorage.getItem(DATA.storeKey);
      if (!raw) return {};
      var parsed = JSON.parse(raw);
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch (e) {
      state.storageOk = false;
      return { _fail: true };
    }
  }

  function saveStore(patch) {
    var cur = loadStore();
    Object.keys(patch).forEach(function (k) {
      cur[k] = patch[k];
    });
    delete cur._fail;
    try {
      w.localStorage.setItem(DATA.storeKey, JSON.stringify(cur));
      state.storageOk = true;
      return true;
    } catch (e) {
      state.storageOk = false;
      return false;
    }
  }

  function store() {
    return loadStore();
  }

  function spec() {
    return store().spec || {};
  }

  function patchSpec(next) {
    var cur = spec();
    Object.keys(next).forEach(function (k) {
      cur[k] = next[k];
    });
    saveStore({ spec: cur });
    return cur;
  }

  function pieceById(id) {
    for (var i = 0; i < DATA.pieces.length; i++) {
      if (DATA.pieces[i].id === id) return DATA.pieces[i];
    }
    return DATA.pieces[0];
  }

  function sizesFor(id) {
    return pieceById(id).sizes;
  }

  function labelPiece(id) {
    return t("piece_" + id);
  }

  function defaultOrder() {
    return DATA.pieces.map(function (p) {
      return p.id;
    });
  }

  function pieceOrder() {
    var saved = store().order;
    var base = defaultOrder();
    if (!saved || !saved.length) return base.slice();
    var next = [];
    saved.forEach(function (id) {
      if (base.indexOf(id) !== -1 && next.indexOf(id) === -1) next.push(id);
    });
    base.forEach(function (id) {
      if (next.indexOf(id) === -1) next.push(id);
    });
    return next;
  }

  function bytes(n) {
    if (!n) return "0 B";
    if (n < 1024) return n + " B";
    if (n < 1048576) return (n / 1024).toFixed(1) + " KB";
    return (n / 1048576).toFixed(1) + " MB";
  }

  function buildBrief() {
    var s = store();
    var job = s.spec || {};
    var lines = [];
    lines.push(t("brief_header"));
    lines.push("WhatsApp " + DATA.waDisplay);
    lines.push("Email " + DATA.email);
    lines.push("");
    lines.push((job.name || t("brief_none")) + " · " + (job.company || t("brief_none")));
    lines.push((job.phone || t("brief_none")) + " · " + (job.email || t("brief_none")));
    lines.push("");
    lines.push(labelPiece(job.piece || "business-card") + " · " + (job.size || t("brief_none")));
    lines.push(t("paper_" + (job.paper || "16pt-c2s")));
    lines.push(
      job.finishes && job.finishes.length
        ? job.finishes.map(function (id) { return t("finish_" + id); }).join(", ")
        : t("brief_none")
    );
    if (job.qty) lines.push(t("field_qty") + ": " + job.qty + " — " + t("qty_hint"));
    if (job.piece === "box" && (job.boxL || job.boxW || job.boxH)) {
      lines.push((job.boxL || "?") + " × " + (job.boxW || "?") + " × " + (job.boxH || "?") + " in");
    }
    if (job.notes) lines.push(job.notes);
    if (s.sector) lines.push(t("field_sector") + ": " + t("sector_" + s.sector));
    if (s.speed) lines.push(t("field_speed") + ": " + t("speed_" + s.speed));
    lines.push("");
    if (state.file.name) lines.push(t("brief_file_yes", { name: state.file.name, size: bytes(state.file.size) }));
    else lines.push(t("brief_file_no"));
    if (state.logo.name) lines.push(t("brief_logo_yes", { name: state.logo.name }));
    else lines.push(t("brief_logo_no"));
    var zips = s.eddmZips || [];
    if (zips.length || job.piece === "eddm-postcard") {
      lines.push("");
      lines.push(t("brief_eddm"));
      lines.push(zips.length ? zips.join(", ") : t("session_eddm_none"));
      if (s.eddmSize) lines.push(s.eddmSize);
      lines.push(t("session_eddm_honest"));
    }
    if (s.sampleAsk) {
      lines.push("");
      lines.push(t("session_sample"));
      lines.push(t("honest_no_ship"));
    }
    if (s.order && s.order.length) {
      lines.push("");
      lines.push(s.order.slice(0, 6).map(function (id, i) { return i + 1 + ". " + labelPiece(id); }).join("\n"));
    }
    if (state.layout.failed) lines.push(t("brief_layout_fail"));
    else if (state.layout.ok) lines.push(t("brief_layout_yes"));
    lines.push(t("honest_no_price"));
    return lines.join("\n");
  }

  function waUrl(text) {
    var body = text == null || text === "" ? buildBrief() : String(text);
    return "https://wa.me/" + DATA.waDigits + "?text=" + encodeURIComponent(body);
  }

  function openWa(needContact) {
    var job = spec();
    var host = sessionHost();
    if (needContact && !job.name && !job.company) {
      setNote(host, t("session_need_reach"));
      return false;
    }
    try {
      var url = waUrl(buildBrief());
      if (!url || url.length > 20000) {
        setNote(host, t("honest_whatsapp_fail"));
        return false;
      }
      w.open(url, "_blank", "noopener");
      return true;
    } catch (e) {
      setNote(host, t("honest_whatsapp_fail"));
      return false;
    }
  }

  function setNote(root, msg) {
    if (!root) return;
    var note = root.querySelector("[data-vg-note]");
    if (note) note.textContent = msg || "";
  }

  function quiet(root) {
    if (!root) return;
    clear(root);
    root.appendChild(el("span", { hidden: true, "data-vg-quiet": true }));
  }

  function sessionHost() {
    return $("brief-ai") || $("vg-session-host") || null;
  }

  function ensureHost() {
    var host = sessionHost();
    if (host) return host;
    var bay = $("brief");
    if (bay && bay.tagName && bay.tagName.toLowerCase() !== "form") {
      host = el("div", { id: "vg-session-host" });
      bay.appendChild(host);
      return host;
    }
    return null;
  }

  function applyKit(id) {
    var kit = DATA.sectors[id];
    if (!kit) {
      saveStore({ sector: "" });
      return;
    }
    var job = spec();
    if (!job.piece) job.piece = kit.pieces[0];
    job.paper = kit.paper;
    job.finishes = kit.finishes.slice();
    job.size = sizesFor(job.piece)[0];
    saveStore({
      spec: job,
      kit: id,
      sector: id,
      order: kit.pieces.concat(
        pieceOrder().filter(function (p) {
          return kit.pieces.indexOf(p) === -1;
        })
      )
    });
  }

  function val(root, name) {
    var n = root.querySelector("[name='" + name + "']");
    return n ? String(n.value || "").trim() : "";
  }

  function harvest(root) {
    if (!root) return;
    var job = spec();
    ["name", "company", "phone", "email", "notes", "qty", "size", "paper", "boxL", "boxW", "boxH"].forEach(function (k) {
      var v = val(root, k);
      if (v || root.querySelector("[name='" + k + "']")) job[k] = v;
    });
    var finishes = [];
    root.querySelectorAll("[name='finish']:checked").forEach(function (n) {
      finishes.push(n.value);
    });
    if (root.querySelector("[name='finish']")) job.finishes = finishes;
    var pieceSel = root.querySelector("[name='morePiece']");
    if (pieceSel && pieceSel.value) {
      job.piece = pieceSel.value;
      job.size = sizesFor(job.piece)[0];
    }
    saveStore({ spec: job });
    var zone = root.querySelector("[name='eddmZone']");
    if (zone) {
      var found = DATA.eddmZones.filter(function (z) { return z.id === zone.value; })[0];
      saveStore({
        eddmZips: found ? found.zips.slice() : [],
        eddmSize: job.piece === "eddm-postcard" ? sizesFor("eddm-postcard")[0] : store().eddmSize || "",
        eddmMail: "residential"
      });
    }
    var sample = root.querySelector("[name='sampleAsk']");
    if (sample) saveStore({ sampleAsk: sample.checked, sample: sample.checked ? DATA.sampleItems.slice() : [] });
    var rush = root.querySelector("[name='rush']");
    if (rush) saveStore({ speed: rush.checked ? "rush" : "standard" });
  }

  function go(n) {
    var host = sessionHost();
    harvest(host);
    state.step = Math.max(0, Math.min(3, n));
    saveStore({ sessionStep: state.step });
    renderSession();
  }

  function choice(id, label, on, click) {
    return el("button", {
      type: "button",
      class: "vg-choice" + (on ? " on" : ""),
      text: label,
      onclick: click
    });
  }

  function field(name, type, value, extra) {
    var a = { class: "vg-input", name: name, id: "vg-" + name, type: type || "text", value: value || "" };
    if (extra) Object.keys(extra).forEach(function (k) { a[k] = extra[k]; });
    return el("label", { class: "vg-field", for: "vg-" + name }, [
      el("span", { text: t("field_" + name) }),
      el("input", a)
    ]);
  }

  function selectField(name, labelKey, options, value) {
    var s = el("select", { class: "vg-input", name: name, id: "vg-" + name });
    options.forEach(function (opt) {
      var o = el("option", { value: opt.id, text: opt.label });
      if (opt.id === value) o.selected = true;
      s.appendChild(o);
    });
    return el("label", { class: "vg-field" }, [el("span", { text: t(labelKey) }), s]);
  }

  function actions(root, opts) {
    var bar = el("div", { class: "vg-actions" });
    if (state.step > 0) {
      bar.appendChild(
        el("button", {
          type: "button",
          class: "vg-btn ghost",
          text: t("back"),
          onclick: function () { go(state.step - 1); }
        })
      );
    }
    bar.appendChild(
      el("button", {
        type: "button",
        class: "vg-btn primary",
        text: opts.primary,
        onclick: opts.onPrimary
      })
    );
    root.appendChild(bar);
  }

  function renderSession() {
    var root = ensureHost();
    if (!root) {
      state.mounts.session = false;
      return;
    }
    d.body.classList.add("vg-session-on");
    var leftover = d.querySelector("form#brief, form[data-brief]");
    if (leftover && leftover.id !== "brief-ai") leftover.setAttribute("hidden", "");
    clear(root);
    root.setAttribute("data-vg-session", "1");
    var job = spec();
    var s = store();
    var box = el("div", { class: "vg-root vg-session" });
    box.appendChild(el("p", { class: "vg-progress", text: t("session_progress", { n: state.step + 1 }) }));
    box.appendChild(el("h2", { class: "vg-session-q", text: t("session_q" + (state.step + 1)) }));

    if (state.step === 0) renderPiece(box, job);
    else if (state.step === 1) renderWho(box, job, s);
    else if (state.step === 2) renderMake(box, job, s);
    else renderReach(box, job, s);

    box.appendChild(el("p", { class: "vg-note", "data-vg-note": true, text: state.storageOk ? "" : t("status_storage_fail") }));
    root.appendChild(box);
    state.mounts.session = true;
    state.mounts.ai = true;
  }

  function renderPiece(box, job) {
    var list = el("div", { class: "vg-choices" });
    MAIN_PIECES.forEach(function (id) {
      list.appendChild(
        choice(id, labelPiece(id), job.piece === id, function () {
          var size = sizesFor(id)[0];
          patchSpec({ piece: id, size: size === "custom" ? "" : size });
          if (id === "eddm-postcard") saveStore({ eddmSize: size });
          go(1);
        })
      );
    });
    list.appendChild(
      choice("more", t("session_more"), state.showMore, function () {
        state.showMore = !state.showMore;
        renderSession();
      })
    );
    box.appendChild(list);
    if (state.showMore) {
      var rest = DATA.pieces.filter(function (p) { return MAIN_PIECES.indexOf(p.id) === -1; });
      box.appendChild(
        selectField(
          "morePiece",
          "field_piece",
          rest.map(function (p) { return { id: p.id, label: labelPiece(p.id) }; }),
          job.piece && MAIN_PIECES.indexOf(job.piece) === -1 ? job.piece : rest[0].id
        )
      );
      actions(box, {
        primary: t("session_continue"),
        onPrimary: function () {
          harvest(sessionHost());
          var next = spec();
          if (!next.piece) {
            setNote(sessionHost(), t("session_need_piece"));
            return;
          }
          next.size = sizesFor(next.piece)[0];
          saveStore({ spec: next });
          go(1);
        }
      });
    }
  }

  function renderWho(box, job, s) {
    box.appendChild(field("company", "text", job.company || "", { autocomplete: "organization" }));
    box.appendChild(field("name", "text", job.name || "", { autocomplete: "name" }));
    box.appendChild(el("p", { class: "vg-hint", text: t("session_trade") }));
    var trades = el("div", { class: "vg-choices" });
    trades.appendChild(
      choice("", t("session_trade_none"), !s.sector, function () {
        harvest(sessionHost());
        saveStore({ sector: "", kit: "" });
        go(2);
      })
    );
    Object.keys(DATA.sectors).forEach(function (id) {
      trades.appendChild(
        choice(id, t("sector_" + id), s.sector === id, function () {
          harvest(sessionHost());
          applyKit(id);
          go(2);
        })
      );
    });
    box.appendChild(trades);
    actions(box, {
      primary: t("session_continue"),
      onPrimary: function () {
        harvest(sessionHost());
        var next = spec();
        if (!next.company && !next.name) {
          setNote(sessionHost(), t("session_need_who"));
          return;
        }
        go(2);
      }
    });
  }

  function renderMake(box, job, s) {
    var piece = job.piece || "business-card";
    var sizes = sizesFor(piece).filter(function (sz) { return sz !== "custom"; });
    if (sizes.length) {
      box.appendChild(
        selectField(
          "size",
          "field_size",
          sizes.map(function (sz) { return { id: sz, label: sz }; }),
          job.size || sizes[0]
        )
      );
    }
    box.appendChild(
      selectField(
        "paper",
        "field_paper",
        DATA.papers.map(function (p) { return { id: p.id, label: t("paper_" + p.id) }; }),
        job.paper || "16pt-c2s"
      )
    );
    var fin = el("div", { class: "vg-finishes-inline" });
    fin.appendChild(el("p", { class: "vg-k", text: t("field_finish") }));
    STEP_FINISHES.forEach(function (id) {
      fin.appendChild(
        el("label", { class: "vg-check" }, [
          el("input", { type: "checkbox", name: "finish", value: id, checked: (job.finishes || []).indexOf(id) !== -1 }),
          el("span", { text: t("finish_" + id) })
        ])
      );
    });
    box.appendChild(fin);

    if (piece === "box") {
      box.appendChild(field("boxL", "text", job.boxL || "", { inputmode: "decimal" }));
      box.appendChild(field("boxW", "text", job.boxW || "", { inputmode: "decimal" }));
      box.appendChild(field("boxH", "text", job.boxH || "", { inputmode: "decimal" }));
      box.querySelector("[for='vg-boxL'] span").textContent = t("field_box_l");
      box.querySelector("[for='vg-boxW'] span").textContent = t("field_box_w");
      box.querySelector("[for='vg-boxH'] span").textContent = t("field_box_h");
    }

    if (piece === "eddm-postcard" || piece === "postcard") {
      var zones = [{ id: "", label: t("session_eddm_none") }].concat(
        DATA.eddmZones.map(function (z) { return { id: z.id, label: t("zone_" + z.id) }; })
      );
      var current = "";
      DATA.eddmZones.forEach(function (z) {
        if ((s.eddmZips || []).join() === z.zips.join()) current = z.id;
      });
      box.appendChild(selectField("eddmZone", "session_eddm", zones, current));
      box.appendChild(el("p", { class: "vg-hint", text: t("session_eddm_honest") }));
    }

    box.appendChild(el("p", { class: "vg-k", text: t("session_file") }));
    var file = el("input", { class: "vg-input", type: "file", name: "artwork", id: "vg-session-file", accept: ".pdf,.ai,.psd,.tif,.tiff,.jpg,.jpeg,.png,.svg,application/pdf,image/*" });
    box.appendChild(file);
    var fileNote = el("p", { class: "vg-hint", id: "vg-session-file-note", text: state.file.name ? t("brief_file_yes", { name: state.file.name, size: bytes(state.file.size) }) : t("honest_empty_file") });
    box.appendChild(fileNote);
    file.addEventListener("change", function () {
      readArtwork(file.files && file.files[0], fileNote);
    });

    box.appendChild(
      el("label", { class: "vg-check" }, [
        el("input", { type: "checkbox", name: "sampleAsk", checked: !!s.sampleAsk }),
        el("span", { text: t("session_sample") })
      ])
    );
    box.appendChild(
      el("label", { class: "vg-check" }, [
        el("input", { type: "checkbox", name: "rush", checked: s.speed === "rush" }),
        el("span", { text: t("session_rush") })
      ])
    );
    box.appendChild(el("p", { class: "vg-hint", text: t("session_time") }));
    box.appendChild(el("p", { class: "vg-hint", text: t("honest_no_price") }));

    if (state.showDetails) {
      var canvas = el("canvas", { id: "vg-ai-canvas", width: "700", height: "400" });
      var msg = el("p", { class: "vg-note", id: "vg-ai-layout-msg" });
      box.appendChild(canvas);
      box.appendChild(msg);
      box.appendChild(
        el("button", {
          type: "button",
          class: "vg-btn ghost",
          text: t("session_layout"),
          onclick: function () { drawLayout(canvas, msg); }
        })
      );
      box.appendChild(el("p", { class: "vg-hint", text: t("session_layout_honest") }));
    } else {
      box.appendChild(
        el("button", {
          type: "button",
          class: "vg-btn ghost",
          text: t("session_details"),
          onclick: function () {
            harvest(sessionHost());
            state.showDetails = true;
            renderSession();
          }
        })
      );
    }

    actions(box, {
      primary: t("session_continue"),
      onPrimary: function () {
        harvest(sessionHost());
        go(3);
      }
    });
  }

  function renderReach(box, job) {
    box.appendChild(field("name", "text", job.name || "", { autocomplete: "name" }));
    box.appendChild(field("company", "text", job.company || "", { autocomplete: "organization" }));
    box.appendChild(field("phone", "tel", job.phone || "", { autocomplete: "tel" }));
    box.appendChild(field("email", "email", job.email || "", { autocomplete: "email" }));
    box.appendChild(
      el("label", { class: "vg-field" }, [
        el("span", { text: t("field_notes") }),
        el("textarea", { class: "vg-input", name: "notes", id: "vg-notes", rows: "3", text: job.notes || "" })
      ])
    );
    box.appendChild(el("p", { class: "vg-hint", text: t("honest_no_price") }));
    box.appendChild(el("pre", { class: "vg-brief", text: buildBrief() }));
    actions(box, {
      primary: t("session_send"),
      onPrimary: function () {
        harvest(sessionHost());
        openWa(true);
      }
    });
  }

  function readArtwork(file, note) {
    if (!file) {
      state.file = { name: "", type: "", size: 0, kind: "", w: 0, h: 0, note: t("honest_empty_file") };
      if (note) note.textContent = t("honest_empty_file");
      return;
    }
    var ext = (file.name.split(".").pop() || "").toLowerCase();
    var kind = /^(png|jpe?g|svg|tif|tiff|webp|gif)$/.test(ext) ? "image" : ext === "pdf" ? "pdf" : "other";
    state.file = { name: file.name, type: file.type || ext, size: file.size, kind: kind, w: 0, h: 0, note: "" };
    if (kind === "pdf") state.file.note = t("check_pdf_blind");
    else if (kind !== "image") state.file.note = t("check_not_pdf");
    if (note) note.textContent = t("brief_file_yes", { name: file.name, size: bytes(file.size) }) + (state.file.note ? " " + state.file.note : "");
    if (kind !== "image") return;
    var url = URL.createObjectURL(file);
    var img = new Image();
    img.onload = function () {
      state.file.w = img.naturalWidth;
      state.file.h = img.naturalHeight;
      URL.revokeObjectURL(url);
    };
    img.onerror = function () {
      state.file.note = t("check_image_fail");
      if (note) note.textContent = t("check_image_fail");
      URL.revokeObjectURL(url);
    };
    img.src = url;
  }

  function drawLayout(canvas, msg) {
    try {
      if (!canvas || !canvas.getContext) throw new Error("no canvas");
      var ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("no ctx");
      var wdt = canvas.width;
      var hgt = canvas.height;
      ctx.fillStyle = "#FFFFFF";
      ctx.fillRect(0, 0, wdt, hgt);
      ctx.strokeStyle = "#111111";
      ctx.strokeRect(0.5, 0.5, wdt - 1, hgt - 1);
      ctx.fillStyle = "#111111";
      ctx.font = "600 28px Schibsted Grotesk, ui-sans-serif, system-ui, sans-serif";
      var job = spec();
      ctx.fillText(job.company || job.name || "Your company", 36, 80);
      ctx.fillStyle = "#444444";
      ctx.font = "16px Schibsted Grotesk, ui-sans-serif, system-ui, sans-serif";
      ctx.fillText(labelPiece(job.piece || "business-card") + " · " + (job.size || ""), 36, 112);
      ctx.fillText("Vral Graphics — on-device layout, not a proof", 36, hgt - 28);
      function finish() {
        try {
          state.layout = { ok: true, failed: false, dataUrl: canvas.toDataURL("image/png") };
        } catch (err) {
          state.layout = { ok: true, failed: false, dataUrl: "" };
        }
        if (msg) msg.textContent = t("session_layout_honest") + (state.logo.standIn ? " " + t("ai_layout_nologo") : "");
      }
      if (state.logo.dataUrl) {
        var logo = new Image();
        logo.onload = function () {
          var max = 120;
          var r = Math.min(max / logo.width, max / logo.height, 1);
          ctx.drawImage(logo, wdt - 36 - logo.width * r, 36, logo.width * r, logo.height * r);
          finish();
        };
        logo.onerror = function () {
          if (msg) msg.textContent = t("check_image_fail");
          finish();
        };
        logo.src = state.logo.dataUrl;
        return;
      }
      finish();
    } catch (e) {
      state.layout = { ok: false, failed: true, dataUrl: "" };
      if (msg) msg.textContent = t("honest_layout_fail");
    }
  }

  function mountLang(root) {
    clear(root);
    root.appendChild(
      el("div", { class: "vg-lang" }, [
        el("button", { type: "button", class: "vg-btn" + (state.lang === "en" ? " on" : " ghost"), text: t("lang_en"), onclick: function () { setLang("en"); } }),
        el("button", { type: "button", class: "vg-btn" + (state.lang === "es" ? " on" : " ghost"), text: t("lang_es"), onclick: function () { setLang("es"); } })
      ])
    );
    state.mounts.lang = true;
  }

  function mountMockup(root) {
    var img = $("mockup-logo") || root.querySelector("#mockup-logo");
    var file = $("mockup-upload") || root.querySelector("#mockup-upload");
    var status = $("mockup-status") || root.querySelector("#mockup-status");
    if (!img || !file || !status) {
      state.mounts.mockup = true;
      return;
    }
    if (!state.logo.dataUrl) {
      img.removeAttribute("src");
      img.alt = "";
      img.hidden = true;
      status.textContent = t("honest_no_logo");
    }
    if (file.getAttribute("data-vg-bound") === "1") {
      state.mounts.mockup = true;
      return;
    }
    file.setAttribute("data-vg-bound", "1");
    file.addEventListener("change", function () {
      var f = file.files && file.files[0];
      if (!f) {
        img.removeAttribute("src");
        img.hidden = true;
        status.textContent = t("honest_no_logo");
        state.logo = { name: "", dataUrl: "", standIn: true };
        return;
      }
      var reader = new FileReader();
      reader.onload = function () {
        state.logo = { name: f.name, dataUrl: String(reader.result || ""), standIn: false };
        img.hidden = false;
        img.src = state.logo.dataUrl;
        img.alt = f.name;
        status.textContent = t("mock_has", { name: f.name });
      };
      reader.onerror = function () {
        img.removeAttribute("src");
        img.hidden = true;
        status.textContent = t("check_image_fail");
        state.logo = { name: "", dataUrl: "", standIn: true };
      };
      reader.readAsDataURL(f);
    });
    state.mounts.mockup = true;
  }

  function bindPageForm() {
    var form = d.querySelector("form#brief, form[data-brief]");
    if (!form || form.tagName.toLowerCase() !== "form" || form.getAttribute("data-vg-bound")) return;
    form.setAttribute("data-vg-bound", "1");
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      function grab(name) {
        var n = form.querySelector("[name='" + name + "']");
        return n ? String(n.value || "").trim() : "";
      }
      var job = spec();
      job.name = grab("name") || job.name;
      job.company = grab("company") || job.company;
      job.phone = grab("phone") || job.phone;
      job.email = grab("email") || job.email;
      job.notes = grab("message") || job.notes;
      var piece = grab("piece");
      if (piece && PIECE_MAP[piece]) job.piece = PIECE_MAP[piece];
      else if (piece && piece !== "other") job.piece = piece;
      saveStore({ spec: job });
      if (!job.name && !job.company) return;
      openWa(true);
    });
    state.mounts.form = true;
  }

  function setLang(lang) {
    state.lang = lang === "es" ? "es" : "en";
    saveStore({ lang: state.lang });
    d.documentElement.lang = state.lang;
    d.querySelectorAll("[data-i18n]").forEach(function (node) {
      node.textContent = t(node.getAttribute("data-i18n"));
    });
    if ($("lang")) mountLang($("lang"));
    renderSession();
    if ($("mockup")) mountMockup($("mockup"));
  }

  function scanMissing() {
    state.missing = HOOKS.filter(function (id) { return !$(id); });
  }

  function boot() {
    var saved = loadStore();
    if (saved.lang === "es" || saved.lang === "en") state.lang = saved.lang;
    if (typeof saved.sessionStep === "number") state.step = Math.max(0, Math.min(3, saved.sessionStep));
    else state.step = 0;
    state.file.note = t("honest_empty_file");
    d.documentElement.lang = state.lang;
    var bay = $("brief");
    if (bay && bay.tagName.toLowerCase() !== "form") bay.removeAttribute("hidden");
    scanMissing();
    if ($("lang")) mountLang($("lang"));
    if ($("press-status")) quiet($("press-status"));
    ["paper-spec", "reorder", "checklist", "kits", "sample-kit", "eddm", "timeline", "dieline"].forEach(function (id) {
      if ($(id)) quiet($(id));
    });
    if ($("dieline-controls")) quiet($("dieline-controls"));
    renderSession();
    if ($("mockup")) mountMockup($("mockup"));
    bindPageForm();
    if (d.body) {
      var timer = 0;
      new MutationObserver(function () {
        w.clearTimeout(timer);
        timer = w.setTimeout(function () {
          scanMissing();
          if ($("lang") && !state.mounts.lang) mountLang($("lang"));
          if ($("mockup") && !state.mounts.mockup) mountMockup($("mockup"));
          var host = sessionHost();
          if (host && !host.getAttribute("data-vg-session")) renderSession();
          bindPageForm();
          ["paper-spec", "reorder", "checklist", "kits", "sample-kit", "eddm", "timeline", "press-status"].forEach(function (id) {
            var n = $(id);
            if (n && !n.querySelector("[data-vg-quiet]") && id !== "brief-ai") quiet(n);
          });
        }, 80);
      }).observe(d.body, { childList: true, subtree: true });
    }
  }

  w.VralPress = {
    t: t,
    boot: boot,
    brief: buildBrief,
    waUrl: waUrl,
    store: store,
    hooks: HOOKS,
    status: function () {
      return {
        lang: state.lang,
        storageOk: state.storageOk,
        step: state.step,
        mounts: Object.assign({}, state.mounts),
        missing: state.missing.slice(),
        logo: { standIn: state.logo.standIn, name: state.logo.name },
        file: { name: state.file.name, note: state.file.note },
        layout: { ok: state.layout.ok, failed: state.layout.failed }
      };
    }
  };
})(window, document);
