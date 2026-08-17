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

const windcutCatalog = ArcherModel.getFrontComponentOptions("windcut_point");
assert.equal(windcutCatalog.options.length, 6);
assert.equal(windcutCatalog.options[3].weightGr, 200);
assert.ok(Math.abs(windcutCatalog.options[3].insertedLengthMm - 19) < 1e-9);

const frontComponentBase = {
  bowType: "olympic_recurve",
  drawWeightLb: 30,
  drawLengthIn: 28,
  shaftLengthIn: 33,
  bareArrowWeightGr: 320,
  pointWeightGr: 200,
  ataSpine: 700,
  arrowMaterial: "carbon",
  carbonConstruction: "plain",
  shaftDiameterMm: 7.1,
  shaftInnerDiameterMm: 6.2,
  arrowPassOffsetMm: 0
};
const manualFrontComponent = ArcherModel.analyzeDynamicSpine(frontComponentBase);
const windcutPoint = ArcherModel.analyzeDynamicSpine(Object.assign({}, frontComponentBase, {
  frontComponentType: "windcut_point",
  frontComponentWeightGr: 200
}));
assert.equal(windcutPoint.frontComponent.compatibility.compatible, true);
assert.deepEqual(windcutPoint.frontComponent.compatibility.allowedAtaSpines, [800, 700, 600]);
assert.ok(Math.abs(windcutPoint.frontComponent.insertedLengthMm - 19) < 1e-9);
assert.equal(windcutPoint.frontComponent.exposedLengthMm, 41.2);
assert.equal(windcutPoint.frontComponent.totalLengthMm, 60.2);
assert.ok(Math.abs(windcutPoint.frontComponent.assembledArrowLengthMm - 879.4) < 1e-9);
assert.equal(
  windcutPoint.current.dynamicDeflectionMinMm,
  manualFrontComponent.current.dynamicDeflectionMinMm
);

const incompatible3kWindcut = ArcherModel.analyzeDynamicSpine(Object.assign({}, frontComponentBase, {
  carbonConstruction: "3k",
  ataSpine: 600,
  frontComponentType: "windcut_point",
  frontComponentWeightGr: 200
}));
assert.equal(incompatible3kWindcut.frontComponent.compatibility.compatible, false);
assert.deepEqual(incompatible3kWindcut.frontComponent.compatibility.allowedAtaSpines, [800, 700]);

const compatible74Windcut = ArcherModel.analyzeDynamicSpine(Object.assign({}, frontComponentBase, {
  carbonConstruction: "3k",
  shaftDiameterMm: 7.4,
  ataSpine: 600,
  frontComponentType: "windcut_point",
  frontComponentWeightGr: 200
}));
assert.equal(compatible74Windcut.frontComponent.compatibility.compatible, true);
assert.deepEqual(compatible74Windcut.frontComponent.compatibility.allowedAtaSpines, [600, 500, 400, 300]);

const pointSeat = ArcherModel.analyzeDynamicSpine(Object.assign({}, frontComponentBase, {
  pointWeightGr: 300,
  frontComponentType: "point_seat",
  frontComponentWeightGr: 300
}));
assert.equal(pointSeat.frontComponent.insertedLengthMm, 101.1);
assert.equal(pointSeat.frontComponent.exposedLengthMm, null);
assert.equal(pointSeat.frontComponent.assembledArrowLengthMm, null);

const internalPoint = ArcherModel.analyzeDynamicSpine(Object.assign({}, frontComponentBase, {
  pointWeightGr: 350,
  frontComponentType: "internal_point",
  frontComponentWeightGr: 300
}));
assert.ok(Math.abs(internalPoint.frontComponent.insertedLengthMm - 61.4) < 1e-9);
assert.equal(internalPoint.frontComponent.exposedLengthMm, 27.1);
assert.equal(internalPoint.frontComponent.nominalWeightMatches, false);
assert.equal(internalPoint.frontComponent.weightDifferenceGr, 50);
assert.equal(internalPoint.current.finishedArrowWeightGr, 670);

assert.throws(function () {
  ArcherModel.analyzeDynamicSpine(Object.assign({}, frontComponentBase, {
    frontComponentType: "point_seat+internal_point",
    frontComponentWeightGr: 300
  }));
}, /不支持的前端组件类型/);

const americanHighPoundInput = {
  bowType: "american_hunting",
  drawWeightLb: 58,
  drawLengthIn: 28,
  shaftLengthIn: 30,
  bareArrowWeightGr: 320,
  pointWeightGr: 100,
  ataSpine: 340,
  arrowMaterial: "carbon",
  shaftDiameterMm: 7.1,
  shaftInnerDiameterMm: 6.2
};
assert.throws(function () {
  ArcherModel.analyzeDynamicSpine(americanHighPoundInput);
}, /美猎请填写实测出箭点距中心线/);

const americanHighPound = ArcherModel.analyzeDynamicSpine(Object.assign(
  { arrowPassOffsetMm: 0 },
  americanHighPoundInput
));
assert.equal(americanHighPound.arrowPassOffsetMm, 0);
assert.equal(americanHighPound.offsetSource, "manual");
assert.equal(americanHighPound.recommendation.vendorChartReference.ataSpine, 340);
assert.equal(americanHighPound.recommendation.vendorChartReference.source, "victory-recurve-2024");
assert.equal(americanHighPound.recommendation.vendorChartReference.chartLengthIn, 30);
assert.deepEqual(
  americanHighPound.recommendation.eastonGpiReferences.filter(function (reference) {
    return reference.ataSpine === 340;
  }),
  [
    { product: "Sonic 6.0", ataSpine: 340, gpi: 7.8, stockLengthIn: 31.5, source: "easton-official" },
    { product: "Carbon Legacy", ataSpine: 340, gpi: 10.1, stockLengthIn: 34, source: "easton-official" }
  ]
);

assert.deepEqual(
  [
    { drawWeightLb: 58, shaftLengthIn: 30 },
    { drawWeightLb: 62, shaftLengthIn: 32 },
    { drawWeightLb: 78, shaftLengthIn: 32 }
  ].map(function (condition) {
    return ArcherModel.analyzeDynamicSpine(Object.assign({}, americanHighPoundInput, condition, {
      arrowPassOffsetMm: 0
    })).recommendation.vendorChartReference.ataSpine;
  }),
  [340, 300, 250]
);

const overlengthVendorReference = ArcherModel.analyzeDynamicSpine(Object.assign(
  {},
  americanHighPoundInput,
  { shaftLengthIn: 33, arrowPassOffsetMm: 0 }
)).recommendation.vendorChartReference;
assert.equal(overlengthVendorReference.ataSpine, 340);
assert.equal(overlengthVendorReference.chartLengthIn, 32);
assert.equal(overlengthVendorReference.lengthExceedsChart, true);

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
