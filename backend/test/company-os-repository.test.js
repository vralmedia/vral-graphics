"use strict";

var test = require("node:test");
var assert = require("node:assert/strict");
var repository = require("../lib/company-os-repository");

test("Company OS repository is fail-closed without server credentials", async function () {
  var repo = repository.createCompanyOsRepository({}, function () { throw new Error("should not call network"); });
  assert.equal(repo.configured, false);
  await assert.rejects(repo.track("this-is-a-long-enough-tracking-token-0001"), /BLOCKED/);
});

test("tracking tokens are hashed before any repository lookup", function () {
  var hash = repository.hashToken("secret-capability-token");
  assert.equal(hash.length, 64);
  assert.equal(hash.includes("secret-capability-token"), false);
});
