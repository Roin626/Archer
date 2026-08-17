const assert = require("node:assert/strict");
const ClearanceCycleModel = require("../experiments/clearance-cycle/model.js");

const baseInput = {
  drawWeightLb: 30,
  drawLengthIn: 28,
  braceHeightMm: 180,
  shaftLengthIn: 32,
  arrowSpeedMps: 45,
  ataSpine: 600,
  bareArrowWeightGr: 320,
  pointWeightGr: 200,
  shaftDiameterMm: 7.1,
  arrowPassOffsetMm: 10
};

const result = ClearanceCycleModel.simulateClearanceCycle(baseInput);

assert.equal(result.modelId, "clearance-cycle-experimental-v1");
assert.equal(result.status, "experimental-unvalidated");
assert.equal(result.classification, null);
assert.equal(result.samples.length, 401);
assert.ok(Math.abs(result.timeline.powerStrokeMm - 531.2) < 1e-9);
assert.ok(Math.abs(result.timeline.poweredDurationMs - 23.60888888888889) < 1e-9);
assert.ok(Math.abs(result.timeline.coastToRiserDurationMs - 4) < 1e-9);
assert.ok(Math.abs(result.timeline.nockClearDurationMs - 27.60888888888889) < 1e-9);
assert.equal(result.clearance.geometricThresholdMm, 13.55);
assert.ok(result.vibration.frequencyHz > 0);
assert.ok(result.vibration.cyclesBeforeNockClear > 0);
assert.ok(result.clearance.peakOutwardProxyMm > 0);
assert.ok(result.excitation.releaseForceN > 0);
assert.ok(result.excitation.geometricForceN > 0);
assert.ok(result.excitation.impliedMeanAxialForceToDrawWeightRatio > 0);
assert.equal(result.samples[0].shaftStationFromNockMm, 711.1999999999999);
assert.ok(Math.abs(result.samples.at(-1).shaftStationFromNockMm) < 1e-9);

const softer = ClearanceCycleModel.simulateClearanceCycle(Object.assign({}, baseInput, {
  ataSpine: 800
}));
const heavier = ClearanceCycleModel.simulateClearanceCycle(Object.assign({}, baseInput, {
  pointWeightGr: 300
}));

assert.ok(softer.vibration.frequencyHz < result.vibration.frequencyHz);
assert.ok(softer.excitation.equilibriumTipDisplacementMm > result.excitation.equilibriumTipDisplacementMm);
assert.ok(heavier.vibration.frequencyHz < result.vibration.frequencyHz);
assert.ok(heavier.excitation.equilibriumTipDisplacementMm > result.excitation.equilibriumTipDisplacementMm);

assert.throws(function () {
  ClearanceCycleModel.simulateClearanceCycle(Object.assign({}, baseInput, {
    braceHeightMm: 720
  }));
}, /弓档必须小于实测拉距/);

assert.throws(function () {
  ClearanceCycleModel.simulateClearanceCycle(Object.assign({}, baseInput, {
    shaftLengthIn: 27
  }));
}, /箭杆长不能短于实测拉距/);

console.log("experimental clearance-cycle model tests passed");
