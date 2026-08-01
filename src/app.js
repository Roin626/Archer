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
      equipmentBowType: document.getElementById("equipmentBowType"),
      equipmentDrawWeights: document.getElementById("equipmentDrawWeights"),
      equipmentDrawLengths: document.getElementById("equipmentDrawLengths"),
      equipmentMaterial: document.getElementById("equipmentMaterial"),
      equipmentArrowPassOffset: document.getElementById("equipmentArrowPassOffset"),
      equipmentFinishedArrowWeight: document.getElementById("equipmentFinishedArrowWeight"),
      equipmentShaftModel: document.getElementById("equipmentShaftModel"),
      equipmentReferenceAtaSpine: document.getElementById("equipmentReferenceAtaSpine"),
      equipmentReferenceShaftLength: document.getElementById("equipmentReferenceShaftLength"),
      equipmentReferenceDrawWeight: document.getElementById("equipmentReferenceDrawWeight"),
      equipmentScreeningBand: document.getElementById("equipmentScreeningBand"),
      equipmentButton: document.getElementById("equipmentButton"),
      equipmentError: document.getElementById("equipmentError"),
      equipmentTable: document.getElementById("equipmentTable"),
      spineFromWeightBowType: document.getElementById("spineFromWeightBowType"),
      spineFromWeightDrawWeight: document.getElementById("spineFromWeightDrawWeight"),
      spineFromWeightArrowLength: document.getElementById("spineFromWeightArrowLength"),
      spineFromWeightFinishedArrowWeight: document.getElementById("spineFromWeightFinishedArrowWeight"),
      spineFromWeightArrowPassOffset: document.getElementById("spineFromWeightArrowPassOffset"),
      spineFromWeightButton: document.getElementById("spineFromWeightButton"),
      spineFromWeightError: document.getElementById("spineFromWeightError"),
      spineFromWeightSummary: document.getElementById("spineFromWeightSummary"),
      weightFromSpineBowType: document.getElementById("weightFromSpineBowType"),
      weightFromSpineDrawWeight: document.getElementById("weightFromSpineDrawWeight"),
      weightFromSpineArrowLength: document.getElementById("weightFromSpineArrowLength"),
      weightFromSpineAtaSpine: document.getElementById("weightFromSpineAtaSpine"),
      weightFromSpineArrowPassOffset: document.getElementById("weightFromSpineArrowPassOffset"),
      weightFromSpineButton: document.getElementById("weightFromSpineButton"),
      weightFromSpineError: document.getElementById("weightFromSpineError"),
      weightFromSpineSummary: document.getElementById("weightFromSpineSummary")
    };

    bindEvents();
    session = window.ArcherStorage.loadSession() || window.ArcherModel.createSession(readForm());
    writeForm(session);
    render();
    renderEquipmentMatrix();
    renderSpineFromWeight();
    renderWeightFromSpine();
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

    elements.equipmentButton.addEventListener("click", renderEquipmentMatrix);
    elements.spineFromWeightButton.addEventListener("click", renderSpineFromWeight);
    elements.weightFromSpineButton.addEventListener("click", renderWeightFromSpine);
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

  function renderEquipmentMatrix() {
    try {
      var arrowPassOffsetMm = Number(elements.equipmentArrowPassOffset.value || 0);
      setTableHeaders(elements.equipmentTable, ["弓型", "拉重", "AMO 拉距", "测试箭杆", "ATA 静态 Spine 筛选范围", "选箭复核数据", "Nocking", "箭台 / 中心射出"]);
      var rows = window.ArcherModel.buildEquipmentMatrix({
        bowType: elements.equipmentBowType.value,
        drawWeights: elements.equipmentDrawWeights.value,
        drawLengths: elements.equipmentDrawLengths.value,
        arrowPassOffsetMm: arrowPassOffsetMm,
        referenceAtaSpine: elements.equipmentReferenceAtaSpine.value,
        referenceShaftLengthIn: elements.equipmentReferenceShaftLength.value,
        referenceDrawWeightLb: elements.equipmentReferenceDrawWeight.value,
        screeningBandPercent: elements.equipmentScreeningBand.value,
        finishedArrowWeightGr: elements.equipmentFinishedArrowWeight.value
      });

      elements.equipmentError.textContent = "";
      elements.equipmentTable.innerHTML = "";
      rows.forEach(function (row) {
        addTableRow(elements.equipmentTable, [
          displayBowType(row.bowType),
          row.drawWeightLb,
          row.drawLengthAmoIn,
          row.testShaftLengthIn + " in",
          formatSpineScreening(row.spineScreening),
          formatChartInputs(row),
          row.nockingPoint,
          "offset " + arrowPassOffsetMm + " mm; " + row.rest + "; " + row.centerShot
        ]);
      });
    } catch (error) {
      elements.equipmentError.textContent = error.message;
    }
  }

  function renderSpineFromWeight() {
    try {
      var result = window.ArcherModel.estimateStaticSpine({
        bowType: elements.spineFromWeightBowType.value,
        drawWeightLb: elements.spineFromWeightDrawWeight.value,
        shaftLengthIn: elements.spineFromWeightArrowLength.value,
        finishedArrowWeightGr: elements.spineFromWeightFinishedArrowWeight.value,
        arrowPassOffsetMm: elements.spineFromWeightArrowPassOffset.value
      });

      elements.spineFromWeightError.textContent = "";
      elements.spineFromWeightSummary.innerHTML = "";
      addDefinitionRow(elements.spineFromWeightSummary, "推荐 ATA 静态 Spine", formatSpineScreening(result));
      addDefinitionRow(elements.spineFromWeightSummary, "推荐静态挠度", result.centerDeflectionIn + " in");
      addDefinitionRow(elements.spineFromWeightSummary, "成品箭重 / GPP", result.finishedArrowWeightGr + " gr / " + (result.finishedArrowWeightGr / Number(elements.spineFromWeightDrawWeight.value)).toFixed(2));
      addDefinitionRow(elements.spineFromWeightSummary, "等效拉重", result.effectiveDrawWeightLb + " lb（箭重 " + signedNumber(result.arrowWeightAdjustmentLb) + " lb，偏差 " + signedNumber(result.offsetAdjustmentLb) + " lb）");
    } catch (error) {
      elements.spineFromWeightError.textContent = error.message;
    }
  }

  function renderWeightFromSpine() {
    try {
      var result = window.ArcherModel.estimateFinishedArrowWeight({
        bowType: elements.weightFromSpineBowType.value,
        drawWeightLb: elements.weightFromSpineDrawWeight.value,
        shaftLengthIn: elements.weightFromSpineArrowLength.value,
        ataSpine: elements.weightFromSpineAtaSpine.value,
        arrowPassOffsetMm: elements.weightFromSpineArrowPassOffset.value
      });

      elements.weightFromSpineError.textContent = "";
      elements.weightFromSpineSummary.innerHTML = "";
      addDefinitionRow(elements.weightFromSpineSummary, "动态等效成品箭重", result.finishedArrowWeightGr + " gr");
      addDefinitionRow(elements.weightFromSpineSummary, "对应 GPP", result.gpp);
      addDefinitionRow(elements.weightFromSpineSummary, "输入 ATA 静态 Spine", result.ataSpine + "（挠度 " + result.staticDeflectionIn + " in）");
      addDefinitionRow(elements.weightFromSpineSummary, "反算等效拉重", result.requiredEffectiveDrawWeightLb + " lb（偏差修正 " + signedNumber(result.offsetAdjustmentLb) + " lb）");
    } catch (error) {
      elements.weightFromSpineError.textContent = error.message;
    }
  }

  function formatSpineScreening(screening) {
    if (!screening) {
      return "填写基准箭后生成";
    }
    var source = screening.source === "calibrated" ? "基准校准" : "默认初筛";
    return screening.lowerAtaSpine + "-" + screening.upperAtaSpine + "（中心 " + screening.centerAtaSpine + "，±" + screening.bandPercent + "%；" + source + "）";
  }

  function signedNumber(value) {
    return (value > 0 ? "+" : "") + value;
  }

  function formatChartInputs(row) {
    var finishedArrowWeight = elements.equipmentFinishedArrowWeight.value.trim();
    var shaftModel = elements.equipmentShaftModel.value.trim();
    var values = [
      "实测满拉 " + row.drawWeightLb + " lb",
      "测试箭杆 " + row.testShaftLengthIn + " in",
      "成品箭重 " + (finishedArrowWeight ? finishedArrowWeight + " gr" : "按默认 GPP 初筛"),
      "来源/型号 " + (shaftModel || "未填，不影响计算")
    ];
    if (row.bowType === "compound") {
      values.push("另填凸轮/弦距与撒放方式");
    }
    return values.join("；");
  }

  function addTableRow(body, values) {
    var row = document.createElement("tr");
    values.forEach(function (value) {
      var cell = document.createElement("td");
      cell.textContent = value;
      row.appendChild(cell);
    });
    body.appendChild(row);
  }

  function setTableHeaders(body, labels) {
    var headerRow = body.closest("table").querySelector("thead tr");
    headerRow.innerHTML = "";
    labels.forEach(function (label) {
      var cell = document.createElement("th");
      cell.textContent = label;
      headerRow.appendChild(cell);
    });
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
