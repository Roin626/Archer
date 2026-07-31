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
      centerShot: "有弓窗美式猎弓，按弓窗离中心程度选择相邻 spine 试箭"
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
      centerShot: "无台传统弓，测量出箭点距中心线并用相邻 spine 试箭"
    }
  };

  function normalizeBowType(bowType) {
    var normalized = String(bowType || "").trim().toLowerCase();
    var bowType = bowTypeAliases[normalized] || normalized;
    if (["american_hunting", "barebow", "compound", "olympic_recurve", "shelfless_traditional"].indexOf(bowType) === -1) {
      throw new Error("不支持的弓型: " + bowType);
    }
    return bowType;
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

  function chartNextStep(bowType) {
    if (bowType === "compound") {
      return "用所选箭杆厂商的复合弓 chart：实测峰值拉重、箭长、总箭头系统重量、凸轮/弦距、撒放方式。";
    }
    if (bowType === "shelfless_traditional") {
      return "记录满拉实测拉重、出箭点距中心线和箭长；按所选厂商传统弓 chart 取相邻两档试箭，再用裸杆验证。";
    }
    return "用所选箭杆厂商的 chart：实测拉重、其定义的箭长、总箭头系统重量；再以裸杆或纸调验证。";
  }

  function calculateArrowBuild(input) {
    var bowType = normalizeBowType(input.bowType);
    var drawWeightLb = positiveNumber(input.drawWeightLb, "实测拉重");
    var shaftLengthIn = positiveNumber(input.shaftLengthIn, "箭杆长度");
    var shaftGpi = positiveNumber(input.shaftGpi, "箭杆 GPI");
    var pointSystemWeightGr = nonNegativeNumber(input.pointSystemWeightGr, "箭头系统重量");
    var rearComponentsWeightGr = nonNegativeNumber(input.rearComponentsWeightGr, "尾部组件重量");
    var finishedArrowWeightGr = shaftLengthIn * shaftGpi + pointSystemWeightGr + rearComponentsWeightGr;
    var staticDeflectionIn = input.staticDeflectionIn === "" || input.staticDeflectionIn == null ? null : positiveNumber(input.staticDeflectionIn, "静态挠度");
    var manufacturerMinGpp = input.manufacturerMinGpp === "" || input.manufacturerMinGpp == null ? null : positiveNumber(input.manufacturerMinGpp, "厂家最低 GPP");
    var chartEffectiveDrawWeightLb = drawWeightLb;
    if (bowType === "compound" && pointSystemWeightGr > 100) {
      chartEffectiveDrawWeightLb += (pointSystemWeightGr - 100) / 25 * 3;
    }
    return {
      bowType: bowType,
      drawWeightLb: Number(drawWeightLb.toFixed(2)),
      shaftLengthIn: Number(shaftLengthIn.toFixed(3)),
      shaftWeightGr: Number((shaftLengthIn * shaftGpi).toFixed(1)),
      pointSystemWeightGr: Number(pointSystemWeightGr.toFixed(1)),
      rearComponentsWeightGr: Number(rearComponentsWeightGr.toFixed(1)),
      finishedArrowWeightGr: Number(finishedArrowWeightGr.toFixed(1)),
      gpp: Number((finishedArrowWeightGr / drawWeightLb).toFixed(2)),
      manufacturerMinGpp: manufacturerMinGpp,
      minimumWeightPasses: manufacturerMinGpp == null ? null : finishedArrowWeightGr / drawWeightLb >= manufacturerMinGpp,
      staticDeflectionIn: staticDeflectionIn == null ? null : Number(staticDeflectionIn.toFixed(3)),
      ataSpine: staticDeflectionIn == null ? null : Math.round(staticDeflectionIn * 1000),
      flexuralRigidityLbIn2: staticDeflectionIn == null ? null : Number((1.94 * Math.pow(28, 3) / (48 * staticDeflectionIn)).toFixed(2)),
      chartEffectiveDrawWeightLb: Number(chartEffectiveDrawWeightLb.toFixed(2)),
      chartNextStep: chartNextStep(bowType)
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
      validation: "满拉测量箭长；由厂商 chart 选档；用裸杆或纸调验证后再裁箭/购买整套。"
    };
  }

  function buildEquipmentMatrix(input) {
    var drawWeights = parseNumberList(input.drawWeights);
    var drawLengths = parseNumberList(input.drawLengths);
    var rows = [];
    drawWeights.forEach(function (drawWeight) {
      drawLengths.forEach(function (drawLength) {
        rows.push(recommendEquipment({
          bowType: input.bowType,
          drawWeightLb: drawWeight,
          drawLengthAmoIn: drawLength,
          arrowPassOffsetMm: input.arrowPassOffsetMm
        }));
      });
    });
    return rows;
  }

  window.ArcherModel = {
    createSession: createSession,
    createShot: createShot,
    buildEquipmentMatrix: buildEquipmentMatrix,
    scoreShot: scoreShot,
    calculateArrowBuild: calculateArrowBuild,
    summarizeShots: summarizeShots,
    toCsv: toCsv
  };
})();
