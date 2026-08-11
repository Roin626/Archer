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
      gramsInput: document.getElementById("gramsInput"),
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
    updatePoundsFromGrams();
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
    elements.gramsInput.addEventListener("input", updatePoundsFromGrams);
    elements.poundsInput.addEventListener("input", updateGramsFromPounds);
    elements.inchesInput.addEventListener("input", updateMillimetersFromInches);
    elements.millimetersInput.addEventListener("input", updateInchesFromMillimeters);
  }

  function updatePoundsFromGrams() {
    syncConversion(elements.gramsInput, elements.poundsInput, window.ArcherModel.gramsToPounds);
  }

  function updateGramsFromPounds() {
    syncConversion(elements.poundsInput, elements.gramsInput, window.ArcherModel.poundsToGrams);
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
      elements.tuningShaftDiameter.value = "6";
      elements.tuningShaftInnerDiameter.value = "4.2";
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
    addDefinitionRow(list, "箭杆截面", formatShaftSection(result.section));
    addDefinitionRow(list, "截面惯性矩 I", formatNumber(result.section.secondMomentMm4, 2) + " mm⁴");
    addDefinitionRow(list, "由 ATA 反算的 EI", formatScientific(result.section.flexuralRigidityNmm2) + " N·mm²");
    addDefinitionRow(list, "等效弯曲模量", formatNumber(result.section.effectiveBendingModulusGpa, 1) + " GPa（几何核对值）");
    addDefinitionRow(list, "预测动态挠度", formatDynamicDeflectionRange(result.current.dynamicDeflectionMinMm, result.current.dynamicDeflectionMaxMm));
    addDefinitionRow(list, "释放侧向等效力", formatNumber(result.current.lateralForceLb, 3) + " lb");
    addDefinitionRow(list, "出箭点中心线", formatNumber(result.arrowPassOffsetMm, 1) + " mm（" + offsetSourceLabel(result.offsetSource) + "）");
    addDefinitionRow(list, "当前匹配", currentMatchLabel(result));
  }

  function renderDynamicRecommendation(result) {
    var list = elements.recommendedSpineSummary;
    var recommendation = result.recommendation;
    addDefinitionRow(list, "器材匹配初筛", formatSpineRange(recommendation.empiricalLowerIn, recommendation.empiricalUpperIn));
    if (recommendation.hasClearanceConstraint) {
      addDefinitionRow(list, "避开弓把所需动态挠度", formatDynamicDeflectionRange(recommendation.requiredDynamicMinMm, recommendation.requiredDynamicMaxMm));
      addDefinitionRow(list, "满足弓把避让的静态挠度", formatSpineRange(recommendation.clearanceLowerIn, recommendation.clearanceUpperIn));
    } else {
      addDefinitionRow(list, "弓把避让", "中心出箭，无需额外避让弓把；仍计算动态弯曲");
    }
    if (recommendation.conflict) {
      addDefinitionRow(list, "综合推荐", "器材匹配与弓把避让没有重叠，请先调整箭长、箭重或中心线偏差");
      return;
    }
    addDefinitionRow(list, "综合推荐静态挠度", formatSpineRange(recommendation.finalLowerIn, recommendation.finalUpperIn));
    addDefinitionRow(list, "推荐动态挠度", formatDynamicDeflectionRange(recommendation.recommendedDynamicMinMm, recommendation.recommendedDynamicMaxMm));
    if (recommendation.woodSpinePoundsMin != null) {
      addDefinitionRow(list, "传统木箭标磅近似", formatRange(recommendation.woodSpinePoundsMin, recommendation.woodSpinePoundsMax, 1, "lb"));
    }
  }

  function renderFixedShaftAdjustments(result) {
    var list = elements.fixedShaftSummary;
    var adjustment = result.adjustments;
    addDefinitionRow(list, "说明", result.staticMatch ? "当前静态挠度已在推荐带内；以下数值用于对准推荐中心" : "以下为固定当前静态挠度的中心匹配方案");
    if (adjustment.targetPointWeightGr == null) {
      addDefinitionRow(list, "箭重方案", "无法用非负箭头重量达到推荐中心，请改用更硬箭杆或调整箭长");
    } else {
      addDefinitionRow(list, "箭重方案", "箭头系统 " + formatNumber(adjustment.targetPointWeightGr, 1) + " gr（" + signedNumber(adjustment.pointWeightDeltaGr, 1) + " gr），成品 " + formatNumber(adjustment.targetFinishedArrowWeightGr, 1) + " gr");
      addDefinitionRow(list, "箭重后动态挠度", formatDynamicDeflectionRange(adjustment.pointDynamicMinMm, adjustment.pointDynamicMaxMm) + clearanceSuffix(result, adjustment.pointClearanceStatus));
    }
    addDefinitionRow(list, "箭长方案", formatNumber(adjustment.targetShaftLengthIn, 2) + " in（" + signedNumber(adjustment.shaftLengthDeltaIn, 2) + " in）");
    addDefinitionRow(list, "箭长后动态挠度", formatDynamicDeflectionRange(adjustment.lengthDynamicMinMm, adjustment.lengthDynamicMaxMm) + clearanceSuffix(result, adjustment.lengthClearanceStatus));
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

  function formatShaftSection(section) {
    if (section.sectionType === "solid") {
      return "实心圆杆，直径 " + formatNumber(section.outerDiameterMm, 1) + " mm";
    }
    return "空心圆管，外径 " + formatNumber(section.outerDiameterMm, 1)
      + " / 内径 " + formatNumber(section.innerDiameterMm, 1)
      + " mm（壁厚 " + formatNumber(section.wallThicknessMm, 2) + " mm）";
  }

  function formatScientific(value) {
    return Number(value.toPrecision(4)).toExponential(3).replace("e+", "e");
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
    if (!result.staticMatch) return "静态挠度不在综合推荐区间，需调整或试相邻挠度";
    if (result.clearanceStatus === "overlap") return "静态匹配；弓把避让范围部分重叠，需实射验证";
    if (result.clearanceStatus === "insufficient") return "侧弯不足以避开弓把";
    if (result.clearanceStatus === "excessive") return "侧弯超过建议避让范围";
    return "在综合推荐区间内";
  }

  function clearanceSuffix(result, status) {
    if (!result.recommendation.hasClearanceConstraint) return "";
    var labels = {
      within: "完全落入目标",
      overlap: "部分重叠，需实射验证",
      insufficient: "挠度不足",
      excessive: "挠度过量",
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
