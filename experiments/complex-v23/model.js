(function () {
  function createId(prefix) {
    return prefix + "-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 8);
  }

  function createSession(input) {
    return {
      id: createId("session"),
      createdAt: new Date().toISOString(),
      bowType: input.bowType || "recurve",
      distanceValue: Number(input.distanceValue || 18),
      distanceUnit: input.distanceUnit || "m",
      targetSizeCm: Number(input.targetSizeCm || 40),
      ringCount: Number(input.ringCount || 10),
      setupNotes: input.setupNotes || "",
      conditionNotes: input.conditionNotes || "",
      goal: input.goal || "",
      shots: []
    };
  }

  function createShot(index, kind, x, y, score, note) {
    return {
      id: createId("shot"),
      index: index,
      kind: kind,
      x: Number(x.toFixed(4)),
      y: Number(y.toFixed(4)),
      score: score,
      note: note || "",
      createdAt: new Date().toISOString()
    };
  }

  function scoreShot(x, y, ringCount) {
    var radius = Math.sqrt(x * x + y * y);
    if (radius > 1) {
      return "M";
    }
    var ring = ringCount - Math.floor(radius * ringCount);
    return Math.max(1, ring);
  }

  function average(values) {
    if (!values.length) {
      return 0;
    }
    return values.reduce(function (sum, value) { return sum + value; }, 0) / values.length;
  }

  function summarizeShots(shots) {
    if (!shots.length) {
      return {
        count: 0,
        averageScore: 0,
        centerX: 0,
        centerY: 0,
        averageRadius: 0,
        maxRadius: 0,
        byKind: {}
      };
    }

    var scored = shots
      .map(function (shot) { return typeof shot.score === "number" ? shot.score : 0; })
      .filter(function (score) { return score > 0; });
    var centerX = average(shots.map(function (shot) { return shot.x; }));
    var centerY = average(shots.map(function (shot) { return shot.y; }));
    var radii = shots.map(function (shot) {
      return Math.sqrt(Math.pow(shot.x - centerX, 2) + Math.pow(shot.y - centerY, 2));
    });

    var byKind = shots.reduce(function (groups, shot) {
      if (!groups[shot.kind]) {
        groups[shot.kind] = [];
      }
      groups[shot.kind].push(shot);
      return groups;
    }, {});

    Object.keys(byKind).forEach(function (kind) {
      byKind[kind] = summarizeKind(byKind[kind]);
    });

    return {
      count: shots.length,
      averageScore: Number(average(scored).toFixed(2)),
      centerX: Number(centerX.toFixed(3)),
      centerY: Number(centerY.toFixed(3)),
      averageRadius: Number(average(radii).toFixed(3)),
      maxRadius: Number(Math.max.apply(null, radii).toFixed(3)),
      byKind: byKind
    };
  }

  function summarizeKind(shots) {
    return {
      count: shots.length,
      centerX: Number(average(shots.map(function (shot) { return shot.x; })).toFixed(3)),
      centerY: Number(average(shots.map(function (shot) { return shot.y; })).toFixed(3))
    };
  }

  function toCsv(session) {
    var header = ["session_id", "created_at", "index", "kind", "score", "x", "y", "note"];
    var rows = session.shots.map(function (shot) {
      return [
        session.id,
        shot.createdAt,
        shot.index,
        shot.kind,
        shot.score,
        shot.x,
        shot.y,
        shot.note
      ].map(csvCell).join(",");
    });
    return [header.join(",")].concat(rows).join("\n");
  }

  function csvCell(value) {
    var text = String(value == null ? "" : value);
    if (/[",\n]/.test(text)) {
      return '"' + text.replace(/"/g, '""') + '"';
    }
    return text;
  }

  var bowTypeAliases = {
    chinese: "shelfless_traditional",
    chinese_traditional: "shelfless_traditional",
    mongolian: "shelfless_traditional",
    mongolian_traditional: "shelfless_traditional",
    shelfless: "shelfless_traditional",
    traditional: "american_hunting",
    trad: "american_hunting",
    tranditional: "american_hunting",
    turkish: "shelfless_traditional",
    turkish_traditional: "shelfless_traditional"
  };

  var baselineTuning = {
    american_hunting: {
      rest: "shelf/皮台",
      nockingPoint: "+1/4 到 +1/2 in",
      centerShot: "有弓窗美式猎弓，按弓窗离中心程度选择相邻挠度试箭"
    },
    barebow: {
      rest: "磁性箭台 + 中等压力 plunger",
      nockingPoint: "+1/8 到 +1/4 in",
      centerShot: "箭尖略在弦线外侧，按裸杆中心微调"
    },
    compound: {
      rest: "drop-away 或 blade rest",
      nockingPoint: "水平到 +1/8 in",
      centerShot: "从厂家中心射出起步，再用纸调/走线微调"
    },
    olympic_recurve: {
      rest: "磁性箭台 + 中等压力 plunger",
      nockingPoint: "+1/8 到 +1/4 in",
      centerShot: "箭尖略在弦线外侧，先裸杆再 walk-back"
    },
    shelfless_traditional: {
      rest: "无弓窗，搭箭手/虎口侧",
      nockingPoint: "+3/8 到 +3/4 in",
      centerShot: "无台传统弓，测量出箭点距中心线并用相邻挠度试箭"
    }
  };

  // Generic carbon-shaft starting points at 30 lb, 30 in shaft length and a
  // 100 gr point system. They provide an initial test-spine only; a measured
  // reference arrow takes precedence when available.
  var genericSpineBaselines = {
    olympic_recurve: { deflectionIn: 0.700, bandPercent: 15, referenceGpp: 9 },
    barebow: { deflectionIn: 0.700, bandPercent: 15, referenceGpp: 9 },
    compound: { deflectionIn: 0.600, bandPercent: 12.5, referenceGpp: 7 },
    american_hunting: { deflectionIn: 0.750, bandPercent: 17.5, referenceGpp: 9.5 },
    shelfless_traditional: { deflectionIn: 0.800, bandPercent: 20, referenceGpp: 10 }
  };
  var GENERIC_BASE_DRAW_WEIGHT_LB = 30;
  var GENERIC_BASE_SHAFT_LENGTH_IN = 30;
  var BASIC_RECOMMENDATION_DEFLECTION_IN = 0.700;
  var BASIC_RECOMMENDATION_BAND_PERCENT = 15;
  var BASIC_RECOMMENDATION_DRAW_LENGTH_IN = 28;
  var DYNAMIC_REFERENCE_GPP = 9;
  var GENERIC_DRAW_WEIGHT_EXPONENT = 0.6;
  var ARROW_WEIGHT_STEP_GR = 25;
  var EFFECTIVE_DRAW_PER_ARROW_WEIGHT_STEP_LB = 3;
  var COMMON_ATA_DEFLECTIONS = [
    200, 250, 300, 340, 350, 400, 450, 500, 550, 600, 650, 700,
    750, 800, 900, 1000, 1100, 1200, 1300, 1400, 1500, 1600, 1800, 2000
  ];
  var GOLD_TIP_RECURVE_CHART_LENGTHS_IN = [25, 26, 27, 28, 29, 30, 31, 32];
  var GOLD_TIP_RECURVE_CHART_POINT_WEIGHTS_GR = [100, 125, 150];
  var GOLD_TIP_RECURVE_CHART_ROWS = [
    { weightBands: { 100: [30, 34], 125: [30, 34] }, spines: [700, 600, 600, 600, 500, 500, 500, 400] },
    { weightBands: { 100: [35, 39], 125: [35, 39], 150: [30, 34] }, spines: [600, 600, 600, 500, 500, 500, 400, 400] },
    { weightBands: { 100: [40, 44], 125: [40, 44], 150: [35, 39] }, spines: [600, 600, 500, 500, 500, 400, 400, 400] },
    { weightBands: { 100: [45, 49], 125: [45, 49], 150: [40, 44] }, spines: [600, 500, 500, 500, 400, 400, 400, 340] },
    { weightBands: { 100: [50, 54], 125: [50, 54], 150: [45, 49] }, spines: [500, 500, 500, 400, 400, 400, 340, 340] },
    { weightBands: { 100: [55, 59], 125: [55, 59], 150: [50, 54] }, spines: [500, 500, 400, 400, 400, 340, 340, 340] },
    { weightBands: { 100: [60, 64], 125: [60, 64], 150: [55, 59] }, spines: [500, 400, 400, 400, 340, 340, 340, 300] },
    { weightBands: { 100: [65, 69], 125: [65, 69], 150: [60, 64] }, spines: [400, 400, 400, 340, 340, 340, 300, 300] },
    { weightBands: { 100: [70, 74], 125: [70, 74], 150: [65, 69] }, spines: [400, 400, 340, 340, 340, 300, 300, 300] },
    { weightBands: { 100: [75, 79], 125: [75, 79], 150: [70, 74] }, spines: [400, 340, 340, 340, 300, 300, 300, 250] },
    { weightBands: { 100: [80, 84], 125: [80, 84], 150: [75, 79] }, spines: [340, 340, 300, 300, 250, 250, 250, 250] }
  ];
  var EASTON_RECURVE_CHART_LENGTHS_IN = [21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34];
  var EASTON_RECURVE_DRAW_WEIGHT_UPPER_BOUNDS_LB = [20, 26, 31, 35, 39, 43, 47, 52, 57, 62, 67, 73];
  var EASTON_RECURVE_SPINE_RANGE_SEQUENCE = [
    [2000, 2000], [1800, 2000], [1700, 1800], [1400, 1750],
    [1200, 1450], [1050, 1250], [880, 1080], [750, 900],
    [700, 800], [625, 720], [600, 675], [570, 640],
    [500, 575], [450, 525], [400, 475], [370, 440],
    [340, 400], [310, 370], [300, 340], [250, 300],
    [200, 250], [150, 200]
  ];
  var EASTON_SHAFT_REFERENCES = [
    {
      product: "Sonic 6.0",
      spines: {
        250: { gpi: 9.5, stockLengthIn: 32.5 },
        300: { gpi: 8.8, stockLengthIn: 32 },
        340: { gpi: 7.8, stockLengthIn: 31.5 },
        400: { gpi: 7.2, stockLengthIn: 31 },
        500: { gpi: 6.7, stockLengthIn: 30.5 },
        600: { gpi: 5.8, stockLengthIn: 30.5 }
      }
    },
    {
      product: "Carbon Legacy",
      spines: {
        340: { gpi: 10.1, stockLengthIn: 34 },
        400: { gpi: 9.3, stockLengthIn: 34 },
        500: { gpi: 8.3, stockLengthIn: 34 },
        600: { gpi: 7.5, stockLengthIn: 34 },
        700: { gpi: 7.1, stockLengthIn: 34 }
      }
    }
  ];
  var ATA_TEST_LOAD_LB = 1.94;
  var ATA_TEST_SPAN_IN = 28;
  var MM_PER_INCH = 25.4;
  var NEWTONS_PER_POUND_FORCE = 4.4482216152605;
  var KILOGRAMS_PER_POUND = 0.45359237;
  var GRAMS_PER_GRAIN = 0.06479891;
  var handleClearanceMaterials = {
    carbon: {
      label: "碳箭杆",
      sectionType: "hollow",
      assumedDiameterMm: 6,
      assumedInnerDiameterMm: 4.2,
      extraClearanceMm: 2,
      dynamicFactorMin: 1.6,
      dynamicFactorMax: 2.0
    },
    bamboo: {
      label: "拼竹空心箭杆",
      sectionType: "hollow",
      assumedDiameterMm: 8,
      assumedInnerDiameterMm: 4,
      extraClearanceMm: 3,
      dynamicFactorMin: 1.3,
      dynamicFactorMax: 1.7
    },
    wood: {
      label: "实心木箭杆",
      sectionType: "solid",
      assumedDiameterMm: 8,
      assumedInnerDiameterMm: 0,
      extraClearanceMm: 3,
      dynamicFactorMin: 1.3,
      dynamicFactorMax: 1.7
    }
  };
  var dynamicBowProfiles = {
    olympic_recurve: { label: "竞技反曲", releaseFraction: 0.022 },
    barebow: { label: "光弓", releaseFraction: 0.030 },
    compound: { label: "复合弓", releaseFraction: 0.010 },
    american_hunting: { label: "美猎", releaseFraction: 0.030 },
    shelfless_traditional: { label: "无台传统弓", releaseFraction: 0.025 }
  };

  function normalizeBowType(bowType) {
    var normalized = String(bowType || "").trim().toLowerCase();
    var bowType = bowTypeAliases[normalized] || normalized;
    if (["american_hunting", "barebow", "compound", "olympic_recurve", "shelfless_traditional"].indexOf(bowType) === -1) {
      throw new Error("不支持的弓型: " + bowType);
    }
    return bowType;
  }

  function requireMeasuredAmericanOffset(bowType, manualOffsetMm) {
    if (bowType === "american_hunting" && manualOffsetMm == null) {
      throw new Error("美猎请填写实测出箭点距中心线；中心出箭请明确填写 0");
    }
  }

  function nearestValue(values, target) {
    return values.reduce(function (closest, value) {
      return Math.abs(value - target) < Math.abs(closest - target) ? value : closest;
    });
  }

  function lookupGoldTipRecurveChart(bowType, drawWeightLb, drawLengthIn, pointWeightGr) {
    if (["olympic_recurve", "barebow", "american_hunting", "shelfless_traditional"].indexOf(bowType) === -1) return null;
    var chartLengthIn = Math.round(drawLengthIn);
    if (GOLD_TIP_RECURVE_CHART_LENGTHS_IN.indexOf(chartLengthIn) === -1) return null;
    var pointColumnGr = nearestValue(GOLD_TIP_RECURVE_CHART_POINT_WEIGHTS_GR, pointWeightGr);
    var row = GOLD_TIP_RECURVE_CHART_ROWS.find(function (candidate) {
      var band = candidate.weightBands[pointColumnGr];
      return band && drawWeightLb >= band[0] && drawWeightLb <= band[1];
    });
    if (!row) return null;
    var lengthIndex = GOLD_TIP_RECURVE_CHART_LENGTHS_IN.indexOf(chartLengthIn);
    return {
      ataSpine: row.spines[lengthIndex],
      source: "gold-tip-recurve",
      chartLengthIn: chartLengthIn,
      actualDrawLengthIn: Number(drawLengthIn.toFixed(2)),
      pointWeightColumnGr: pointColumnGr,
      actualPointWeightGr: Number(pointWeightGr.toFixed(1)),
      pointWeightApproximated: pointWeightGr !== pointColumnGr
    };
  }

  function lookupEastonRecurveRange(bowType, drawWeightLb, drawLengthIn, pointWeightGr) {
    if (["olympic_recurve", "barebow", "american_hunting", "shelfless_traditional"].indexOf(bowType) === -1) return null;
    var chartLengthIn = Math.round(drawLengthIn);
    var lengthIndex = EASTON_RECURVE_CHART_LENGTHS_IN.indexOf(chartLengthIn);
    if (lengthIndex === -1) return null;
    var adjustedDrawWeightLb = drawWeightLb
      + (pointWeightGr - 100) / ARROW_WEIGHT_STEP_GR * EFFECTIVE_DRAW_PER_ARROW_WEIGHT_STEP_LB;
    var weightIndex = EASTON_RECURVE_DRAW_WEIGHT_UPPER_BOUNDS_LB.findIndex(function (upperBound) {
      return adjustedDrawWeightLb <= upperBound;
    });
    if (weightIndex === -1) return null;
    var rangeIndex = clamp(
      weightIndex + lengthIndex - 1,
      0,
      EASTON_RECURVE_SPINE_RANGE_SEQUENCE.length - 1
    );
    var range = EASTON_RECURVE_SPINE_RANGE_SEQUENCE[rangeIndex];
    return {
      lowerAtaSpine: range[0],
      upperAtaSpine: range[1],
      chartLengthIn: chartLengthIn,
      adjustedDrawWeightLb: adjustedDrawWeightLb,
      source: "easton-target-recurve"
    };
  }

  function commonCandidatesInRange(lowerAta, upperAta) {
    var candidates = COMMON_ATA_DEFLECTIONS.filter(function (value) {
      return value >= lowerAta && value <= upperAta;
    });
    if (candidates.length) return candidates;
    var centerAta = (lowerAta + upperAta) / 2;
    return [COMMON_ATA_DEFLECTIONS.reduce(function (closest, value) {
      return Math.abs(value - centerAta) < Math.abs(closest - centerAta) ? value : closest;
    })];
  }

  function mergeCandidateSpines(target, additions) {
    additions.forEach(function (value) {
      if (target.indexOf(value) === -1) target.push(value);
    });
    target.sort(function (left, right) { return left - right; });
  }

  function parseNumberList(raw) {
    var text = String(raw || "").trim();
    if (!text) {
      throw new Error("请输入数值");
    }
    if (text.indexOf(":") !== -1) {
      var parts = text.split(":").map(function (part) { return Number(part); });
      if (parts.length !== 3 || parts.some(function (value) { return !Number.isFinite(value); })) {
        throw new Error("范围格式应为 start:stop:step");
      }
      if (parts[2] <= 0) {
        throw new Error("范围步长必须大于 0");
      }
      var values = [];
      for (var current = parts[0]; current <= parts[1] + 1e-9; current += parts[2]) {
        values.push(Number(current.toFixed(6)));
      }
      return values;
    }
    var parsed = text.split(",")
      .map(function (part) { return Number(part.trim()); })
      .filter(function (value) { return Number.isFinite(value); });
    if (!parsed.length) {
      throw new Error("请输入逗号分隔数值");
    }
    return parsed;
  }

  function positiveNumber(value, label) {
    var number = Number(value);
    if (!Number.isFinite(number) || number <= 0) {
      throw new Error(label + "必须大于 0");
    }
    return number;
  }

  function nonNegativeNumber(value, label) {
    var number = Number(value || 0);
    if (!Number.isFinite(number) || number < 0) {
      throw new Error(label + "不能为负数");
    }
    return number;
  }

  function finiteNumber(value, label) {
    var number = Number(value);
    if (!Number.isFinite(number)) {
      throw new Error(label + "必须是有效数字");
    }
    return number;
  }

  function grainsToGrams(grains) {
    return finiteNumber(grains, "格令") * GRAMS_PER_GRAIN;
  }

  function gramsToGrains(grams) {
    return finiteNumber(grams, "克") / GRAMS_PER_GRAIN;
  }

  function kilogramsToPounds(kilograms) {
    return finiteNumber(kilograms, "千克") / KILOGRAMS_PER_POUND;
  }

  function poundsToKilograms(pounds) {
    return finiteNumber(pounds, "磅") * KILOGRAMS_PER_POUND;
  }

  function inchesToMillimeters(inches) {
    return finiteNumber(inches, "英寸") * MM_PER_INCH;
  }

  function millimetersToInches(millimeters) {
    return finiteNumber(millimeters, "毫米") / MM_PER_INCH;
  }

  function ataSpineToMillimeters(ataSpine) {
    return finiteNumber(ataSpine, "ATA 挠度") / 1000 * MM_PER_INCH;
  }

  function millimetersToAtaSpine(millimeters) {
    return finiteNumber(millimeters, "静态测试位移") / MM_PER_INCH * 1000;
  }

  function normalizeArrowMaterial(material) {
    var key = String(material || "carbon").trim().toLowerCase();
    if (key === "bamboo_wood") key = "bamboo";
    if (!handleClearanceMaterials[key]) {
      throw new Error("不支持的箭杆材料: " + material);
    }
    return key;
  }

  function calculateShaftSection(input) {
    var materialKey = normalizeArrowMaterial(input.arrowMaterial);
    var material = handleClearanceMaterials[materialKey];
    var outerDiameterMm = positiveNumber(input.outerDiameterMm, "箭杆外径");
    var innerDiameterMm = material.sectionType === "solid"
      ? 0
      : positiveNumber(input.innerDiameterMm, "空心箭杆内径");
    if (innerDiameterMm >= outerDiameterMm) {
      throw new Error("箭杆内径必须小于外径");
    }

    var outerSquared = Math.pow(outerDiameterMm, 2);
    var innerSquared = Math.pow(innerDiameterMm, 2);
    var areaMm2 = Math.PI / 4 * (outerSquared - innerSquared);
    var secondMomentMm4 = Math.PI / 64 * (
      Math.pow(outerDiameterMm, 4) - Math.pow(innerDiameterMm, 4)
    );
    var staticDeflectionMm = ataSpineToMillimeters(positiveNumber(input.ataSpine, "裸箭 ATA 静态挠度"));
    var testSpanMm = ATA_TEST_SPAN_IN * MM_PER_INCH;
    var testLoadN = ATA_TEST_LOAD_LB * NEWTONS_PER_POUND_FORCE;
    var flexuralRigidityNmm2 = testLoadN * Math.pow(testSpanMm, 3) / (48 * staticDeflectionMm);
    var effectiveBendingModulusGpa = flexuralRigidityNmm2 / secondMomentMm4 / 1000;

    return {
      materialKey: materialKey,
      sectionType: material.sectionType,
      outerDiameterMm: outerDiameterMm,
      innerDiameterMm: innerDiameterMm,
      wallThicknessMm: material.sectionType === "hollow" ? (outerDiameterMm - innerDiameterMm) / 2 : null,
      areaMm2: areaMm2,
      secondMomentMm4: secondMomentMm4,
      staticDeflectionMm: staticDeflectionMm,
      flexuralRigidityNmm2: flexuralRigidityNmm2,
      effectiveBendingModulusGpa: effectiveBendingModulusGpa
    };
  }

  function clamp(value, minimum, maximum) {
    return Math.min(maximum, Math.max(minimum, value));
  }

  function resolveDynamicSetup(input) {
    var bowType = normalizeBowType(input.bowType);
    var drawWeightLb = positiveNumber(input.drawWeightLb, "实测满拉拉重");
    var drawLengthIn = positiveNumber(input.drawLengthIn, "实测拉距");
    var shaftLengthIn = positiveNumber(input.shaftLengthIn, "箭杆长");
    var bareArrowWeightGr = positiveNumber(input.bareArrowWeightGr, "裸箭重量");
    var pointWeightGr = nonNegativeNumber(input.pointWeightGr, "箭头系统重量");
    var staticDeflectionIn = positiveNumber(input.ataSpine, "裸箭 ATA 静态挠度") / 1000;
    var materialKey = normalizeArrowMaterial(input.arrowMaterial);
    var material = handleClearanceMaterials[materialKey];
    var shaftDiameterMm = input.shaftDiameterMm === "" || input.shaftDiameterMm == null
      ? material.assumedDiameterMm
      : positiveNumber(input.shaftDiameterMm, "箭杆外径");
    var shaftInnerDiameterMm = material.sectionType === "solid"
      ? 0
      : input.shaftInnerDiameterMm === "" || input.shaftInnerDiameterMm == null
        ? material.assumedInnerDiameterMm
        : positiveNumber(input.shaftInnerDiameterMm, "空心箭杆内径");
    var section = calculateShaftSection({
      arrowMaterial: materialKey,
      outerDiameterMm: shaftDiameterMm,
      innerDiameterMm: shaftInnerDiameterMm,
      ataSpine: input.ataSpine
    });
    var gripWidthMm = input.gripWidthMm === "" || input.gripWidthMm == null
      ? null
      : nonNegativeNumber(input.gripWidthMm, "弓把宽度");
    var manualOffsetMm = input.arrowPassOffsetMm === "" || input.arrowPassOffsetMm == null
      ? null
      : nonNegativeNumber(input.arrowPassOffsetMm, "出箭点距中心线");
    requireMeasuredAmericanOffset(bowType, manualOffsetMm);
    var useGripWidth = bowType === "shelfless_traditional" && gripWidthMm != null && gripWidthMm > 0;
    if (bowType === "shelfless_traditional" && !useGripWidth && manualOffsetMm == null) {
      throw new Error("无台传统弓请测量弓把宽度，或直接填写出箭点距中心线");
    }
    if (shaftLengthIn < drawLengthIn) {
      throw new Error("箭杆长不能短于以箭尾喉口至弓把 pivot 测得的拉距");
    }
    return {
      bowType: bowType,
      profile: dynamicBowProfiles[bowType],
      materialKey: materialKey,
      material: material,
      drawWeightLb: drawWeightLb,
      drawLengthIn: drawLengthIn,
      shaftLengthIn: shaftLengthIn,
      bareArrowWeightGr: bareArrowWeightGr,
      pointWeightGr: pointWeightGr,
      finishedArrowWeightGr: bareArrowWeightGr + pointWeightGr,
      staticDeflectionIn: staticDeflectionIn,
      shaftDiameterMm: shaftDiameterMm,
      shaftInnerDiameterMm: shaftInnerDiameterMm,
      section: section,
      arrowPassOffsetMm: useGripWidth
        ? gripWidthMm / 2
        : manualOffsetMm == null ? 0 : manualOffsetMm,
      offsetSource: useGripWidth ? "grip-width-half" : manualOffsetMm == null ? "center-shot-default" : "manual"
    };
  }

  function calculateDynamicResponse(setup, options) {
    var shaftLengthIn = options.shaftLengthIn;
    var pointWeightGr = options.pointWeightGr;
    var finishedArrowWeightGr = setup.bareArrowWeightGr + pointWeightGr;
    var pointAdjustmentLb = (pointWeightGr - 100) / ARROW_WEIGHT_STEP_GR * EFFECTIVE_DRAW_PER_ARROW_WEIGHT_STEP_LB;
    var setupDrawDemandLb = Math.max(5, setup.drawWeightLb + pointAdjustmentLb);
    var powerStrokeFactor = Math.sqrt(setup.drawLengthIn / 28);
    var effectiveDrawWeightLb = setupDrawDemandLb * powerStrokeFactor;
    var referenceFinishedArrowWeightGr = DYNAMIC_REFERENCE_GPP * setup.drawWeightLb;
    var inertiaFactor = clamp(Math.sqrt(referenceFinishedArrowWeightGr / finishedArrowWeightGr), 0.7, 1.3);
    var geometricFraction = setup.arrowPassOffsetMm / MM_PER_INCH / setup.drawLengthIn;
    var lateralFraction = setup.profile.releaseFraction + geometricFraction;
    var lateralForceLb = effectiveDrawWeightLb * lateralFraction * inertiaFactor;
    var responseScale = lateralForceLb / ATA_TEST_LOAD_LB * Math.pow(shaftLengthIn / ATA_TEST_SPAN_IN, 3);
    var staticDeflectionIn = options.staticDeflectionIn;
    return {
      finishedArrowWeightGr: finishedArrowWeightGr,
      gpp: finishedArrowWeightGr / setup.drawWeightLb,
      pointAdjustmentLb: pointAdjustmentLb,
      offsetAdjustmentLb: 0,
      powerStrokeFactor: powerStrokeFactor,
      effectiveDrawWeightLb: effectiveDrawWeightLb,
      inertiaFactor: inertiaFactor,
      lateralFraction: lateralFraction,
      lateralForceLb: lateralForceLb,
      responseScale: responseScale,
      dynamicDeflectionMinMm: staticDeflectionIn * MM_PER_INCH * responseScale * setup.material.dynamicFactorMin,
      dynamicDeflectionMaxMm: staticDeflectionIn * MM_PER_INCH * responseScale * setup.material.dynamicFactorMax
    };
  }

  function calculateBasicRecommendation(drawWeightLb, drawLengthIn) {
    var centerDeflectionIn = BASIC_RECOMMENDATION_DEFLECTION_IN
      * Math.pow(GENERIC_BASE_DRAW_WEIGHT_LB / drawWeightLb, GENERIC_DRAW_WEIGHT_EXPONENT)
      * Math.pow(BASIC_RECOMMENDATION_DRAW_LENGTH_IN / drawLengthIn, 3);
    return {
      centerDeflectionIn: centerDeflectionIn,
      lowerDeflectionIn: centerDeflectionIn * (1 - BASIC_RECOMMENDATION_BAND_PERCENT / 100),
      upperDeflectionIn: centerDeflectionIn * (1 + BASIC_RECOMMENDATION_BAND_PERCENT / 100)
    };
  }

  function calculateDynamicRecommendation(setup, response) {
    var basicRecommendation = calculateBasicRecommendation(setup.drawWeightLb, setup.drawLengthIn);
    var centerDeflectionIn = basicRecommendation.centerDeflectionIn;
    var empiricalLowerIn = basicRecommendation.lowerDeflectionIn;
    var empiricalUpperIn = basicRecommendation.upperDeflectionIn;
    var hasClearanceConstraint = setup.arrowPassOffsetMm > 0;
    var requiredDynamicMinMm = null;

    if (hasClearanceConstraint) {
      requiredDynamicMinMm = setup.arrowPassOffsetMm + setup.shaftDiameterMm / 2;
    }

    var recommendedDynamicMinMm = empiricalLowerIn * MM_PER_INCH
      * response.responseScale * setup.material.dynamicFactorMin;
    var recommendedDynamicMaxMm = empiricalUpperIn * MM_PER_INCH
      * response.responseScale * setup.material.dynamicFactorMax;
    var recommendedDynamicCenterMm = (recommendedDynamicMinMm + recommendedDynamicMaxMm) / 2;
    var calibrationTargetMm = Math.max(
      recommendedDynamicCenterMm,
      requiredDynamicMinMm == null ? 0 : requiredDynamicMinMm
    );
    var calibrationTargetSource = requiredDynamicMinMm != null
      && requiredDynamicMinMm > recommendedDynamicCenterMm
      ? "clearance-floor"
      : "range-mean";
    var calibrationConflict = calibrationTargetMm > recommendedDynamicMaxMm;
    var lowerAta = Math.round(empiricalLowerIn * 1000);
    var upperAta = Math.round(empiricalUpperIn * 1000);
    var productAtaCandidates = COMMON_ATA_DEFLECTIONS.filter(function (value) {
      return value >= lowerAta && value <= upperAta;
    });
    if (!productAtaCandidates.length) {
      var centerAta = centerDeflectionIn * 1000;
      productAtaCandidates = [COMMON_ATA_DEFLECTIONS.reduce(function (closest, value) {
        return Math.abs(value - centerAta) < Math.abs(closest - centerAta) ? value : closest;
      })];
    }
    return {
      empiricalCenterIn: centerDeflectionIn,
      empiricalLowerIn: empiricalLowerIn,
      empiricalUpperIn: empiricalUpperIn,
      hasClearanceConstraint: hasClearanceConstraint,
      requiredDynamicMinMm: requiredDynamicMinMm,
      finalLowerIn: empiricalLowerIn,
      finalUpperIn: empiricalUpperIn,
      finalCenterIn: centerDeflectionIn,
      productAtaCandidates: productAtaCandidates,
      recommendedDynamicMinMm: recommendedDynamicMinMm,
      recommendedDynamicMaxMm: recommendedDynamicMaxMm,
      recommendedDynamicCenterMm: recommendedDynamicCenterMm,
      calibrationTargetMm: calibrationTargetMm,
      calibrationTargetSource: calibrationTargetSource,
      calibrationConflict: calibrationConflict,
      screeningPointWeightGr: 100,
      woodSpinePoundsMin: setup.materialKey !== "wood" ? null : 26 / empiricalUpperIn,
      woodSpinePoundsMax: setup.materialKey !== "wood" ? null : 26 / empiricalLowerIn,
      conflict: calibrationConflict
    };
  }

  function assessClearance(dynamicMinMm, dynamicMaxMm, recommendation) {
    if (!recommendation.hasClearanceConstraint) return "not-applicable";
    var toleranceMm = 1e-6;
    if (dynamicMaxMm < recommendation.requiredDynamicMinMm - toleranceMm) return "insufficient";
    if (dynamicMinMm >= recommendation.requiredDynamicMinMm - toleranceMm) return "satisfied";
    return "uncertain";
  }

  function assessDynamicRecommendation(dynamicMinMm, dynamicMaxMm, recommendation) {
    if (dynamicMaxMm < recommendation.recommendedDynamicMinMm) return "too-stiff";
    if (dynamicMaxMm < recommendation.calibrationTargetMm) return "stiff-side";
    if (dynamicMinMm > recommendation.recommendedDynamicMaxMm) return "too-soft";
    if (dynamicMaxMm > recommendation.recommendedDynamicMaxMm) return "soft-side";
    return "balanced";
  }

  function calculateFixedShaftAdjustments(setup, response, recommendation) {
    var targetDynamicMm = recommendation.calibrationConflict
      ? null
      : recommendation.calibrationTargetMm;

    function responseAtPoint(pointWeightGr) {
      return calculateDynamicResponse(setup, {
        staticDeflectionIn: setup.staticDeflectionIn,
        shaftLengthIn: setup.shaftLengthIn,
        pointWeightGr: pointWeightGr
      });
    }

    var targetPointWeightGr = null;
    var validPointWeight = false;
    if (targetDynamicMm != null) {
      var lowerPointGr = 0;
      var upperPointGr = 1000;
      var lowerDynamicMm = responseAtPoint(lowerPointGr).dynamicDeflectionMinMm;
      var upperDynamicMm = responseAtPoint(upperPointGr).dynamicDeflectionMinMm;
      validPointWeight = targetDynamicMm >= lowerDynamicMm && targetDynamicMm <= upperDynamicMm;
      if (validPointWeight) {
        for (var pointIteration = 0; pointIteration < 60; pointIteration += 1) {
          var middlePointGr = (lowerPointGr + upperPointGr) / 2;
          if (responseAtPoint(middlePointGr).dynamicDeflectionMinMm < targetDynamicMm) {
            lowerPointGr = middlePointGr;
          } else {
            upperPointGr = middlePointGr;
          }
        }
        targetPointWeightGr = (lowerPointGr + upperPointGr) / 2;
      }
    }

    var targetShaftLengthIn = targetDynamicMm == null ? null : setup.shaftLengthIn * Math.pow(
      targetDynamicMm / response.dynamicDeflectionMinMm,
      1 / 3
    );
    var pointResponse = validPointWeight ? calculateDynamicResponse(setup, {
      staticDeflectionIn: setup.staticDeflectionIn,
      shaftLengthIn: setup.shaftLengthIn,
      pointWeightGr: targetPointWeightGr
    }) : null;
    var lengthResponse = targetShaftLengthIn == null ? null : calculateDynamicResponse(setup, {
      staticDeflectionIn: setup.staticDeflectionIn,
      shaftLengthIn: targetShaftLengthIn,
      pointWeightGr: setup.pointWeightGr
    });
    var pointClearanceStatus = pointResponse == null ? "unavailable" : assessClearance(
      pointResponse.dynamicDeflectionMinMm,
      pointResponse.dynamicDeflectionMaxMm,
      recommendation
    );
    var lengthClearanceStatus = lengthResponse == null ? "unavailable" : assessClearance(
      lengthResponse.dynamicDeflectionMinMm,
      lengthResponse.dynamicDeflectionMaxMm,
      recommendation
    );
    return {
      targetDynamicMm: targetDynamicMm,
      targetDynamicMinMm: recommendation.recommendedDynamicMinMm,
      targetDynamicMaxMm: recommendation.recommendedDynamicMaxMm,
      targetSource: "equipment-screening",
      targetPointWeightGr: validPointWeight ? targetPointWeightGr : null,
      targetFinishedArrowWeightGr: validPointWeight ? setup.bareArrowWeightGr + targetPointWeightGr : null,
      pointWeightDeltaGr: validPointWeight ? targetPointWeightGr - setup.pointWeightGr : null,
      pointDynamicMinMm: pointResponse == null ? null : pointResponse.dynamicDeflectionMinMm,
      pointDynamicMaxMm: pointResponse == null ? null : pointResponse.dynamicDeflectionMaxMm,
      pointClearancePass: pointClearanceStatus === "not-applicable" || pointClearanceStatus === "satisfied",
      pointClearanceStatus: pointClearanceStatus,
      targetShaftLengthIn: targetShaftLengthIn,
      shaftLengthDeltaIn: targetShaftLengthIn == null ? null : targetShaftLengthIn - setup.shaftLengthIn,
      lengthBelowDrawLength: targetShaftLengthIn == null ? false : targetShaftLengthIn < setup.drawLengthIn,
      lengthDynamicMinMm: lengthResponse == null ? null : lengthResponse.dynamicDeflectionMinMm,
      lengthDynamicMaxMm: lengthResponse == null ? null : lengthResponse.dynamicDeflectionMaxMm,
      lengthClearancePass: lengthClearanceStatus === "not-applicable" || lengthClearanceStatus === "satisfied",
      lengthClearanceStatus: lengthClearanceStatus
    };
  }

  function analyzeDynamicSpine(input) {
    var setup = resolveDynamicSetup(input);
    var response = calculateDynamicResponse(setup, {
      staticDeflectionIn: setup.staticDeflectionIn,
      shaftLengthIn: setup.shaftLengthIn,
      pointWeightGr: setup.pointWeightGr
    });
    var screeningResponse = calculateDynamicResponse(setup, {
      staticDeflectionIn: setup.staticDeflectionIn,
      shaftLengthIn: setup.shaftLengthIn,
      pointWeightGr: 100
    });
    var recommendation = calculateDynamicRecommendation(setup, screeningResponse);
    var adjustments = calculateFixedShaftAdjustments(setup, response, recommendation);
    var staticMatch = setup.staticDeflectionIn >= recommendation.finalLowerIn
      && setup.staticDeflectionIn <= recommendation.finalUpperIn;
    var clearanceStatus = assessClearance(
      response.dynamicDeflectionMinMm,
      response.dynamicDeflectionMaxMm,
      recommendation
    );
    var dynamicMatchStatus = assessDynamicRecommendation(
      response.dynamicDeflectionMinMm,
      response.dynamicDeflectionMaxMm,
      recommendation
    );
    var clearanceMatch = clearanceStatus === "not-applicable" || clearanceStatus === "satisfied";
    var dynamicMatch = dynamicMatchStatus === "balanced";
    return {
      bowType: setup.bowType,
      bowLabel: setup.profile.label,
      materialKey: setup.materialKey,
      materialLabel: setup.material.label,
      drawWeightLb: setup.drawWeightLb,
      drawLengthIn: setup.drawLengthIn,
      shaftLengthIn: setup.shaftLengthIn,
      bareArrowWeightGr: setup.bareArrowWeightGr,
      pointWeightGr: setup.pointWeightGr,
      finishedArrowWeightGr: response.finishedArrowWeightGr,
      gpp: response.gpp,
      staticDeflectionIn: setup.staticDeflectionIn,
      ataSpine: Math.round(setup.staticDeflectionIn * 1000),
      shaftDiameterMm: setup.shaftDiameterMm,
      shaftInnerDiameterMm: setup.shaftInnerDiameterMm,
      section: setup.section,
      arrowPassOffsetMm: setup.arrowPassOffsetMm,
      offsetSource: setup.offsetSource,
      current: response,
      recommendation: recommendation,
      adjustments: adjustments,
      staticMatch: staticMatch,
      dynamicMatch: dynamicMatch,
      dynamicMatchStatus: dynamicMatchStatus,
      clearanceMatch: clearanceMatch,
      clearanceStatus: clearanceStatus,
      overallMatch: staticMatch && dynamicMatch && clearanceMatch && !recommendation.conflict
    };
  }

  function chartNextStep(bowType) {
    if (bowType === "compound") {
      return "如有厂商复合弓 chart，可用实测峰值拉重、箭长、总箭头系统重量、凸轮/弦距和撒放方式交叉核对；没有时从相邻候选开始纸调或裸杆验证。";
    }
    if (bowType === "shelfless_traditional") {
      return "记录满拉实测拉重、出箭点距中心线和箭长；有厂商传统弓 chart 时可取相邻两档试箭，没有时用相邻候选进行裸杆验证。";
    }
    return "如有厂商 chart，可按实测拉重、其定义的箭长和总箭头系统重量交叉核对；没有时从相邻候选开始，用裸杆或纸调验证。";
  }

  function estimateStaticSpine(input) {
    var bowType = normalizeBowType(input.bowType);
    var drawWeightLb = positiveNumber(input.drawWeightLb, "实测拉重");
    var shaftLengthIn = positiveNumber(input.shaftLengthIn, "箭杆长度");
    var baseline = genericSpineBaselines[bowType];
    var referenceFinishedArrowWeightGr = baseline.referenceGpp * drawWeightLb;
    var finishedArrowWeightGr = input.finishedArrowWeightGr === "" || input.finishedArrowWeightGr == null
      ? referenceFinishedArrowWeightGr
      : positiveNumber(input.finishedArrowWeightGr, "成品箭重");
    var manualOffsetMm = input.arrowPassOffsetMm === "" || input.arrowPassOffsetMm == null
      ? null
      : nonNegativeNumber(input.arrowPassOffsetMm, "出箭点距中心线");
    requireMeasuredAmericanOffset(bowType, manualOffsetMm);
    var arrowPassOffsetMm = manualOffsetMm == null ? 0 : manualOffsetMm;
    var arrowWeightAdjustmentLb = (finishedArrowWeightGr - referenceFinishedArrowWeightGr) / ARROW_WEIGHT_STEP_GR * EFFECTIVE_DRAW_PER_ARROW_WEIGHT_STEP_LB;
    var offsetAdjustmentLb = 0;
    var effectiveDrawWeightLb = Math.max(5, drawWeightLb + arrowWeightAdjustmentLb);
    var centerDeflectionIn = baseline.deflectionIn
      * Math.pow(GENERIC_BASE_DRAW_WEIGHT_LB / effectiveDrawWeightLb, GENERIC_DRAW_WEIGHT_EXPONENT)
      * Math.pow(shaftLengthIn / GENERIC_BASE_SHAFT_LENGTH_IN, 3);
    var lowerDeflectionIn = centerDeflectionIn * (1 - baseline.bandPercent / 100);
    var upperDeflectionIn = centerDeflectionIn * (1 + baseline.bandPercent / 100);
    return {
      source: "generic",
      centerDeflectionIn: Number(centerDeflectionIn.toFixed(3)),
      lowerDeflectionIn: Number(lowerDeflectionIn.toFixed(3)),
      upperDeflectionIn: Number(upperDeflectionIn.toFixed(3)),
      centerAtaSpine: Math.round(centerDeflectionIn * 1000),
      lowerAtaSpine: Math.round(lowerDeflectionIn * 1000),
      upperAtaSpine: Math.round(upperDeflectionIn * 1000),
      bandPercent: baseline.bandPercent,
      effectiveDrawWeightLb: Number(effectiveDrawWeightLb.toFixed(2)),
      referenceFinishedArrowWeightGr: Number(referenceFinishedArrowWeightGr.toFixed(1)),
      finishedArrowWeightGr: Number(finishedArrowWeightGr.toFixed(1)),
      arrowPassOffsetMm: Number(arrowPassOffsetMm.toFixed(1)),
      arrowWeightAdjustmentLb: Number(arrowWeightAdjustmentLb.toFixed(2)),
      offsetAdjustmentLb: Number(offsetAdjustmentLb.toFixed(2))
    };
  }

  function estimateBareShaftSpine(input) {
    var bowType = normalizeBowType(input.bowType);
    var drawWeightLb = positiveNumber(input.drawWeightLb, "实测满拉拉重");
    var drawLengthIn = positiveNumber(input.drawLengthIn, "实测拉距");
    var shaftLengthIn = positiveNumber(input.shaftLengthIn, "箭杆长");
    var gripWidthMm = input.gripWidthMm === "" || input.gripWidthMm == null
      ? null
      : nonNegativeNumber(input.gripWidthMm, "弓把宽度");
    var manualOffsetMm = input.arrowPassOffsetMm === "" || input.arrowPassOffsetMm == null
      ? null
      : nonNegativeNumber(input.arrowPassOffsetMm, "出箭点距中心线");
    requireMeasuredAmericanOffset(bowType, manualOffsetMm);
    var useGripWidth = bowType === "shelfless_traditional" && gripWidthMm != null && gripWidthMm > 0;
    var arrowPassOffsetMm = useGripWidth
      ? gripWidthMm / 2
      : manualOffsetMm == null ? 0 : manualOffsetMm;
    if (bowType === "shelfless_traditional" && !useGripWidth && manualOffsetMm == null) {
      throw new Error("无台传统弓请测量弓把宽度，或直接填写出箭点距中心线");
    }
    var shaftClearanceIn = shaftLengthIn - drawLengthIn;
    if (shaftClearanceIn < 0) {
      throw new Error("箭杆长不能短于以箭尾喉口至弓把 pivot 测得的拉距");
    }
    var basicRecommendation = calculateBasicRecommendation(drawWeightLb, drawLengthIn);
    var centerDeflectionIn = basicRecommendation.centerDeflectionIn;
    var lowerDeflectionIn = basicRecommendation.lowerDeflectionIn;
    var upperDeflectionIn = basicRecommendation.upperDeflectionIn;
    return {
      source: "bare-shaft-chart-start",
      bowType: bowType,
      drawWeightLb: Number(drawWeightLb.toFixed(2)),
      drawLengthIn: Number(drawLengthIn.toFixed(3)),
      shaftLengthIn: Number(shaftLengthIn.toFixed(3)),
      shaftClearanceIn: Number(shaftClearanceIn.toFixed(3)),
      arrowPassOffsetMm: Number(arrowPassOffsetMm.toFixed(1)),
      offsetSource: useGripWidth ? "grip-width-half" : manualOffsetMm == null ? "center-shot-default" : "manual",
      centerDeflectionIn: Number(centerDeflectionIn.toFixed(3)),
      lowerDeflectionIn: Number(lowerDeflectionIn.toFixed(3)),
      upperDeflectionIn: Number(upperDeflectionIn.toFixed(3)),
      centerAtaSpine: Math.round(centerDeflectionIn * 1000),
      lowerAtaSpine: Math.round(lowerDeflectionIn * 1000),
      upperAtaSpine: Math.round(upperDeflectionIn * 1000),
      bandPercent: BASIC_RECOMMENDATION_BAND_PERCENT,
      effectiveDrawWeightLb: Number(drawWeightLb.toFixed(2)),
      offsetAdjustmentLb: 0
    };
  }

  function calculateHandleClearanceRanges(input) {
    var bowType = normalizeBowType(input.bowType);
    var drawWeightLb = positiveNumber(input.drawWeightLb, "实测满拉拉重");
    var drawLengthIn = positiveNumber(input.drawLengthIn, "实测拉距");
    var shaftLengthIn = positiveNumber(input.shaftLengthIn, "箭杆长");
    var gripWidthMm = input.gripWidthMm === "" || input.gripWidthMm == null
      ? null
      : nonNegativeNumber(input.gripWidthMm, "弓把宽度");
    var manualOffsetMm = input.arrowPassOffsetMm === "" || input.arrowPassOffsetMm == null
      ? null
      : nonNegativeNumber(input.arrowPassOffsetMm, "出箭点距中心线");
    requireMeasuredAmericanOffset(bowType, manualOffsetMm);
    var useGripWidth = bowType === "shelfless_traditional" && gripWidthMm != null && gripWidthMm > 0;
    var arrowPassOffsetMm = useGripWidth
      ? gripWidthMm / 2
      : manualOffsetMm == null ? 0 : manualOffsetMm;
    if (bowType === "shelfless_traditional" && !useGripWidth && manualOffsetMm == null) {
      throw new Error("无台传统弓请测量弓把宽度，或直接填写出箭点距中心线");
    }
    var shaftClearanceIn = shaftLengthIn - drawLengthIn;
    if (shaftClearanceIn < 0) {
      throw new Error("箭杆长不能短于以箭尾喉口至弓把 pivot 测得的拉距");
    }

    var offsetIn = arrowPassOffsetMm / MM_PER_INCH;
    var lateralForceLb = arrowPassOffsetMm === 0 ? 0 : drawWeightLb * offsetIn / drawLengthIn;
    var beamLengthFactor = Math.pow(shaftLengthIn / ATA_TEST_SPAN_IN, 3);
    var responseScale = lateralForceLb / ATA_TEST_LOAD_LB * beamLengthFactor;
    var materials = {};

    Object.keys(handleClearanceMaterials).forEach(function (key) {
      var settings = handleClearanceMaterials[key];
      if (arrowPassOffsetMm === 0) {
        materials[key] = {
          label: settings.label,
          dynamicDeflectionMinMm: 0,
          dynamicDeflectionMaxMm: 0,
          staticDeflectionMinIn: null,
          staticDeflectionMaxIn: null,
          ataSpineMin: null,
          ataSpineMax: null,
          assumedDiameterMm: settings.assumedDiameterMm,
          dynamicFactorMin: settings.dynamicFactorMin,
          dynamicFactorMax: settings.dynamicFactorMax,
          woodSpinePoundsMin: null,
          woodSpinePoundsMax: null
        };
        return;
      }

      var dynamicDeflectionMinMm = arrowPassOffsetMm + settings.assumedDiameterMm / 2;
      var dynamicDeflectionMaxMm = dynamicDeflectionMinMm + settings.extraClearanceMm;
      var staticDeflectionMinIn = dynamicDeflectionMinMm / MM_PER_INCH
        / (settings.dynamicFactorMax * responseScale);
      var staticDeflectionMaxIn = dynamicDeflectionMaxMm / MM_PER_INCH
        / (settings.dynamicFactorMin * responseScale);
      materials[key] = {
        label: settings.label,
        dynamicDeflectionMinMm: Number(dynamicDeflectionMinMm.toFixed(1)),
        dynamicDeflectionMaxMm: Number(dynamicDeflectionMaxMm.toFixed(1)),
        staticDeflectionMinIn: Number(staticDeflectionMinIn.toFixed(3)),
        staticDeflectionMaxIn: Number(staticDeflectionMaxIn.toFixed(3)),
        ataSpineMin: Math.round(staticDeflectionMinIn * 1000),
        ataSpineMax: Math.round(staticDeflectionMaxIn * 1000),
        assumedDiameterMm: settings.assumedDiameterMm,
        dynamicFactorMin: settings.dynamicFactorMin,
        dynamicFactorMax: settings.dynamicFactorMax,
        woodSpinePoundsMin: key === "wood" ? Number((26 / staticDeflectionMaxIn).toFixed(1)) : null,
        woodSpinePoundsMax: key === "wood" ? Number((26 / staticDeflectionMinIn).toFixed(1)) : null
      };
    });

    return {
      bowType: bowType,
      drawWeightLb: Number(drawWeightLb.toFixed(2)),
      drawLengthIn: Number(drawLengthIn.toFixed(3)),
      shaftLengthIn: Number(shaftLengthIn.toFixed(3)),
      shaftClearanceIn: Number(shaftClearanceIn.toFixed(3)),
      arrowPassOffsetMm: Number(arrowPassOffsetMm.toFixed(1)),
      offsetSource: useGripWidth ? "grip-width-half" : manualOffsetMm == null ? "center-shot-default" : "manual",
      lateralForceLb: Number(lateralForceLb.toFixed(3)),
      beamLengthFactor: Number(beamLengthFactor.toFixed(3)),
      noHandleClearanceRequired: arrowPassOffsetMm === 0,
      materials: materials
    };
  }

  function recommendPointWeightAdjustment(input) {
    var drawWeightLb = positiveNumber(input.drawWeightLb, "实测满拉拉重");
    var bareArrowWeightGr = positiveNumber(input.bareArrowWeightGr, "裸箭重量");
    var pointWeightGr = nonNegativeNumber(input.pointWeightGr, "箭头系统重量");
    var ataSpine = positiveNumber(input.ataSpine, "裸箭 ATA 静态挠度");
    var verticalFeedback = String(input.verticalFeedback || "center");
    var lateralFeedback = String(input.lateralFeedback || "neutral");
    if (["high", "center", "low"].indexOf(verticalFeedback) === -1) {
      throw new Error("纵向落点反馈必须为高、中或低");
    }
    if (["stiff", "neutral", "weak"].indexOf(lateralFeedback) === -1) {
      throw new Error("横向动态反馈必须为偏硬、中性或偏软");
    }
    var pointDeltaGr = verticalFeedback === "high" ? ARROW_WEIGHT_STEP_GR : verticalFeedback === "low" ? -ARROW_WEIGHT_STEP_GR : 0;
    var spineStep = verticalFeedback !== "center" && lateralFeedback !== "neutral" ? 100 : 50;
    var ataSpineDelta = lateralFeedback === "stiff" ? -spineStep : lateralFeedback === "weak" ? spineStep : 0;
    var targetPointWeightGr = pointWeightGr + pointDeltaGr;
    if (targetPointWeightGr < 0) {
      throw new Error("当前箭头系统重量不足以再减轻 25 gr；请改用更轻的可用组件或保持当前重量");
    }
    var currentFinishedArrowWeightGr = bareArrowWeightGr + pointWeightGr;
    var targetFinishedArrowWeightGr = bareArrowWeightGr + targetPointWeightGr;
    return {
      pointDeltaGr: pointDeltaGr,
      targetPointWeightGr: Number(targetPointWeightGr.toFixed(1)),
      currentFinishedArrowWeightGr: Number(currentFinishedArrowWeightGr.toFixed(1)),
      targetFinishedArrowWeightGr: Number(targetFinishedArrowWeightGr.toFixed(1)),
      currentGpp: Number((currentFinishedArrowWeightGr / drawWeightLb).toFixed(2)),
      targetGpp: Number((targetFinishedArrowWeightGr / drawWeightLb).toFixed(2)),
      ataSpineDelta: ataSpineDelta,
      targetAtaSpine: Math.round(ataSpine + ataSpineDelta),
      needsSpineChange: ataSpineDelta !== 0,
      feedback: { vertical: verticalFeedback, lateral: lateralFeedback }
    };
  }

  function estimateFinishedArrowWeight(input) {
    var bowType = normalizeBowType(input.bowType);
    var drawWeightLb = positiveNumber(input.drawWeightLb, "实测拉重");
    var shaftLengthIn = positiveNumber(input.shaftLengthIn, "箭杆长度");
    var staticDeflectionIn = input.ataSpine === "" || input.ataSpine == null
      ? positiveNumber(input.staticDeflectionIn, "静态挠度")
      : positiveNumber(input.ataSpine, "ATA 静态挠度") / 1000;
    var baseline = genericSpineBaselines[bowType];
    var manualOffsetMm = input.arrowPassOffsetMm === "" || input.arrowPassOffsetMm == null
      ? null
      : nonNegativeNumber(input.arrowPassOffsetMm, "出箭点距中心线");
    requireMeasuredAmericanOffset(bowType, manualOffsetMm);
    var arrowPassOffsetMm = manualOffsetMm == null ? 0 : manualOffsetMm;
    var lengthRatio = Math.pow(shaftLengthIn / GENERIC_BASE_SHAFT_LENGTH_IN, 3);
    var requiredEffectiveDrawWeightLb = GENERIC_BASE_DRAW_WEIGHT_LB
      * Math.pow(baseline.deflectionIn * lengthRatio / staticDeflectionIn, 1 / GENERIC_DRAW_WEIGHT_EXPONENT);
    var referenceFinishedArrowWeightGr = baseline.referenceGpp * drawWeightLb;
    var finishedArrowWeightGr = referenceFinishedArrowWeightGr
      + (requiredEffectiveDrawWeightLb - drawWeightLb) / EFFECTIVE_DRAW_PER_ARROW_WEIGHT_STEP_LB * ARROW_WEIGHT_STEP_GR;
    if (finishedArrowWeightGr <= 0) {
      throw new Error("该挠度与输入条件无法反算出正的成品箭重；请检查弓型、中心线偏差和静态挠度");
    }
    return {
      bowType: bowType,
      staticDeflectionIn: Number(staticDeflectionIn.toFixed(3)),
      ataSpine: Math.round(staticDeflectionIn * 1000),
      shaftLengthIn: Number(shaftLengthIn.toFixed(3)),
      drawWeightLb: Number(drawWeightLb.toFixed(2)),
      arrowPassOffsetMm: Number(arrowPassOffsetMm.toFixed(1)),
      finishedArrowWeightGr: Number(finishedArrowWeightGr.toFixed(1)),
      gpp: Number((finishedArrowWeightGr / drawWeightLb).toFixed(2)),
      requiredEffectiveDrawWeightLb: Number(requiredEffectiveDrawWeightLb.toFixed(2)),
      referenceFinishedArrowWeightGr: Number(referenceFinishedArrowWeightGr.toFixed(1)),
      offsetAdjustmentLb: 0
    };
  }

  function calculateArrowBuild(input) {
    var bowType = normalizeBowType(input.bowType);
    var drawWeightLb = positiveNumber(input.drawWeightLb, "实测拉重");
    var drawLengthAmoIn = input.drawLengthAmoIn === "" || input.drawLengthAmoIn == null ? null : positiveNumber(input.drawLengthAmoIn, "AMO 拉距");
    var shaftLengthIn = input.shaftLengthIn === "" || input.shaftLengthIn == null
      ? positiveNumber(drawLengthAmoIn, "AMO 拉距") + 1
      : positiveNumber(input.shaftLengthIn, "箭杆长度");
    var shaftGpi = positiveNumber(input.shaftGpi, "箭杆 GPI");
    var pointSystemWeightGr = nonNegativeNumber(input.pointSystemWeightGr, "箭头系统重量");
    var rearComponentsWeightGr = nonNegativeNumber(input.rearComponentsWeightGr, "尾部组件重量");
    var finishedArrowWeightGr = shaftLengthIn * shaftGpi + pointSystemWeightGr + rearComponentsWeightGr;
    var staticDeflectionIn = input.staticDeflectionIn === "" || input.staticDeflectionIn == null ? null : positiveNumber(input.staticDeflectionIn, "静态挠度");
    var manufacturerMinGpp = input.manufacturerMinGpp === "" || input.manufacturerMinGpp == null ? null : positiveNumber(input.manufacturerMinGpp, "厂家最低 GPP");
    var estimatedSpine = estimateStaticSpine({
      bowType: bowType,
      drawWeightLb: drawWeightLb,
      shaftLengthIn: shaftLengthIn,
      finishedArrowWeightGr: finishedArrowWeightGr,
      arrowPassOffsetMm: input.arrowPassOffsetMm
    });
    return {
      bowType: bowType,
      drawWeightLb: Number(drawWeightLb.toFixed(2)),
      drawLengthAmoIn: drawLengthAmoIn == null ? null : Number(drawLengthAmoIn.toFixed(3)),
      recommendedTestShaftLengthIn: drawLengthAmoIn == null ? null : Number((drawLengthAmoIn + 1).toFixed(3)),
      shaftLengthIn: Number(shaftLengthIn.toFixed(3)),
      shaftWeightGr: Number((shaftLengthIn * shaftGpi).toFixed(1)),
      pointSystemWeightGr: Number(pointSystemWeightGr.toFixed(1)),
      rearComponentsWeightGr: Number(rearComponentsWeightGr.toFixed(1)),
      finishedArrowWeightGr: Number(finishedArrowWeightGr.toFixed(1)),
      gpp: Number((finishedArrowWeightGr / drawWeightLb).toFixed(2)),
      manufacturerMinGpp: manufacturerMinGpp,
      minimumWeightPasses: manufacturerMinGpp == null ? null : finishedArrowWeightGr / drawWeightLb >= manufacturerMinGpp,
      minimumPointSystemWeightGr: manufacturerMinGpp == null ? null : Number(Math.max(0, manufacturerMinGpp * drawWeightLb - shaftLengthIn * shaftGpi - rearComponentsWeightGr).toFixed(1)),
      staticDeflectionIn: staticDeflectionIn == null ? null : Number(staticDeflectionIn.toFixed(3)),
      ataSpine: staticDeflectionIn == null ? null : Math.round(staticDeflectionIn * 1000),
      flexuralRigidityLbIn2: staticDeflectionIn == null ? null : Number((1.94 * Math.pow(28, 3) / (48 * staticDeflectionIn)).toFixed(2)),
      estimatedSpine: estimatedSpine,
      chartEffectiveDrawWeightLb: estimatedSpine.effectiveDrawWeightLb,
      chartNextStep: chartNextStep(bowType)
    };
  }

  function calculateStaticSpineScreening(input) {
    var referenceDeflectionIn = input.referenceAtaSpine === "" || input.referenceAtaSpine == null
      ? positiveNumber(input.referenceDeflectionIn, "基准箭静态挠度")
      : positiveNumber(input.referenceAtaSpine, "基准箭 ATA 挠度") / 1000;
    if (referenceDeflectionIn > 2) {
      throw new Error("基准箭静态挠度必须以英寸填写（例如 0.600），或改填 ATA 挠度编号（例如 600）");
    }
    var referenceShaftLengthIn = positiveNumber(input.referenceShaftLengthIn, "基准箭杆长");
    var referenceDrawWeightLb = positiveNumber(input.referenceDrawWeightLb, "基准箭实测拉重");
    var targetShaftLengthIn = positiveNumber(input.targetShaftLengthIn, "测试箭杆长");
    var targetDrawWeightLb = positiveNumber(input.targetDrawWeightLb, "目标实测拉重");
    var bandPercent = positiveNumber(input.bandPercent, "筛选范围");
    if (bandPercent >= 100) {
      throw new Error("筛选范围必须小于 100%");
    }

    // First-order beam scaling: EI demand tracks draw force and L^3.
    var centerDeflectionIn = referenceDeflectionIn * referenceDrawWeightLb / targetDrawWeightLb * Math.pow(targetShaftLengthIn / referenceShaftLengthIn, 3);
    var lowerDeflectionIn = centerDeflectionIn * (1 - bandPercent / 100);
    var upperDeflectionIn = centerDeflectionIn * (1 + bandPercent / 100);
    return {
      centerDeflectionIn: Number(centerDeflectionIn.toFixed(3)),
      lowerDeflectionIn: Number(lowerDeflectionIn.toFixed(3)),
      upperDeflectionIn: Number(upperDeflectionIn.toFixed(3)),
      centerAtaSpine: Math.round(centerDeflectionIn * 1000),
      lowerAtaSpine: Math.round(lowerDeflectionIn * 1000),
      upperAtaSpine: Math.round(upperDeflectionIn * 1000),
      bandPercent: Number(bandPercent.toFixed(1))
    };
  }

  function recommendEquipment(input) {
    var bowType = input.bowType;
    bowType = normalizeBowType(bowType);
    var drawWeightLb = Number(input.drawWeightLb);
    var drawLengthAmoIn = Number(input.drawLengthAmoIn);
    positiveNumber(drawWeightLb, "拉重");
    positiveNumber(drawLengthAmoIn, "AMO 拉距");
    var arrowPassOffsetMm = input.arrowPassOffsetMm === "" || input.arrowPassOffsetMm == null ? null : nonNegativeNumber(input.arrowPassOffsetMm, "出箭点距中心线");
    var tuning = baselineTuning[bowType];

    return {
      bowType: bowType,
      drawWeightLb: drawWeightLb,
      drawLengthAmoIn: drawLengthAmoIn,
      testShaftLengthIn: Number((drawLengthAmoIn + 1).toFixed(2)),
      arrowPassOffsetMm: arrowPassOffsetMm,
      chartInputs: bowType === "compound"
        ? "实测峰值拉重、实测箭长、箭头+insert 总重、凸轮/弦距、撒放方式、具体箭杆型号"
        : "实测拉重、实测箭长、箭头+insert 总重、具体箭杆型号",
      rest: tuning.rest,
      nockingPoint: tuning.nockingPoint,
      centerShot: tuning.centerShot,
      spineScreening: input.spineScreening || null,
      validation: "满拉测量箭长；由厂商 chart 选档；用裸杆或纸调验证后再裁箭/购买整套。"
    };
  }

  function buildEquipmentMatrix(input) {
    var drawWeights = parseNumberList(input.drawWeights);
    var drawLengths = parseNumberList(input.drawLengths);
    var rows = [];
    var hasReferenceArrow = [
      input.referenceAtaSpine || input.referenceDeflectionIn,
      input.referenceShaftLengthIn,
      input.referenceDrawWeightLb
    ].every(function (value) { return String(value == null ? "" : value).trim() !== ""; });
    drawWeights.forEach(function (drawWeight) {
      drawLengths.forEach(function (drawLength) {
        var testShaftLengthIn = drawLength + 1;
        var spineScreening = hasReferenceArrow ? calculateStaticSpineScreening({
          referenceAtaSpine: input.referenceAtaSpine,
          referenceDeflectionIn: input.referenceDeflectionIn,
          referenceShaftLengthIn: input.referenceShaftLengthIn,
          referenceDrawWeightLb: input.referenceDrawWeightLb,
          targetShaftLengthIn: testShaftLengthIn,
          targetDrawWeightLb: drawWeight,
          bandPercent: input.screeningBandPercent || 12.5
        }) : estimateBareShaftSpine({
          bowType: input.bowType,
          drawWeightLb: drawWeight,
          drawLengthIn: drawLength,
          shaftLengthIn: testShaftLengthIn,
          arrowPassOffsetMm: input.arrowPassOffsetMm
        });
        spineScreening.source = hasReferenceArrow ? "calibrated" : "generic";
        rows.push(recommendEquipment({
          bowType: input.bowType,
          drawWeightLb: drawWeight,
          drawLengthAmoIn: drawLength,
          arrowPassOffsetMm: input.arrowPassOffsetMm,
          spineScreening: spineScreening
        }));
      });
    });
    return rows;
  }

  window.ArcherModel = {
    createSession: createSession,
    createShot: createShot,
    buildEquipmentMatrix: buildEquipmentMatrix,
    calculateStaticSpineScreening: calculateStaticSpineScreening,
    calculateHandleClearanceRanges: calculateHandleClearanceRanges,
    analyzeDynamicSpine: analyzeDynamicSpine,
    grainsToGrams: grainsToGrams,
    gramsToGrains: gramsToGrains,
    kilogramsToPounds: kilogramsToPounds,
    poundsToKilograms: poundsToKilograms,
    inchesToMillimeters: inchesToMillimeters,
    millimetersToInches: millimetersToInches,
    ataSpineToMillimeters: ataSpineToMillimeters,
    millimetersToAtaSpine: millimetersToAtaSpine,
    calculateShaftSection: calculateShaftSection,
    estimateBareShaftSpine: estimateBareShaftSpine,
    estimateStaticSpine: estimateStaticSpine,
    estimateFinishedArrowWeight: estimateFinishedArrowWeight,
    recommendPointWeightAdjustment: recommendPointWeightAdjustment,
    scoreShot: scoreShot,
    calculateArrowBuild: calculateArrowBuild,
    summarizeShots: summarizeShots,
    toCsv: toCsv
  };
})();
