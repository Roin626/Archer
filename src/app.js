Exit code: 0
Wall time: 0.8 seconds
Output:
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
      equipmentButton: document.getElementById("equipmentButton"),
      equipmentError: document.getElementById("equipmentError"),
      equipmentTable: document.getElementById("equipmentTable"),
      spineBowType: document.getElementById("spineBowType"),
      spineDrawWeight: document.getElementById("spineDrawWeight"),
      spineArrowLength: document.getElementById("spineArrowLength"),
      spinePointWeight: document.getElementById("spinePointWeight"),
      spineMaterial: document.getElementById("spineMaterial"),
      spineShaftGpi: document.getElementById("spineShaftGpi"),
      spineRearComponentsWeight: document.getElementById("spineRearComponentsWeight"),
      spineStaticDeflection: document.getElementById("spineStaticDeflection"),
      spineManufacturerMinGpp: document.getElementById("spineManufacturerMinGpp"),
      spineButton: document.getElementById("spineButton"),
      spineError: document.getElementById("spineError"),
      spineSummary: document.getElementById("spineSummary")
    };

    bindEvents();
    session = window.ArcherStorage.loadSession() || window.ArcherModel.createSession(readForm());
    writeForm(session);
    render();
    renderEquipmentMatrix();
    renderSpineRecommendation();
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
    elements.spineButton.addEventListener("click", renderSpineRecommendation);
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
      return kind + ": " + group.count + " 鏀? 涓績 (" + group.centerX + ", " + group.centerY + ")";
    });

    elements.summary.innerHTML = "";
    addSummaryRow("Session", session.id);
    addSummaryRow("璺濈", session.distanceValue + session.distanceUnit);
    addSummaryRow("绠暟", summary.count);
    addSummaryRow("鍧囧垎", summary.averageScore || "-");
    addSummaryRow("涓績", "(" + summary.centerX + ", " + summary.centerY + ")");
    addSummaryRow("骞冲潎鍗婂緞", summary.averageRadius);
    addSummaryRow("鏈€澶у崐寰?, summary.maxRadius);
    addSummaryRow("鍒嗙被涓績", kindLines.length ? kindLines.join("锛?) : "-");
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
      setTableHeaders(elements.equipmentTable, ["Bow", "Draw weight", "AMO draw", "Test shaft", "Manufacturer chart inputs", "Nocking", "Rest / center-shot"]);
      var rows = window.ArcherModel.buildEquipmentMatrix({
        bowType: elements.equipmentBowType.value,
        drawWeights: elements.equipmentDrawWeights.value,
        drawLengths: elements.equipmentDrawLengths.value,
        arrowPassOffsetMm: arrowPassOffsetMm
      });

      elements.equipmentError.textContent = "";
      elements.equipmentTable.innerHTML = "";
      rows.forEach(function (row) {
        addTableRow(elements.equipmentTable, [
          displayBowType(row.bowType),
          row.drawWeightLb,
          row.drawLengthAmoIn,
          row.testShaftLengthIn + " in",
          row.chartInputs,
          row.nockingPoint,
          "offset " + arrowPassOffsetMm + " mm; " + row.rest + "; " + row.centerShot
        ]);
      });
    } catch (error) {
      elements.equipmentError.textContent = error.message;
    }
  }

  function renderSpineRecommendation() {
    try {
      var result = window.ArcherModel.calculateArrowBuild({
        bowType: elements.spineBowType.value,
        drawWeightLb: elements.spineDrawWeight.value,
        shaftLengthIn: elements.spineArrowLength.value,
        shaftGpi: elements.spineShaftGpi.value,
        pointSystemWeightGr: elements.spinePointWeight.value,
        rearComponentsWeightGr: elements.spineRearComponentsWeight.value,
        staticDeflectionIn: elements.spineStaticDeflection.value,
        manufacturerMinGpp: elements.spineManufacturerMinGpp.value
      });

      elements.spineError.textContent = "";
      elements.spineSummary.innerHTML = "";
      addDefinitionRow(elements.spineSummary, "Bow type", displayBowType(result.bowType));
      addDefinitionRow(elements.spineSummary, "Finished arrow", result.finishedArrowWeightGr + " gr");
      addDefinitionRow(elements.spineSummary, "GPP", result.gpp);
      addDefinitionRow(elements.spineSummary, "Bow maker minimum", result.manufacturerMinGpp == null ? "not entered" : result.manufacturerMinGpp + " GPP: " + (result.minimumWeightPasses ? "pass" : "fail"));
      addDefinitionRow(elements.spineSummary, "ATA static spine", result.ataSpine == null ? "not entered" : result.ataSpine + " (" + result.staticDeflectionIn + " in deflection)");
      addDefinitionRow(elements.spineSummary, "EI", result.flexuralRigidityLbIn2 == null ? "not entered" : result.flexuralRigidityLbIn2 + " lb in2");
      addDefinitionRow(elements.spineSummary, "Chart effective draw weight", result.chartEffectiveDrawWeightLb + " lb");
      addDefinitionRow(elements.spineSummary, "Next step", result.chartNextStep);
    } catch (error) {
      elements.spineError.textContent = error.message;
    }
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
      american_hunting: "缇庣寧",
      barebow: "鍏夊紦",
      chinese_traditional: "鏃犲彴浼犵粺寮?,
      compound: "澶嶅悎",
      mongolian_traditional: "鏃犲彴浼犵粺寮?,
      olympic_recurve: "濂ュ弽",
      recurve: "鍙嶆洸",
      shelfless_traditional: "鏃犲彴浼犵粺寮?,
      traditional: "缇庣寧",
      turkish_traditional: "鏃犲彴浼犵粺寮?
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

