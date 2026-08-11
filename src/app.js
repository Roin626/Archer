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
      tuningDrawWeight: document.getElementById("tuningDrawWeight"),
      tuningDrawLength: document.getElementById("tuningDrawLength"),
      tuningShaftLength: document.getElementById("tuningShaftLength"),
      tuningGripWidth: document.getElementById("tuningGripWidth"),
      tuningArrowPassOffset: document.getElementById("tuningArrowPassOffset"),
      tuningBareArrowWeight: document.getElementById("tuningBareArrowWeight"),
      tuningPointWeight: document.getElementById("tuningPointWeight"),
      tuningAtaSpine: document.getElementById("tuningAtaSpine"),
      tuningVerticalFeedback: document.getElementById("tuningVerticalFeedback"),
      tuningLateralFeedback: document.getElementById("tuningLateralFeedback"),
      tuningButton: document.getElementById("tuningButton"),
      tuningError: document.getElementById("tuningError"),
      initialSpineSummary: document.getElementById("initialSpineSummary"),
      carbonClearanceSummary: document.getElementById("carbonClearanceSummary"),
      naturalClearanceSummary: document.getElementById("naturalClearanceSummary"),
      pointTuneSummary: document.getElementById("pointTuneSummary"),
      gramsInput: document.getElementById("gramsInput"),
      poundsInput: document.getElementById("poundsInput"),
      inchesInput: document.getElementById("inchesInput"),
      millimetersInput: document.getElementById("millimetersInput")
    };

    bindEvents();
    session = window.ArcherStorage.loadSession() || window.ArcherModel.createSession(readForm());
    writeForm(session);
    render();
    renderTwoStageTuning();
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

    elements.tuningButton.addEventListener("click", renderTwoStageTuning);
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

  function renderTwoStageTuning() {
    try {
      var initial = window.ArcherModel.calculateHandleClearanceRanges({
        bowType: elements.tuningBowType.value,
        drawWeightLb: elements.tuningDrawWeight.value,
        drawLengthIn: elements.tuningDrawLength.value,
        shaftLengthIn: elements.tuningShaftLength.value,
        gripWidthMm: elements.tuningGripWidth.value,
        arrowPassOffsetMm: elements.tuningArrowPassOffset.value
      });
      var adjustment = window.ArcherModel.recommendPointWeightAdjustment({
        drawWeightLb: elements.tuningDrawWeight.value,
        bareArrowWeightGr: elements.tuningBareArrowWeight.value,
        pointWeightGr: elements.tuningPointWeight.value,
        ataSpine: elements.tuningAtaSpine.value,
        verticalFeedback: elements.tuningVerticalFeedback.value,
        lateralFeedback: elements.tuningLateralFeedback.value
      });
      elements.tuningError.textContent = "";
      elements.initialSpineSummary.innerHTML = "";
      elements.carbonClearanceSummary.innerHTML = "";
      elements.naturalClearanceSummary.innerHTML = "";
      elements.pointTuneSummary.innerHTML = "";
      addDefinitionRow(elements.initialSpineSummary, "箭杆长 - 拉距", initial.shaftClearanceIn + " in");
      addDefinitionRow(elements.initialSpineSummary, "中心线偏差", initial.arrowPassOffsetMm + " mm（" + (initial.offsetSource === "grip-width-half" ? "弓把宽度的一半" : "手动/弓型默认") + "）");
      addDefinitionRow(elements.initialSpineSummary, "理论横向激励", initial.lateralForceLb + " lb");
      renderMaterialClearance(elements.carbonClearanceSummary, initial.materials.carbon, initial.noHandleClearanceRequired);
      renderMaterialClearance(elements.naturalClearanceSummary, initial.materials.bamboo_wood, initial.noHandleClearanceRequired);
      addDefinitionRow(elements.pointTuneSummary, "下一次箭头系统重量", adjustment.targetPointWeightGr + " gr（" + signedNumber(adjustment.pointDeltaGr) + " gr）");
      addDefinitionRow(elements.pointTuneSummary, "成品箭重 / GPP", adjustment.targetFinishedArrowWeightGr + " gr / " + adjustment.targetGpp);
      addDefinitionRow(elements.pointTuneSummary, "相邻 Spine 试箭", adjustment.needsSpineChange ? adjustment.targetAtaSpine + "（" + (adjustment.ataSpineDelta < 0 ? "更硬" : "更软") + " " + Math.abs(adjustment.ataSpineDelta) + "）" : "保持当前 " + elements.tuningAtaSpine.value);
    } catch (error) {
      elements.tuningError.textContent = error.message;
    }
  }

  function renderMaterialClearance(list, result, noHandleClearanceRequired) {
    if (noHandleClearanceRequired) {
      addDefinitionRow(list, "绕把动态挠度", "0 mm（中心射出，无侧向绕把需求）");
      addDefinitionRow(list, "静态 Spine", "不由绕把净空约束");
      return;
    }
    addDefinitionRow(list, "理论动态挠度", result.dynamicDeflectionMinMm + "-" + result.dynamicDeflectionMaxMm + " mm");
    addDefinitionRow(list, "所需静态挠度", result.staticDeflectionMinIn + "-" + result.staticDeflectionMaxIn + " in");
    addDefinitionRow(list, "ATA Spine 区间", result.ataSpineMin + "-" + result.ataSpineMax);
    if (result.woodSpinePoundsMin != null) {
      addDefinitionRow(list, "传统木箭 Spine", result.woodSpinePoundsMin + "-" + result.woodSpinePoundsMax + " lb（26/挠度近似）");
    }
    addDefinitionRow(list, "模型假设", result.assumedDiameterMm + " mm 杆径；动态系数 " + result.dynamicFactorMin + "-" + result.dynamicFactorMax);
  }

  function signedNumber(value) {
    return (value > 0 ? "+" : "") + value;
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
