(function () {
  var session = null;
  var elements = {};

  document.addEventListener("DOMContentLoaded", init);

  function init() {
    elements = {
      form: document.getElementById("sessionForm"),
      bowType: document.getElementById("bowType"),
      distanceValue: document.getElementById("distanceValue"),
      distanceUnit: document.getElementById("distanceUnit"),
      targetSizeCm: document.getElementById("targetSizeCm"),
      ringCount: document.getElementById("ringCount"),
      setupNotes: document.getElementById("setupNotes"),
      conditionNotes: document.getElementById("conditionNotes"),
      goal: document.getElementById("goal"),
      shotKind: document.getElementById("shotKind"),
      shotNote: document.getElementById("shotNote"),
      target: document.getElementById("target"),
      summary: document.getElementById("summary"),
      shotTable: document.getElementById("shotTable"),
      newSessionButton: document.getElementById("newSessionButton"),
      saveButton: document.getElementById("saveButton"),
      undoButton: document.getElementById("undoButton"),
      clearButton: document.getElementById("clearButton"),
      jsonButton: document.getElementById("jsonButton"),
      csvButton: document.getElementById("csvButton"),
      tuningBowType: document.getElementById("tuningBowType"),
      tuningArrowMaterial: document.getElementById("tuningArrowMaterial"),
      tuningDrawWeight: document.getElementById("tuningDrawWeight"),
      tuningDrawLength: document.getElementById("tuningDrawLength"),
      tuningShaftLength: document.getElementById("tuningShaftLength"),
      tuningShaftDiameter: document.getElementById("tuningShaftDiameter"),
      tuningShaftInnerDiameter: document.getElementById("tuningShaftInnerDiameter"),
      tuningGripWidth: document.getElementById("tuningGripWidth"),
      tuningArrowPassOffset: document.getElementById("tuningArrowPassOffset"),
      tuningBareArrowWeight: document.getElementById("tuningBareArrowWeight"),
      tuningPointWeight: document.getElementById("tuningPointWeight"),
      tuningAtaSpine: document.getElementById("tuningAtaSpine"),
      tuningButton: document.getElementById("tuningButton"),
      tuningError: document.getElementById("tuningError"),
      currentDynamicSummary: document.getElementById("currentDynamicSummary"),
      recommendedSpineSummary: document.getElementById("recommendedSpineSummary"),
      fixedShaftSummary: document.getElementById("fixedShaftSummary"),
      grainsInput: document.getElementById("grainsInput"),
      gramsInput: document.getElementById("gramsInput"),
      kilogramsInput: document.getElementById("kilogramsInput"),
      poundsInput: document.getElementById("poundsInput"),
      inchesInput: document.getElementById("inchesInput"),
      millimetersInput: document.getElementById("millimetersInput")
    };

    bindEvents();
    session = window.ArcherStorage.loadSession() || window.ArcherModel.createSession(readForm());
    writeForm(session);
    render();
    updateMaterialDefaults();
    renderDynamicSpineAnalysis();
    updateGramsFromGrains();
    updatePoundsFromKilograms();
    updateMillimetersFromInches();
  }

  function bindEvents() {
    elements.newSessionButton.addEventListener("click", function () {
      session = window.ArcherModel.createSession(readForm());
      persistAndRender();
    });

    elements.saveButton.addEventListener("click", function () {
      updateSessionFromForm();
      persistAndRender();
    });

    elements.undoButton.addEventListener("click", function () {
      session.shots.pop();
      persistAndRender();
    });

    elements.clearButton.addEventListener("click", function () {
      session.shots = [];
      persistAndRender();
    });

    elements.target.addEventListener("click", recordShot);

    elements.jsonButton.addEventListener("click", function () {
      updateSessionFromForm();
      download("archer-session-" + session.id + ".json", JSON.stringify(session, null, 2), "application/json");
    });

    elements.csvButton.addEventListener("click", function () {
      updateSessionFromForm();
      download("archer-session-" + session.id + ".csv", window.ArcherModel.toCsv(session), "text/csv");
    });

    elements.tuningButton.addEventListener("click", renderDynamicSpineAnalysis);
    elements.tuningArrowMaterial.addEventListener("change", updateMaterialDefaults);
    elements.grainsInput.addEventListener("input", updateGramsFromGrains);
    elements.gramsInput.addEventListener("input", updateGrainsFromGrams);
    elements.kilogramsInput.addEventListener("input", updatePoundsFromKilograms);
    elements.poundsInput.addEventListener("input", updateKilogramsFromPounds);
    elements.inchesInput.addEventListener("input", updateMillimetersFromInches);
    elements.millimetersInput.addEventListener("input", updateInchesFromMillimeters);
  }

  function updateGramsFromGrains() {
    syncConversion(elements.grainsInput, elements.gramsInput, window.ArcherModel.grainsToGrams);
  }

  function updateGrainsFromGrams() {
    syncConversion(elements.gramsInput, elements.grainsInput, window.ArcherModel.gramsToGrains);
  }

  function updatePoundsFromKilograms() {
    syncConversion(elements.kilogramsInput, elements.poundsInput, window.ArcherModel.kilogramsToPounds);
  }

  function updateKilogramsFromPounds() {
    syncConversion(elements.poundsInput, elements.kilogramsInput, window.ArcherModel.poundsToKilograms);
  }

  function updateMillimetersFromInches() {
    syncConversion(elements.inchesInput, elements.millimetersInput, window.ArcherModel.inchesToMillimeters);
  }

  function updateInchesFromMillimeters() {
    syncConversion(elements.millimetersInput, elements.inchesInput, window.ArcherModel.millimetersToInches);
  }

  function updateMaterialDefaults() {
    var material = elements.tuningArrowMaterial.value;
    if (material === "carbon") {
      elements.tuningShaftDiameter.value = "7.1";
      elements.tuningShaftInnerDiameter.value = "6.2";
      elements.tuningShaftInnerDiameter.disabled = false;
    } else if (material === "bamboo") {
      elements.tuningShaftDiameter.value = "8";
      elements.tuningShaftInnerDiameter.value = "4";
      elements.tuningShaftInnerDiameter.disabled = false;
    } else {
      elements.tuningShaftDiameter.value = "8";
      elements.tuningShaftInnerDiameter.value = "0";
      elements.tuningShaftInnerDiameter.disabled = true;
    }
  }

  function syncConversion(source, target, convert) {
    if (source.value.trim() === "") {
      source.setCustomValidity("");
      target.value = "";
      return;
    }
    try {
      target.value = formatConversionValue(convert(source.value));
      source.setCustomValidity("");
    } catch (error) {
      target.value = "";
      source.setCustomValidity(error.message);
    }
  }

  function formatConversionValue(value) {
    return String(Number(value.toFixed(6)));
  }

  function readForm() {
    return {
      bowType: elements.bowType.value,
      distanceValue: elements.distanceValue.value,
      distanceUnit: elements.distanceUnit.value,
      targetSizeCm: elements.targetSizeCm.value,
      ringCount: elements.ringCount.value,
      setupNotes: elements.setupNotes.value,
      conditionNotes: elements.conditionNotes.value,
      goal: elements.goal.value
    };
  }

  function writeForm(value) {
    elements.bowType.value = value.bowType;
    elements.distanceValue.value = value.distanceValue;
    elements.distanceUnit.value = value.distanceUnit;
    elements.targetSizeCm.value = value.targetSizeCm;
    elements.ringCount.value = value.ringCount;
    elements.setupNotes.value = value.setupNotes;
    elements.conditionNotes.value = value.conditionNotes;
    elements.goal.value = value.goal;
  }

  function updateSessionFromForm() {
    var form = readForm();
    session.bowType = form.bowType;
    session.distanceValue = Number(form.distanceValue);
    session.distanceUnit = form.distanceUnit;
    session.targetSizeCm = Number(form.targetSizeCm);
    session.ringCount = Number(form.ringCount);
    session.setupNotes = form.setupNotes;
    session.conditionNotes = form.conditionNotes;
    session.goal = form.goal;
  }

  function recordShot(event) {
    updateSessionFromForm();
    var rect = elements.target.getBoundingClientRect();
    var x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    var y = -(((event.clientY - rect.top) / rect.height) * 2 - 1);
    var score = window.ArcherModel.scoreShot(x, y, session.ringCount);
    var shot = window.ArcherModel.createShot(
      session.shots.length + 1,
      elements.shotKind.value,
      x,
      y,
      score,
      elements.shotNote.value
    );
    session.shots.push(shot);
    elements.shotNote.value = "";
    persistAndRender();
  }

  function persistAndRender() {
    window.ArcherStorage.saveSession(session);
    render();
  }

  function render() {
    renderTarget();
    renderSummary();
    renderTable();
  }

  function renderTarget() {
    elements.target.querySelectorAll(".shot-dot").forEach(function (node) {
      node.remove();
    });

    session.shots.forEach(function (shot) {
      var dot = document.createElement("span");
      dot.className = "shot-dot " + shot.kind;
      dot.textContent = shot.index;
      dot.style.left = ((shot.x + 1) / 2 * 100) + "%";
      dot.style.top = ((1 - shot.y) / 2 * 100) + "%";
      elements.target.appendChild(dot);
    });
  }

  function renderSummary() {
    var summary = window.ArcherModel.summarizeShots(session.shots);
    var kindLines = Object.keys(summary.byKind).map(function (kind) {
      var group = summary.byKind[kind];
      return kind + ": " + group.count + " 支, 中心 (" + group.centerX + ", " + group.centerY + ")";
    });

    elements.summary.innerHTML = "";
    addSummaryRow("Session", session.id);
    addSummaryRow("距离", session.distanceValue + session.distanceUnit);
    addSummaryRow("箭数", summary.count);
    addSummaryRow("均分", summary.averageScore || "-");
    addSummaryRow("中心", "(" + summary.centerX + ", " + summary.centerY + ")");
    addSummaryRow("平均半径", summary.averageRadius);
    addSummaryRow("最大半径", summary.maxRadius);
    addSummaryRow("分类中心", kindLines.length ? kindLines.join("；") : "-");
  }

  function addSummaryRow(label, value) {
    var term = document.createElement("dt");
    var detail = document.createElement("dd");
    term.textContent = label;
    detail.textContent = value;
    elements.summary.appendChild(term);
    elements.summary.appendChild(detail);
  }

  function renderTable() {
    elements.shotTable.innerHTML = "";
    session.shots.slice().reverse().forEach(function (shot) {
      var row = document.createElement("tr");
      [shot.index, shot.kind, shot.score, shot.x, shot.y, shot.note].forEach(function (value) {
        var cell = document.createElement("td");
        cell.textContent = value;
        row.appendChild(cell);
      });
      elements.shotTable.appendChild(row);
    });
  }

  function renderDynamicSpineAnalysis() {
    try {
      var result = window.ArcherModel.analyzeDynamicSpine({
        bowType: elements.tuningBowType.value,
        arrowMaterial: elements.tuningArrowMaterial.value,
        drawWeightLb: elements.tuningDrawWeight.value,
        drawLengthIn: elements.tuningDrawLength.value,
        shaftLengthIn: elements.tuningShaftLength.value,
        shaftDiameterMm: elements.tuningShaftDiameter.value,
        shaftInnerDiameterMm: elements.tuningShaftInnerDiameter.value,
        gripWidthMm: elements.tuningGripWidth.value,
        arrowPassOffsetMm: elements.tuningArrowPassOffset.value,
        bareArrowWeightGr: elements.tuningBareArrowWeight.value,
        pointWeightGr: elements.tuningPointWeight.value,
        ataSpine: elements.tuningAtaSpine.value
      });
      elements.tuningError.textContent = "";
      elements.currentDynamicSummary.innerHTML = "";
      elements.recommendedSpineSummary.innerHTML = "";
      elements.fixedShaftSummary.innerHTML = "";
      renderCurrentDynamic(result);
      renderDynamicRecommendation(result);
      renderFixedShaftAdjustments(result);
    } catch (error) {
      elements.tuningError.textContent = error.message;
      elements.currentDynamicSummary.innerHTML = "";
      elements.recommendedSpineSummary.innerHTML = "";
      elements.fixedShaftSummary.innerHTML = "";
    }
  }

  function renderCurrentDynamic(result) {
    var list = elements.currentDynamicSummary;
    addDefinitionRow(list, "器材", result.bowLabel + " / " + result.materialLabel);
    addDefinitionRow(list, "成品箭重 / GPP", formatNumber(result.finishedArrowWeightGr, 1) + " gr / " + formatNumber(result.gpp, 2));
    addDefinitionRow(list, "当前静态挠度", "ATA " + result.ataSpine + "（静态测试位移 " + formatNumber(window.ArcherModel.ataSpineToMillimeters(result.ataSpine), 2) + " mm）");
    addDefinitionRow(list, "预测动态挠度", formatDynamicDeflectionRange(result.current.dynamicDeflectionMinMm, result.current.dynamicDeflectionMaxMm));
    addDefinitionRow(list, "出箭点中心线", formatNumber(result.arrowPassOffsetMm, 1) + " mm（" + offsetSourceLabel(result.offsetSource) + "）");
    addDefinitionRow(list, "当前匹配", currentMatchLabel(result));
  }

  function renderDynamicRecommendation(result) {
    var list = elements.recommendedSpineSummary;
    var recommendation = result.recommendation;
    addDefinitionRow(list, "基础裸箭挠度推荐（100 gr 基准）", formatSpineRange(recommendation.empiricalLowerIn, recommendation.empiricalUpperIn));
    addDefinitionRow(list, "常见成品挠度候选", recommendation.productAtaCandidates.map(function (value) {
      return "ATA " + value;
    }).join("、") + "（购买前核对厂商规格）");
    if (recommendation.hasClearanceConstraint) {
      addDefinitionRow(list, "避开弓把最低动态侧移", "≥ " + formatNumber(recommendation.requiredDynamicMinMm, 1) + " mm");
    } else {
      addDefinitionRow(list, "弓把避让", "中心出箭，无需额外避让弓把；仍计算动态弯曲");
    }
    addDefinitionRow(list, "基础推荐对应动态挠度", formatDynamicDeflectionRange(recommendation.recommendedDynamicMinMm, recommendation.recommendedDynamicMaxMm));
    if (recommendation.calibrationConflict) {
      addDefinitionRow(list, "核准结果", "最低弓把避让需求高于基础推荐动态上限，请复核中心线尺寸并试相邻箭杆");
    } else {
      addDefinitionRow(list, "动态核准值（推荐区间均值）", "ATA 等效 "
        + Math.round(window.ArcherModel.millimetersToAtaSpine(recommendation.calibrationTargetMm))
        + "（" + formatNumber(recommendation.calibrationTargetMm, 1) + " mm）");
    }
    if (recommendation.woodSpinePoundsMin != null) {
      addDefinitionRow(list, "传统木箭标磅近似", formatRange(recommendation.woodSpinePoundsMin, recommendation.woodSpinePoundsMax, 1, "lb"));
    }
  }

  function renderFixedShaftAdjustments(result) {
    var list = elements.fixedShaftSummary;
    var adjustment = result.adjustments;
    if (adjustment.targetDynamicMm == null) {
      addDefinitionRow(list, "调整目标", "基础推荐动态范围与最低弓把避让需求冲突，暂不生成调整值");
      return;
    }
    addDefinitionRow(list, "调整计算参考", "沿用原计算，使预测动态挠度下限接近推荐下限或最低避让值：ATA 等效 "
      + Math.round(window.ArcherModel.millimetersToAtaSpine(adjustment.targetDynamicMm))
      + "（" + formatNumber(adjustment.targetDynamicMm, 1) + " mm）");
    if (result.dynamicMatch && result.clearanceMatch) {
      addDefinitionRow(list, "当前状态", "预测动态区间包含推荐区间中间值，并满足最低弓把避让；以下调整值沿用原有计算");
    }
    if (adjustment.targetPointWeightGr == null) {
      addDefinitionRow(list, "箭重方案", "即使箭头系统减至 0 gr 仍无法达到核准值，请改用更硬箭杆或参考理论箭长");
    } else {
      addDefinitionRow(list, "箭重方案", "箭头系统 " + formatNumber(adjustment.targetPointWeightGr, 1) + " gr（" + signedNumber(adjustment.pointWeightDeltaGr, 1) + " gr），成品 " + formatNumber(adjustment.targetFinishedArrowWeightGr, 1) + " gr");
      addDefinitionRow(list, "箭重后动态挠度", formatDynamicDeflectionRange(adjustment.pointDynamicMinMm, adjustment.pointDynamicMaxMm) + clearanceSuffix(result, adjustment.pointClearanceStatus));
    }
    if (adjustment.targetShaftLengthIn != null) {
      addDefinitionRow(list, "箭长方案", formatNumber(adjustment.targetShaftLengthIn, 2) + " in（"
        + signedNumber(adjustment.shaftLengthDeltaIn, 2) + " in）"
        + (adjustment.lengthBelowDrawLength ? "；理论值短于实测拉距，不可直接采用" : ""));
      addDefinitionRow(list, "箭长后动态挠度", formatDynamicDeflectionRange(adjustment.lengthDynamicMinMm, adjustment.lengthDynamicMaxMm) + clearanceSuffix(result, adjustment.lengthClearanceStatus));
    }
  }

  function formatSpineRange(lowerIn, upperIn) {
    return "ATA " + Math.round(lowerIn * 1000) + "-" + Math.round(upperIn * 1000)
      + "（静态测试位移 " + formatNumber(lowerIn * 25.4, 2) + "-" + formatNumber(upperIn * 25.4, 2) + " mm）";
  }

  function formatDynamicDeflectionRange(lowerMm, upperMm) {
    return "ATA 等效 " + Math.round(window.ArcherModel.millimetersToAtaSpine(lowerMm))
      + "-" + Math.round(window.ArcherModel.millimetersToAtaSpine(upperMm))
      + "（" + formatNumber(lowerMm, 1) + "-" + formatNumber(upperMm, 1) + " mm）";
  }

  function formatRange(lower, upper, digits, unit) {
    return formatNumber(lower, digits) + "-" + formatNumber(upper, digits) + " " + unit;
  }

  function formatNumber(value, digits) {
    return String(Number(value.toFixed(digits)));
  }

  function offsetSourceLabel(source) {
    if (source === "grip-width-half") return "弓把宽度的一半";
    if (source === "bow-default") return "弓型默认";
    return "实测输入";
  }

  function currentMatchLabel(result) {
    if (result.recommendation.calibrationConflict) return "基础动态范围与最低弓把避让需求冲突，需复核配置";
    if (result.clearanceStatus === "insufficient") return "侧弯不足以避开弓把";
    if (result.dynamicMatchStatus === "too-soft") return "预测动态区间高于中间值核准值，存在箭杆偏软倾向";
    if (result.dynamicMatchStatus === "too-stiff") return "预测动态区间低于中间值核准值，存在箭杆偏硬倾向";
    if (result.clearanceStatus === "uncertain") return "动态范围跨越最低避让值，需实射验证";
    if (!result.staticMatch) return "静态挠度不在基础推荐区间，建议试相邻挠度";
    return "预测动态区间包含中间值核准值，并满足最低弓把避让";
  }

  function clearanceSuffix(result, status) {
    if (!result.recommendation.hasClearanceConstraint) return "";
    var labels = {
      satisfied: "达到最低需求",
      uncertain: "跨越最低值，需实射验证",
      insufficient: "挠度不足",
      unavailable: "不可计算"
    };
    return "；弓把避让" + (labels[status] || "需复核");
  }

  function signedNumber(value, digits) {
    return (value > 0 ? "+" : "") + formatNumber(value, digits == null ? 0 : digits);
  }

  function addDefinitionRow(list, label, value) {
    var term = document.createElement("dt");
    var detail = document.createElement("dd");
    term.textContent = label;
    detail.textContent = value;
    list.appendChild(term);
    list.appendChild(detail);
  }

  function displayBowType(value) {
    var labels = {
      american_hunting: "美猎",
      barebow: "光弓",
      chinese_traditional: "无台传统弓",
      compound: "复合",
      mongolian_traditional: "无台传统弓",
      olympic_recurve: "奥反",
      recurve: "反曲",
      shelfless_traditional: "无台传统弓",
      traditional: "美猎",
      turkish_traditional: "无台传统弓"
    };
    return labels[value] || value;
  }

  function download(filename, content, type) {
    var blob = new Blob([content], { type: type });
    var url = URL.createObjectURL(blob);
    var link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }
})();
