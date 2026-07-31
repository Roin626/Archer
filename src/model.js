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
      rest: "shelf/鐨彴",
      nockingPoint: "+1/4 鍒?+1/2 in",
      centerShot: "鏈夊紦绐楃編寮忕寧寮擄紝鎸夊紦绐楃涓績绋嬪害閫夋嫨鐩搁偦 spine 璇曠"
    },
    barebow: {
      rest: "纾佹€х鍙?+ 涓瓑鍘嬪姏 plunger",
      nockingPoint: "+1/8 鍒?+1/4 in",
      centerShot: "绠皷鐣ュ湪寮︾嚎澶栦晶锛屾寜瑁告潌涓績寰皟"
    },
    compound: {
      rest: "drop-away 鎴?blade rest",
      nockingPoint: "姘村钩鍒?+1/8 in",
      centerShot: "浠庡巶瀹朵腑蹇冨皠鍑鸿捣姝ワ紝鍐嶇敤绾歌皟/璧扮嚎寰皟"
    },
    olympic_recurve: {
      rest: "纾佹€х鍙?+ 涓瓑鍘嬪姏 plunger",
      nockingPoint: "+1/8 鍒?+1/4 in",
      centerShot: "绠皷鐣ュ湪寮︾嚎澶栦晶锛屽厛瑁告潌鍐?walk-back"
    },
    shelfless_traditional: {
      rest: "鏃犲紦绐楋紝鎼鎵?铏庡彛渚?,
      nockingPoint: "+3/8 鍒?+3/4 in",
      centerShot: "鏃犲彴浼犵粺寮擄紝娴嬮噺鍑虹鐐硅窛涓績绾垮苟鐢ㄧ浉閭?spine 璇曠"
    }
  };

  function normalizeBowType(bowType) {
    var normalized = String(bowType || "").trim().toLowerCase();
    var bowType = bowTypeAliases[normalized] || normalized;
    if (["american_hunting", "barebow", "compound", "olympic_recurve", "shelfless_traditional"].indexOf(bowType) === -1) {
      throw new Error("涓嶆敮鎸佺殑寮撳瀷: " + bowType);
    }
    return bowType;
  }

  function parseNumberList(raw) {
    var text = String(raw || "").trim();
    if (!text) {
      throw new Error("璇疯緭鍏ユ暟鍊?);
    }
    if (text.indexOf(":") !== -1) {
      var parts = text.split(":").map(function (part) { return Number(part); });
      if (parts.length !== 3 || parts.some(function (value) { return !Number.isFinite(value); })) {
        throw new Error("鑼冨洿鏍煎紡搴斾负 start:stop:step");
      }
      if (parts[2] <= 0) {
        throw new Error("鑼冨洿姝ラ暱蹇呴』澶т簬 0");
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
      throw new Error("璇疯緭鍏ラ€楀彿鍒嗛殧鏁板€?);
    }
    return parsed;
  }

  function positiveNumber(value, label) {
    var number = Number(value);
    if (!Number.isFinite(number) || number <= 0) {
      throw new Error(label + "蹇呴』澶т簬 0");
    }
    return number;
  }

  function nonNegativeNumber(value, label) {
    var number = Number(value || 0);
    if (!Number.isFinite(number) || number < 0) {
      throw new Error(label + "涓嶈兘涓鸿礋鏁?);
    }
    return number;
  }

  function chartNextStep(bowType) {
    if (bowType === "compound") {
      return "鐢ㄦ墍閫夌鏉嗗巶鍟嗙殑澶嶅悎寮?chart锛氬疄娴嬪嘲鍊兼媺閲嶃€佺闀裤€佹€荤澶寸郴缁熼噸閲忋€佸嚫杞?寮﹁窛銆佹拻鏀炬柟寮忋€?;
    }
    if (bowType === "shelfless_traditional") {
      return "璁板綍婊℃媺瀹炴祴鎷夐噸銆佸嚭绠偣璺濅腑蹇冪嚎鍜岀闀匡紱鎸夋墍閫夊巶鍟嗕紶缁熷紦 chart 鍙栫浉閭讳袱妗ｈ瘯绠紝鍐嶇敤瑁告潌楠岃瘉銆?;
    }
    return "鐢ㄦ墍閫夌鏉嗗巶鍟嗙殑 chart锛氬疄娴嬫媺閲嶃€佸叾瀹氫箟鐨勭闀裤€佹€荤澶寸郴缁熼噸閲忥紱鍐嶄互瑁告潌鎴栫焊璋冮獙璇併€?;
  }

  function calculateArrowBuild(input) {
    var bowType = normalizeBowType(input.bowType);
    var drawWeightLb = positiveNumber(input.drawWeightLb, "瀹炴祴鎷夐噸");
    var shaftLengthIn = positiveNumber(input.shaftLengthIn, "绠潌闀垮害");
    var shaftGpi = positiveNumber(input.shaftGpi, "绠潌 GPI");
    var pointSystemWeightGr = nonNegativeNumber(input.pointSystemWeightGr, "绠ご绯荤粺閲嶉噺");
    var rearComponentsWeightGr = nonNegativeNumber(input.rearComponentsWeightGr, "灏鹃儴缁勪欢閲嶉噺");
    var finishedArrowWeightGr = shaftLengthIn * shaftGpi + pointSystemWeightGr + rearComponentsWeightGr;
    var staticDeflectionIn = input.staticDeflectionIn === "" || input.staticDeflectionIn == null ? null : positiveNumber(input.staticDeflectionIn, "闈欐€佹尃搴?);
    var manufacturerMinGpp = input.manufacturerMinGpp === "" || input.manufacturerMinGpp == null ? null : positiveNumber(input.manufacturerMinGpp, "鍘傚鏈€浣?GPP");
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
    positiveNumber(drawWeightLb, "鎷夐噸");
    positiveNumber(drawLengthAmoIn, "AMO 鎷夎窛");
    var arrowPassOffsetMm = input.arrowPassOffsetMm === "" || input.arrowPassOffsetMm == null ? null : nonNegativeNumber(input.arrowPassOffsetMm, "鍑虹鐐硅窛涓績绾?);
    var tuning = baselineTuning[bowType];

    return {
      bowType: bowType,
      drawWeightLb: drawWeightLb,
      drawLengthAmoIn: drawLengthAmoIn,
      testShaftLengthIn: Number((drawLengthAmoIn + 1).toFixed(2)),
      arrowPassOffsetMm: arrowPassOffsetMm,
      chartInputs: bowType === "compound"
        ? "瀹炴祴宄板€兼媺閲嶃€佸疄娴嬬闀裤€佺澶?insert 鎬婚噸銆佸嚫杞?寮﹁窛銆佹拻鏀炬柟寮忋€佸叿浣撶鏉嗗瀷鍙?
        : "瀹炴祴鎷夐噸銆佸疄娴嬬闀裤€佺澶?insert 鎬婚噸銆佸叿浣撶鏉嗗瀷鍙?,
      rest: tuning.rest,
      nockingPoint: tuning.nockingPoint,
      centerShot: tuning.centerShot,
      validation: "婊℃媺娴嬮噺绠暱锛涚敱鍘傚晢 chart 閫夋。锛涚敤瑁告潌鎴栫焊璋冮獙璇佸悗鍐嶈绠?璐拱鏁村銆?
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

