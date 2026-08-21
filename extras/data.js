/* Vral Graphics — product data. No prices. No invented clients. */
(function (w) {
  "use strict";

  w.VG_DATA = {
    waDigits: "17865911017",
    waDisplay: "+1 786 591 1017",
    email: "info@vralmedia.com",
    markSrc: "vral-v.png",
    storeKey: "vral-graphics-press-v1",

    pieces: [
      { id: "business-card", spoken: true, sizes: ["3.5 × 2 in", "2 × 3.5 in"] },
      { id: "postcard", spoken: true, sizes: ["4 × 6 in", "5 × 7 in", "6 × 9 in"] },
      { id: "eddm-postcard", spoken: false, sizes: ["6.5 × 9 in", "6.5 × 11 in", "8.5 × 11 in", "9 × 12 in", "11 × 14 in", "12 × 15 in"] },
      { id: "poster", spoken: true, sizes: ["11 × 17 in", "18 × 24 in", "24 × 36 in"] },
      { id: "box", spoken: true, sizes: ["custom"] },
      { id: "flyer", spoken: false, sizes: ["8.5 × 11 in", "5.5 × 8.5 in"] },
      { id: "brochure", spoken: false, sizes: ["8.5 × 11 in tri-fold", "11 × 17 in fold"] },
      { id: "sticker", spoken: false, sizes: ["2 in circle", "3 in circle", "4 × 3 in die-cut"] },
      { id: "banner", spoken: false, sizes: ["24 × 36 in", "33 × 80 in"] },
      { id: "window-vinyl", spoken: false, sizes: ["custom"] },
      { id: "letterhead", spoken: false, sizes: ["8.5 × 11 in"] },
      { id: "folder", spoken: false, sizes: ["9 × 12 in"] },
      { id: "menu", spoken: false, sizes: ["8.5 × 11 in", "8.5 × 14 in"] },
      { id: "table-tent", spoken: false, sizes: ["4 × 6 in folded"] },
      { id: "yard-sign", spoken: false, sizes: ["18 × 24 in"] },
      { id: "door-hanger", spoken: false, sizes: ["4.25 × 11 in"] }
    ],

    papers: [
      { id: "14pt-c2s", use: "card" },
      { id: "16pt-c2s", use: "card" },
      { id: "16pt-c1s", use: "card" },
      { id: "18pt-c2s", use: "card" },
      { id: "100lb-gloss-cover", use: "cover" },
      { id: "100lb-gloss-text", use: "text" },
      { id: "80lb-gloss-text", use: "text" },
      { id: "70lb-uncoated-text", use: "text" },
      { id: "80lb-uncoated-cover", use: "cover" },
      { id: "100lb-uncoated-cover", use: "cover" },
      { id: "16pt-soft-touch", use: "card" },
      { id: "linen", use: "cover" },
      { id: "recycled-100", use: "cover" },
      { id: "synthetic", use: "card" },
      { id: "sbs-18", use: "box" },
      { id: "sbs-24", use: "box" },
      { id: "e-flute", use: "box" }
    ],

    finishes: [
      "gloss-aq",
      "matte-aq",
      "soft-touch",
      "spot-uv",
      "foil-gold",
      "foil-silver",
      "foil-rose",
      "emboss",
      "deboss",
      "die-cut",
      "round-corners",
      "perf"
    ],

    sides: ["1", "2"],
    corners: ["square", "round"],

    checklist: [
      { id: "pdf", auto: "ext" },
      { id: "cmyk", auto: "none" },
      { id: "bleed", auto: "none" },
      { id: "safe", auto: "none" },
      { id: "fonts", auto: "none" },
      { id: "ppi", auto: "image" },
      { id: "spot", auto: "none" },
      { id: "black", auto: "none" },
      { id: "dieline-layer", auto: "none" }
    ],

    sampleItems: [
      "16pt-gloss",
      "16pt-matte",
      "soft-touch",
      "foil-chip",
      "eddm-6x9",
      "uncoated-letter",
      "box-board",
      "spot-uv"
    ],

    sectors: {
      dental: {
        pieces: ["business-card", "postcard", "eddm-postcard", "poster", "window-vinyl", "door-hanger"],
        paper: "16pt-c2s",
        finishes: ["matte-aq", "spot-uv"]
      },
      medspa: {
        pieces: ["business-card", "folder", "postcard", "box", "poster", "eddm-postcard"],
        paper: "16pt-soft-touch",
        finishes: ["soft-touch", "foil-gold"]
      },
      realtor: {
        pieces: ["postcard", "eddm-postcard", "yard-sign", "flyer", "business-card", "door-hanger"],
        paper: "100lb-gloss-cover",
        finishes: ["gloss-aq"]
      },
      restaurant: {
        pieces: ["menu", "table-tent", "window-vinyl", "business-card", "postcard", "sticker"],
        paper: "18pt-c2s",
        finishes: ["matte-aq", "spot-uv"]
      }
    },

    timeline: [
      "brief",
      "file-check",
      "proof",
      "approval",
      "press",
      "finish",
      "pack",
      "deliver"
    ],

    speeds: ["standard", "rush"],

    eddmSizes: ["6.5 × 9 in", "6.5 × 11 in", "8.5 × 11 in", "9 × 12 in", "11 × 14 in", "12 × 15 in"],
    eddmMail: ["residential", "business", "both"],

    /* Real Miami-Dade ZIPs. Not mailbox counts. Not live USPS routes. */
    eddmZones: [
      {
        id: "brickell-downtown",
        zips: ["33128", "33129", "33130", "33131", "33132", "33136"]
      },
      {
        id: "miami-beach",
        zips: ["33109", "33139", "33140", "33141", "33154"]
      },
      {
        id: "gables-grove",
        zips: ["33133", "33134", "33143", "33146", "33149", "33156"]
      },
      {
        id: "wynwood-midtown",
        zips: ["33127", "33137", "33138", "33142", "33150"]
      },
      {
        id: "little-havana-flagler",
        zips: ["33125", "33126", "33135", "33144", "33145", "33174"]
      },
      {
        id: "doral",
        zips: ["33122", "33166", "33172", "33178", "33182"]
      },
      {
        id: "kendall-west",
        zips: ["33155", "33165", "33173", "33175", "33176", "33183", "33185", "33186", "33193", "33196"]
      },
      {
        id: "hialeah",
        zips: ["33010", "33012", "33013", "33014", "33015", "33016", "33018"]
      },
      {
        id: "north-aventura",
        zips: ["33160", "33161", "33162", "33168", "33169", "33179", "33180", "33181"]
      },
      {
        id: "south-dade",
        zips: ["33030", "33032", "33033", "33035", "33157", "33170", "33177", "33189", "33190"]
      }
    ],

    aiSteps: [
      "piece",
      "who",
      "place",
      "logo",
      "contact",
      "idea",
      "spec",
      "layout",
      "review"
    ],

    places: ["desk", "street", "mail", "all"]
  };
})(window);
