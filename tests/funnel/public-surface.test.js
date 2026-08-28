"use strict";

var assert = require("node:assert/strict");
var fs = require("node:fs");
var path = require("node:path");
var test = require("node:test");

var root = path.resolve(__dirname, "../..");

function read(rel) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

test("public homepage does not expose operations or a competing CTA", function () {
  var html = read("index.html");
  var js = read("app.js");
  var surface = html + "\n" + js;
  assert.equal(html.includes("Start a print job"), false, "Start a print job must leave the homepage");
  assert.equal(/Field Mode/i.test(html), false, "Field Mode must leave the homepage");
  assert.equal(surface.includes("QuickBooks setup required"), false, "QuickBooks setup must not appear publicly");
  assert.equal(surface.includes("17864617465"), false, "Mike personal number must not appear publicly");
  assert.equal(surface.includes("(786) 461-7465"), false, "Mike personal number must not appear publicly");
  assert.match(html, /What are we making\?/);
  ["cards", "flyers", "menus", "banners", "windows", "signs"].forEach(function (name) {
    assert.match(html, new RegExp("assets/products/" + name + "\\.webp"));
  });
  assert.match(surface, /All options|offers\/index\.html/);
});

test("shared routes keep field private and quote productized", function () {
  var routes = read("shared/routes.js");
  assert.match(routes, /quoteUrl/);
  assert.match(routes, /\/field\//);
  assert.match(routes, /business-cards/);
  assert.equal(routes.includes("17864617465"), false);
});

test("desktop header is brand-only while mobile keeps the menu", function () {
  var nav = read("shared/site-nav.js");
  var css = read("shared/page.css");
  assert.equal(nav.includes("header-actions"), false);
  assert.match(nav, /menu-toggle/);
  assert.match(css, /\.site-nav\{display:none\}/);
  assert.match(css, /@media\(max-width:860px\)[\s\S]*\.site-nav\{position:fixed/);
});
