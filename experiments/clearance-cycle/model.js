(function (root, factory) {
  var api = factory();
  if (typeof module === "object" && module.exports) {
    module.exports = api;
  } else {
    root.ArcherClearanceCycleModel = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  var MM_PER_INCH = 25.4;
  var METERS_PER_INCH = 0.0254;
  var NEWTONS_PER_POUND_FORCE = 4.4482216152605;
  var KILOGRAMS_PER_GRAIN = 0.00006479891;
  var ATA_TEST_LOAD_LB = 1.94;
  var ATA_TEST_SPAN_IN = 28;
  var DEFAULT_RELEASE_COEFFICIENT = 0.025;
  var DEFAULT_DAMPING_RATIO = 0.03;
  var DEFAULT_SAMPLE_COUNT = 401;

  function finiteNumber(value, label) {
    var number = Number(value);
    if (!Number.isFinite(number)) {
      throw new Error(label + "必须是有效数字");
    }
    return number;
  }

  function positiveNumber(value, label) {
    var number = finiteNumber(value, label);
    if (number <= 0) {
      throw new Error(label + "必须大于 0");
    }
    return number;
  }

  function nonNegativeNumber(value, label) {
    var number = finiteNumber(value, label);
    if (number < 0) {
      throw new Error(label + "不能小于 0");
    }
    return number;
  }

  function resolveInput(input) {
    var drawWeightLb = positiveNumber(input.drawWeightLb, "实测满拉拉重");
    var drawLengthIn = positiveNumber(input.drawLengthIn, "实测拉距");
    var braceHeightMm = positiveNumber(input.braceHeightMm, "弓档");
    var shaftLengthIn = positiveNumber(input.shaftLengthIn, "箭杆长");
    var arrowSpeedMps = positiveNumber(input.arrowSpeedMps, "箭速");
    var ataSpine = positiveNumber(input.ataSpine, "ATA 静态挠度");
    var bareArrowWeightGr = positiveNumber(input.bareArrowWeightGr, "裸箭重量");
    var pointWeightGr = nonNegativeNumber(input.pointWeightGr, "箭头系统重量");
    var shaftDiameterMm = positiveNumber(input.shaftDiameterMm, "箭杆外径");
    var arrowPassOffsetMm = nonNegativeNumber(input.arrowPassOffsetMm, "出箭点距中心线");
    var releaseCoefficient = input.releaseCoefficient == null
      ? DEFAULT_RELEASE_COEFFICIENT
      : nonNegativeNumber(input.releaseCoefficient, "释放侧向系数");
    var dampingRatio = input.dampingRatio == null
      ? DEFAULT_DAMPING_RATIO
      : nonNegativeNumber(input.dampingRatio, "阻尼比");
    var sampleCount = input.sampleCount == null
      ? DEFAULT_SAMPLE_COUNT
      : Math.round(positiveNumber(input.sampleCount, "采样点数"));
    var drawLengthMm = drawLengthIn * MM_PER_INCH;

    if (braceHeightMm >= drawLengthMm) {
      throw new Error("弓档必须小于实测拉距");
    }
    if (shaftLengthIn < drawLengthIn) {
      throw new Error("箭杆长不能短于实测拉距");
    }
    if (dampingRatio >= 1) {
      throw new Error("当前实验模型仅支持小于 1 的欠阻尼阻尼比");
    }
    if (sampleCount < 21 || sampleCount > 5001) {
      throw new Error("采样点数必须在 21 到 5001 之间");
    }

    return {
      drawWeightLb: drawWeightLb,
      drawLengthIn: drawLengthIn,
      drawLengthMm: drawLengthMm,
      braceHeightMm: braceHeightMm,
      shaftLengthIn: shaftLengthIn,
      arrowSpeedMps: arrowSpeedMps,
      ataSpine: ataSpine,
      bareArrowWeightGr: bareArrowWeightGr,
      pointWeightGr: pointWeightGr,
      finishedArrowWeightGr: bareArrowWeightGr + pointWeightGr,
      shaftDiameterMm: shaftDiameterMm,
      arrowPassOffsetMm: arrowPassOffsetMm,
      releaseCoefficient: releaseCoefficient,
      dampingRatio: dampingRatio,
      sampleCount: sampleCount
    };
  }

  function calculateTimeline(setup) {
    var drawLengthM = setup.drawLengthIn * METERS_PER_INCH;
    var braceHeightM = setup.braceHeightMm / 1000;
    var powerStrokeM = drawLengthM - braceHeightM;
    var accelerationMps2 = Math.pow(setup.arrowSpeedMps, 2) / (2 * powerStrokeM);
    var poweredDurationS = setup.arrowSpeedMps / accelerationMps2;
    var coastToRiserDurationS = braceHeightM / setup.arrowSpeedMps;

    return {
      drawLengthM: drawLengthM,
      braceHeightM: braceHeightM,
      powerStrokeM: powerStrokeM,
      accelerationMps2: accelerationMps2,
      poweredDurationS: poweredDurationS,
      coastToRiserDurationS: coastToRiserDurationS,
      nockClearDurationS: poweredDurationS + coastToRiserDurationS
    };
  }

  function calculateFlexuralModel(setup) {
    var staticDeflectionM = setup.ataSpine / 1000 * METERS_PER_INCH;
    var testSpanM = ATA_TEST_SPAN_IN * METERS_PER_INCH;
    var testLoadN = ATA_TEST_LOAD_LB * NEWTONS_PER_POUND_FORCE;
    var flexuralRigidityNm2 = testLoadN * Math.pow(testSpanM, 3) / (48 * staticDeflectionM);
    var shaftLengthM = setup.shaftLengthIn * METERS_PER_INCH;
    var shaftMassKg = setup.bareArrowWeightGr * KILOGRAMS_PER_GRAIN;
    var pointMassKg = setup.pointWeightGr * KILOGRAMS_PER_GRAIN;

    // Rayleigh first-mode approximation for a nock-constrained shaft with a free point end.
    var modalMassKg = pointMassKg + 33 / 140 * shaftMassKg;
    var modalStiffnessNPerM = 3 * flexuralRigidityNm2 / Math.pow(shaftLengthM, 3);
    var angularFrequencyRadS = Math.sqrt(modalStiffnessNPerM / modalMassKg);
    var frequencyHz = angularFrequencyRadS / (2 * Math.PI);

    return {
      staticDeflectionM: staticDeflectionM,
      flexuralRigidityNm2: flexuralRigidityNm2,
      shaftLengthM: shaftLengthM,
      shaftMassKg: shaftMassKg,
      pointMassKg: pointMassKg,
      modalMassKg: modalMassKg,
      modalStiffnessNPerM: modalStiffnessNPerM,
      angularFrequencyRadS: angularFrequencyRadS,
      frequencyHz: frequencyHz,
      periodS: 1 / frequencyHz
    };
  }

  function travelAtTime(t, timeline, arrowSpeedMps) {
    if (t <= timeline.poweredDurationS) {
      return {
        travelM: 0.5 * timeline.accelerationMps2 * t * t,
        speedMps: timeline.accelerationMps2 * t,
        powered: true
      };
    }
    return {
      travelM: timeline.powerStrokeM
        + arrowSpeedMps * (t - timeline.poweredDurationS),
      speedMps: arrowSpeedMps,
      powered: false
    };
  }

  function cantileverModeShape(positionFromNockM, shaftLengthM) {
    var ratio = Math.max(0, Math.min(1, positionFromNockM / shaftLengthM));
    return ratio * ratio * (3 - ratio) / 2;
  }

  function buildStepResponse(setup, timeline, flexural) {
    var geometricCoefficient = setup.arrowPassOffsetMm / setup.drawLengthMm;
    var participatingMassKg = flexural.pointMassKg + 0.375 * flexural.shaftMassKg;
    var releaseForceN = setup.drawWeightLb * NEWTONS_PER_POUND_FORCE
      * setup.releaseCoefficient;
    var geometricForceN = participatingMassKg * timeline.accelerationMps2
      * geometricCoefficient;
    var generalizedForceN = releaseForceN + geometricForceN;
    var equilibriumTipDisplacementM = generalizedForceN / flexural.modalStiffnessNPerM;
    var omega = flexural.angularFrequencyRadS;
    var damping = setup.dampingRatio;
    var dampedOmega = omega * Math.sqrt(1 - damping * damping);
    var decay = damping * omega;

    function forcedState(t) {
      var exponential = Math.exp(-decay * t);
      var sine = Math.sin(dampedOmega * t);
      var cosine = Math.cos(dampedOmega * t);
      return {
        displacementM: equilibriumTipDisplacementM * (
          1 - exponential * (cosine + decay / dampedOmega * sine)
        ),
        velocityMps: equilibriumTipDisplacementM
          * omega * omega / dampedOmega * exponential * sine
      };
    }

    var releaseState = forcedState(timeline.poweredDurationS);

    function stateAtTime(t) {
      if (t <= timeline.poweredDurationS) {
        return forcedState(t);
      }
      var freeTime = t - timeline.poweredDurationS;
      var exponential = Math.exp(-decay * freeTime);
      var sine = Math.sin(dampedOmega * freeTime);
      var cosine = Math.cos(dampedOmega * freeTime);
      var sineCoefficient = (releaseState.velocityMps + decay * releaseState.displacementM)
        / dampedOmega;
      return {
        displacementM: exponential * (
          releaseState.displacementM * cosine + sineCoefficient * sine
        )
      };
    }

    return {
      geometricCoefficient: geometricCoefficient,
      participatingMassKg: participatingMassKg,
      releaseForceN: releaseForceN,
      geometricForceN: geometricForceN,
      generalizedForceN: generalizedForceN,
      equilibriumTipDisplacementM: equilibriumTipDisplacementM,
      dampedFrequencyHz: dampedOmega / (2 * Math.PI),
      stateAtTime: stateAtTime
    };
  }

  function simulateClearanceCycle(input) {
    var setup = resolveInput(input || {});
    var timeline = calculateTimeline(setup);
    var flexural = calculateFlexuralModel(setup);
    var response = buildStepResponse(setup, timeline, flexural);
    var samples = [];
    var peakOutward = null;
    var peakInward = null;

    for (var index = 0; index < setup.sampleCount; index += 1) {
      var t = timeline.nockClearDurationS * index / (setup.sampleCount - 1);
      var travel = travelAtTime(t, timeline, setup.arrowSpeedMps);
      var stationFromNockM = Math.max(0, timeline.drawLengthM - travel.travelM);
      var modeShape = cantileverModeShape(stationFromNockM, flexural.shaftLengthM);
      var tipState = response.stateAtTime(t);
      var localDisplacementMm = tipState.displacementM * modeShape * 1000;
      var sample = {
        timeMs: t * 1000,
        travelMm: travel.travelM * 1000,
        speedMps: travel.speedMps,
        powered: travel.powered,
        shaftStationFromNockMm: stationFromNockM * 1000,
        modeShape: modeShape,
        tipDisplacementProxyMm: tipState.displacementM * 1000,
        localDisplacementProxyMm: localDisplacementMm
      };
      samples.push(sample);
      if (peakOutward == null || sample.localDisplacementProxyMm > peakOutward.localDisplacementProxyMm) {
        peakOutward = sample;
      }
      if (peakInward == null || sample.localDisplacementProxyMm < peakInward.localDisplacementProxyMm) {
        peakInward = sample;
      }
    }

    var clearanceThresholdMm = setup.arrowPassOffsetMm + setup.shaftDiameterMm / 2;
    return {
      modelId: "clearance-cycle-experimental-v1",
      status: "experimental-unvalidated",
      classification: null,
      input: setup,
      timeline: {
        powerStrokeMm: timeline.powerStrokeM * 1000,
        accelerationMps2: timeline.accelerationMps2,
        poweredDurationMs: timeline.poweredDurationS * 1000,
        coastToRiserDurationMs: timeline.coastToRiserDurationS * 1000,
        nockClearDurationMs: timeline.nockClearDurationS * 1000
      },
      vibration: {
        flexuralRigidityNm2: flexural.flexuralRigidityNm2,
        modalMassKg: flexural.modalMassKg,
        frequencyHz: flexural.frequencyHz,
        dampedFrequencyHz: response.dampedFrequencyHz,
        periodMs: flexural.periodS * 1000,
        cyclesBeforeNockClear: timeline.nockClearDurationS * response.dampedFrequencyHz
      },
      excitation: {
        releaseCoefficient: setup.releaseCoefficient,
        geometricCoefficient: response.geometricCoefficient,
        releaseForceN: response.releaseForceN,
        geometricForceN: response.geometricForceN,
        generalizedForceN: response.generalizedForceN,
        impliedMeanAxialForceN: setup.finishedArrowWeightGr * KILOGRAMS_PER_GRAIN
          * timeline.accelerationMps2,
        impliedMeanAxialForceToDrawWeightRatio: setup.finishedArrowWeightGr
          * KILOGRAMS_PER_GRAIN * timeline.accelerationMps2
          / (setup.drawWeightLb * NEWTONS_PER_POUND_FORCE),
        equilibriumTipDisplacementMm: response.equilibriumTipDisplacementM * 1000
      },
      clearance: {
        geometricThresholdMm: clearanceThresholdMm,
        peakOutwardProxyMm: peakOutward.localDisplacementProxyMm,
        peakOutwardTimeMs: peakOutward.timeMs,
        peakInwardProxyMm: peakInward.localDisplacementProxyMm,
        peakInwardTimeMs: peakInward.timeMs,
        uncalibratedPeakMarginMm: peakOutward.localDisplacementProxyMm - clearanceThresholdMm
      },
      samples: samples,
      limitations: [
        "局部位移是单模态代理量，不是已经验证的箭杆到弓把实际净空。",
        "释放侧向系数、阻尼和质量分布尚需高速摄影或接触实测标定。",
        "在完成标定前，本模型不输出通过、临界或碰撞结论。"
      ]
    };
  }

  return {
    simulateClearanceCycle: simulateClearanceCycle,
    constants: {
      ataTestLoadLb: ATA_TEST_LOAD_LB,
      ataTestSpanIn: ATA_TEST_SPAN_IN,
      defaultReleaseCoefficient: DEFAULT_RELEASE_COEFFICIENT,
      defaultDampingRatio: DEFAULT_DAMPING_RATIO
    }
  };
});
