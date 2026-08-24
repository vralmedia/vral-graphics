"use strict";

function cents(value, field) {
  if (typeof value === "number") value = String(value);
  if (typeof value !== "string" || !/^\d+(?:\.\d{1,2})?$/.test(value)) {
    throw new TypeError((field || "amount") + " must be a non-negative decimal with at most two places");
  }
  var parts = value.split(".");
  var result = Number(parts[0]) * 100 + Number((parts[1] || "").padEnd(2, "0"));
  if (!Number.isSafeInteger(result)) throw new RangeError((field || "amount") + " is too large");
  return result;
}

function integerCents(value, field) {
  if (!Number.isSafeInteger(value) || value < 0) throw new TypeError((field || "amount") + " must be a non-negative integer number of cents");
  return value;
}

module.exports = { cents: cents, integerCents: integerCents };
