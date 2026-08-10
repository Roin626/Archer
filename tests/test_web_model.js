const assert = require("node:assert/strict");

global.window = global;
require("../src/model.js");

const initial = ArcherModel.estimateBareShaftSpine({
  bowType: "olympic_recurve",
  drawWeightLb: 30,
  drawLengthIn: 28,
  shaftLengthIn: 29,
  arrowPassOffsetMm: 0
});

assert.equal(initial.centerAtaSpine, 632);
assert.equal(initial.shaftClearanceIn, 1);

const adjustment = ArcherModel.recommendPointWeightAdjustment({
  drawWeightLb: 30,
  bareArrowWeightGr: 170,
  pointWeightGr: 100,
  ataSpine: initial.centerAtaSpine,
  verticalFeedback: "high",
  lateralFeedback: "weak"
});

assert.equal(adjustment.targetPointWeightGr, 125);
assert.equal(adjustment.targetAtaSpine, 732);

assert.throws(function () {
  ArcherModel.estimateBareShaftSpine({
    bowType: "shelfless_traditional",
    drawWeightLb: 30,
    drawLengthIn: 28,
    shaftLengthIn: 29
  });
}, /测量弓把宽度/);

console.log("web model tests passed");
