const assert = require("node:assert/strict");

global.window = global;
require("../src/model.js");

assert.equal(ArcherModel.grainsToGrams(1), 0.06479891);
assert.equal(ArcherModel.gramsToGrains(0.06479891), 1);
assert.equal(ArcherModel.kilogramsToPounds(0.45359237), 1);
assert.equal(ArcherModel.poundsToKilograms(1), 0.45359237);
assert.equal(ArcherModel.inchesToMillimeters(1), 25.4);
assert.equal(ArcherModel.millimetersToInches(25.4), 1);
assert.ok(Math.abs(ArcherModel.ataSpineToMillimeters(700) - 17.78) < 1e-9);
assert.equal(Math.round(ArcherModel.millimetersToAtaSpine(17.78)), 700);
assert.throws(function () {
  ArcherModel.grainsToGrams("not-a-number");
}, /有效数字/);

const carbonSection = ArcherModel.calculateShaftSection({
  arrowMaterial: "carbon",
  outerDiameterMm: 6,
  innerDiameterMm: 4.2,
  ataSpine: 700
});
assert.equal(carbonSection.sectionType, "hollow");
assert.ok(Math.abs(carbonSection.secondMomentMm4 - Math.PI / 64 * (6 ** 4 - 4.2 ** 4)) < 1e-9);
assert.equal(Number(carbonSection.wallThicknessMm.toFixed(2)), 0.9);
assert.ok(carbonSection.effectiveBendingModulusGpa > 70);

const bambooSection = ArcherModel.calculateShaftSection({
  arrowMaterial: "bamboo",
  outerDiameterMm: 8,
  innerDiameterMm: 4,
  ataSpine: 700
});
assert.equal(bambooSection.sectionType, "hollow");
assert.ok(Math.abs(bambooSection.secondMomentMm4 - Math.PI / 64 * (8 ** 4 - 4 ** 4)) < 1e-9);

const woodSection = ArcherModel.calculateShaftSection({
  arrowMaterial: "wood",
  outerDiameterMm: 8,
  innerDiameterMm: 7,
  ataSpine: 700
});
assert.equal(woodSection.sectionType, "solid");
assert.equal(woodSection.innerDiameterMm, 0);
assert.ok(Math.abs(woodSection.secondMomentMm4 - Math.PI / 64 * 8 ** 4) < 1e-9);

assert.throws(function () {
  ArcherModel.calculateShaftSection({
    arrowMaterial: "carbon",
    outerDiameterMm: 6,
    innerDiameterMm: 6,
    ataSpine: 700
  });
}, /内径必须小于外径/);

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
  [clearance.materials.bamboo.dynamicDeflectionMinMm, clearance.materials.bamboo.dynamicDeflectionMaxMm],
  [29, 32]
);
assert.deepEqual(
  [clearance.materials.wood.woodSpinePoundsMin, clearance.materials.wood.woodSpinePoundsMax],
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
  shaftInnerDiameterMm: 4.2,
  arrowPassOffsetMm: 0
});

assert.equal(centerShot.recommendation.hasClearanceConstraint, false);
assert.ok(centerShot.current.dynamicDeflectionMinMm > 10);
assert.ok(centerShot.current.dynamicDeflectionMaxMm > centerShot.current.dynamicDeflectionMinMm);
assert.equal(Math.round(centerShot.recommendation.finalLowerIn * 1000), 537);
assert.equal(Math.round(centerShot.recommendation.finalUpperIn * 1000), 727);
assert.deepEqual(centerShot.recommendation.productAtaCandidates, [550, 600, 650, 700]);
assert.equal(centerShot.overallMatch, true);

const sameSpineThickerWall = ArcherModel.analyzeDynamicSpine({
  bowType: "olympic_recurve",
  drawWeightLb: 30,
  drawLengthIn: 28,
  shaftLengthIn: 29,
  bareArrowWeightGr: 170,
  pointWeightGr: 100,
  ataSpine: 700,
  arrowMaterial: "carbon",
  shaftDiameterMm: 6,
  shaftInnerDiameterMm: 3.8,
  arrowPassOffsetMm: 0
});
assert.equal(sameSpineThickerWall.current.dynamicDeflectionMinMm, centerShot.current.dynamicDeflectionMinMm);
assert.notEqual(sameSpineThickerWall.section.secondMomentMm4, centerShot.section.secondMomentMm4);
assert.notEqual(sameSpineThickerWall.section.effectiveBendingModulusGpa, centerShot.section.effectiveBendingModulusGpa);

const traditionalDynamic = ArcherModel.analyzeDynamicSpine({
  bowType: "shelfless_traditional",
  drawWeightLb: 30,
  drawLengthIn: 28,
  shaftLengthIn: 29,
  bareArrowWeightGr: 190,
  pointWeightGr: 100,
  ataSpine: 700,
  arrowMaterial: "bamboo",
  shaftDiameterMm: 8,
  shaftInnerDiameterMm: 4,
  gripWidthMm: 50
});

assert.equal(traditionalDynamic.arrowPassOffsetMm, 25);
assert.deepEqual(
  [traditionalDynamic.recommendation.requiredDynamicMinMm, traditionalDynamic.recommendation.requiredDynamicMaxMm],
  [29, undefined]
);
assert.equal(Math.round(traditionalDynamic.recommendation.finalLowerIn * 1000), 578);
assert.equal(Math.round(traditionalDynamic.recommendation.finalUpperIn * 1000), 867);
assert.equal(traditionalDynamic.recommendation.clearanceLowerIn, undefined);
assert.deepEqual(traditionalDynamic.recommendation.productAtaCandidates, [600, 650, 700, 750, 800]);
assert.ok(traditionalDynamic.adjustments.targetPointWeightGr > 100);
assert.equal(traditionalDynamic.adjustments.pointClearancePass, true);
assert.equal(traditionalDynamic.clearanceStatus, "uncertain");
assert.equal(traditionalDynamic.clearanceMatch, false);
assert.equal(traditionalDynamic.adjustments.pointClearanceStatus, "satisfied");
assert.equal(traditionalDynamic.adjustments.lengthClearanceStatus, "satisfied");
assert.equal(traditionalDynamic.section.sectionType, "hollow");
assert.equal(traditionalDynamic.adjustments.targetSource, "equipment-screening");
assert.ok(Math.abs(
  traditionalDynamic.recommendation.recommendedDynamicCenterMm
    - (traditionalDynamic.recommendation.recommendedDynamicMinMm
      + traditionalDynamic.recommendation.recommendedDynamicMaxMm) / 2
) < 1e-9);
assert.equal(
  traditionalDynamic.recommendation.calibrationTargetMm,
  traditionalDynamic.recommendation.recommendedDynamicCenterMm
);
assert.equal(traditionalDynamic.dynamicMatchStatus, "balanced");
assert.equal(traditionalDynamic.dynamicMatch, true);
assert.equal(traditionalDynamic.recommendation.calibrationTargetSource, "range-mean");
assert.equal(
  traditionalDynamic.adjustments.targetDynamicMm,
  traditionalDynamic.recommendation.calibrationTargetMm
);
assert.equal(traditionalDynamic.recommendation.calibrationConflict, false);
assert.equal(
  traditionalDynamic.adjustments.targetDynamicMinMm,
  traditionalDynamic.recommendation.recommendedDynamicMinMm
);
assert.equal(
  traditionalDynamic.adjustments.targetDynamicMaxMm,
  traditionalDynamic.recommendation.recommendedDynamicMaxMm
);
assert.ok(
  traditionalDynamic.adjustments.pointDynamicMaxMm >= traditionalDynamic.adjustments.targetDynamicMinMm
    && traditionalDynamic.adjustments.pointDynamicMinMm <= traditionalDynamic.adjustments.targetDynamicMaxMm
);
assert.ok(
  traditionalDynamic.adjustments.lengthDynamicMaxMm >= traditionalDynamic.adjustments.targetDynamicMinMm
    && traditionalDynamic.adjustments.lengthDynamicMinMm <= traditionalDynamic.adjustments.targetDynamicMaxMm
);
assert.ok(Math.abs(
  traditionalDynamic.adjustments.pointDynamicMinMm
    - traditionalDynamic.recommendation.calibrationTargetMm
) < 1e-6);
assert.ok(Math.abs(
  traditionalDynamic.adjustments.lengthDynamicMinMm
    - traditionalDynamic.recommendation.calibrationTargetMm
) < 1e-6);
assert.ok(Math.abs(traditionalDynamic.adjustments.targetPointWeightGr - 208.2983503211845) < 1e-9);
assert.ok(Math.abs(traditionalDynamic.adjustments.targetShaftLengthIn - 31.0121002768936) < 1e-9);

function assessTraditionalDynamicStatus(ataSpine) {
  return ArcherModel.analyzeDynamicSpine({
    bowType: "shelfless_traditional",
    drawWeightLb: 30,
    drawLengthIn: 28,
    shaftLengthIn: 29,
    bareArrowWeightGr: 190,
    pointWeightGr: 100,
    ataSpine: ataSpine,
    arrowMaterial: "bamboo",
    shaftDiameterMm: 8,
    shaftInnerDiameterMm: 4,
    gripWidthMm: 50
  });
}

assert.deepEqual(
  [300, 500, 700, 1000, 1500].map(function (ataSpine) {
    return assessTraditionalDynamicStatus(ataSpine).dynamicMatchStatus;
  }),
  ["too-stiff", "stiff-side", "balanced", "soft-side", "too-soft"]
);
assert.deepEqual(
  [300, 500, 700, 1000, 1500].map(function (ataSpine) {
    return assessTraditionalDynamicStatus(ataSpine).dynamicMatch;
  }),
  [false, false, true, false, false]
);

const heavierPointSameScreening = ArcherModel.analyzeDynamicSpine({
  bowType: "shelfless_traditional",
  drawWeightLb: 30,
  drawLengthIn: 28,
  shaftLengthIn: 29,
  bareArrowWeightGr: 190,
  pointWeightGr: 150,
  ataSpine: 700,
  arrowMaterial: "bamboo",
  shaftDiameterMm: 8,
  shaftInnerDiameterMm: 4,
  gripWidthMm: 50
});
assert.equal(
  heavierPointSameScreening.recommendation.empiricalLowerIn,
  traditionalDynamic.recommendation.empiricalLowerIn
);
assert.equal(
  heavierPointSameScreening.recommendation.recommendedDynamicMinMm,
  traditionalDynamic.recommendation.recommendedDynamicMinMm
);

const conflictingClearance = ArcherModel.analyzeDynamicSpine({
  bowType: "shelfless_traditional",
  drawWeightLb: 30,
  drawLengthIn: 28,
  shaftLengthIn: 29,
  bareArrowWeightGr: 190,
  pointWeightGr: 100,
  ataSpine: 700,
  arrowMaterial: "bamboo",
  shaftDiameterMm: 8,
  shaftInnerDiameterMm: 4,
  gripWidthMm: 120
});
assert.equal(conflictingClearance.recommendation.calibrationConflict, true);
assert.equal(conflictingClearance.recommendation.calibrationTargetSource, "clearance-floor");
assert.equal(conflictingClearance.adjustments.targetDynamicMm, null);
assert.equal(conflictingClearance.adjustments.targetPointWeightGr, null);
assert.equal(conflictingClearance.adjustments.targetShaftLengthIn, null);

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
    arrowMaterial: "wood",
    shaftDiameterMm: 8
  });
}, /测量弓把宽度/);

console.log("web model tests passed");
