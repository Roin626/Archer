const assert = require("node:assert/strict");

global.window = global;
require("../src/model.js");

assert.equal(ArcherModel.gramsToPounds(453.59237), 1);
assert.equal(ArcherModel.poundsToGrams(1), 453.59237);
assert.equal(ArcherModel.inchesToMillimeters(1), 25.4);
assert.equal(ArcherModel.millimetersToInches(25.4), 1);
assert.throws(function () {
  ArcherModel.gramsToPounds("not-a-number");
}, /有效数字/);

const initial = ArcherModel.estimateBareShaftSpine({
  bowType: "olympic_recurve",
  drawWeightLb: 30,
  drawLengthIn: 28,
  shaftLengthIn: 29,
  arrowPassOffsetMm: 0
});

assert.equal(initial.centerAtaSpine, 632);
assert.equal(initial.shaftClearanceIn, 1);

const clearance = ArcherModel.calculateHandleClearanceRanges({
  bowType: "shelfless_traditional",
  drawWeightLb: 30,
  drawLengthIn: 28,
  shaftLengthIn: 29,
  gripWidthMm: 50
});

assert.equal(clearance.arrowPassOffsetMm, 25);
assert.equal(clearance.offsetSource, "grip-width-half");
assert.equal(clearance.lateralForceLb, 1.055);
assert.deepEqual(
  [clearance.materials.carbon.dynamicDeflectionMinMm, clearance.materials.carbon.dynamicDeflectionMaxMm],
  [28, 30]
);
assert.deepEqual(
  [clearance.materials.carbon.ataSpineMin, clearance.materials.carbon.ataSpineMax],
  [913, 1222]
);
assert.deepEqual(
  [clearance.materials.bamboo_wood.dynamicDeflectionMinMm, clearance.materials.bamboo_wood.dynamicDeflectionMaxMm],
  [29, 32]
);
assert.deepEqual(
  [clearance.materials.bamboo_wood.woodSpinePoundsMin, clearance.materials.bamboo_wood.woodSpinePoundsMax],
  [16.2, 23.4]
);

const centerShot = ArcherModel.analyzeDynamicSpine({
  bowType: "olympic_recurve",
  drawWeightLb: 30,
  drawLengthIn: 28,
  shaftLengthIn: 29,
  bareArrowWeightGr: 170,
  pointWeightGr: 100,
  ataSpine: 700,
  arrowMaterial: "carbon",
  shaftDiameterMm: 6,
  arrowPassOffsetMm: 0
});

assert.equal(centerShot.recommendation.hasClearanceConstraint, false);
assert.ok(centerShot.current.dynamicDeflectionMinMm > 10);
assert.ok(centerShot.current.dynamicDeflectionMaxMm > centerShot.current.dynamicDeflectionMinMm);
assert.equal(Math.round(centerShot.recommendation.finalLowerIn * 1000), 537);
assert.equal(Math.round(centerShot.recommendation.finalUpperIn * 1000), 727);
assert.equal(centerShot.overallMatch, true);

const traditionalDynamic = ArcherModel.analyzeDynamicSpine({
  bowType: "shelfless_traditional",
  drawWeightLb: 30,
  drawLengthIn: 28,
  shaftLengthIn: 29,
  bareArrowWeightGr: 190,
  pointWeightGr: 100,
  ataSpine: 700,
  arrowMaterial: "bamboo_wood",
  shaftDiameterMm: 8,
  gripWidthMm: 50
});

assert.equal(traditionalDynamic.arrowPassOffsetMm, 25);
assert.deepEqual(
  [traditionalDynamic.recommendation.requiredDynamicMinMm, traditionalDynamic.recommendation.requiredDynamicMaxMm],
  [29, 32]
);
assert.equal(Math.round(traditionalDynamic.recommendation.finalLowerIn * 1000), 639);
assert.equal(Math.round(traditionalDynamic.recommendation.finalUpperIn * 1000), 867);
assert.ok(traditionalDynamic.adjustments.targetPointWeightGr > 100);
assert.equal(traditionalDynamic.adjustments.pointClearancePass, true);
assert.equal(traditionalDynamic.clearanceStatus, "overlap");
assert.equal(traditionalDynamic.adjustments.pointClearanceStatus, "overlap");

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
  ArcherModel.analyzeDynamicSpine({
    bowType: "shelfless_traditional",
    drawWeightLb: 30,
    drawLengthIn: 28,
    shaftLengthIn: 29,
    bareArrowWeightGr: 190,
    pointWeightGr: 100,
    ataSpine: 700,
    arrowMaterial: "bamboo_wood",
    shaftDiameterMm: 8
  });
}, /测量弓把宽度/);

console.log("web model tests passed");
