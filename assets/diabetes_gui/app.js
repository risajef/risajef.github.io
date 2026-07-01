const PERIODS = [
  { key: "morning", label: "Morgen", start: 4 * 60, end: 10 * 60 + 59, target: 7 * 60 + 30, wraps: false, insulinKind: "fast" },
  { key: "midday", label: "Mittag", start: 10 * 60, end: 15 * 60 + 59, target: 12 * 60, wraps: false, insulinKind: "fast" },
  { key: "evening", label: "Abend", start: 15 * 60, end: 21 * 60 + 59, target: 18 * 60, wraps: false, insulinKind: "fast" },
  { key: "night", label: "Nacht", start: 18 * 60, end: 3 * 60 + 59, target: 22 * 60, wraps: true, insulinKind: "depot" },
];

const monthFormatter = new Intl.DateTimeFormat("de-CH", { month: "long", year: "numeric" });
const weekdayFormatter = new Intl.DateTimeFormat("de-CH", { weekday: "short" });
const APP_VIEWER_LABEL = "Persönlicher FreeStyle LibreLink CSV-Viewer";
const APP_DISCLAIMER =
  "CSV-Viewer für FreeStyle LibreLink Exporte. Unoffizielles persönliches Projekt; kein offizieller FreeStyle LibreLink Viewer und nicht vom Hersteller bereitgestellt, geprüft oder unterstützt.";

const state = {
  months: [],
  monthsByKey: new Map(),
  selectedMonthKey: null,
  selectedDayKey: null,
  datasetMeta: null,
};

const elements = {
  datasetMeta: document.querySelector("#datasetMeta"),
  csvInput: document.querySelector("#csvInput"),
  monthSelect: document.querySelector("#monthSelect"),
  prevMonthBtn: document.querySelector("#prevMonthBtn"),
  nextMonthBtn: document.querySelector("#nextMonthBtn"),
  exportExcelBtn: document.querySelector("#exportExcelBtn"),
  exportPdfBtn: document.querySelector("#exportPdfBtn"),
  monthCoverage: document.querySelector("#monthCoverage"),
  monthMin: document.querySelector("#monthMin"),
  monthMax: document.querySelector("#monthMax"),
  monthAvg: document.querySelector("#monthAvg"),
  monthFastInsulin: document.querySelector("#monthFastInsulin"),
  monthDepotInsulin: document.querySelector("#monthDepotInsulin"),
  monthTotalInsulin: document.querySelector("#monthTotalInsulin"),
  monthInRange: document.querySelector("#monthInRange"),
  dailyTableBody: document.querySelector("#dailyTable tbody"),
  detailTitle: document.querySelector("#detailTitle"),
  detailSummary: document.querySelector("#detailSummary"),
  notesList: document.querySelector("#notesList"),
  dayInsulinList: document.querySelector("#dayInsulinList"),
  chartContainer: document.querySelector("#chartContainer"),
  pdfExportDialog: document.querySelector("#pdfExportDialog"),
  pdfExportForm: document.querySelector("#pdfExportForm"),
  pdfMonthList: document.querySelector("#pdfMonthList"),
  pdfExportSelectionSummary: document.querySelector("#pdfExportSelectionSummary"),
  pdfSelectAllBtn: document.querySelector("#pdfSelectAllBtn"),
  pdfSelectCurrentBtn: document.querySelector("#pdfSelectCurrentBtn"),
  pdfSelectNoneBtn: document.querySelector("#pdfSelectNoneBtn"),
  pdfExportCloseBtn: document.querySelector("#pdfExportCloseBtn"),
  pdfCancelBtn: document.querySelector("#pdfCancelBtn"),
  pdfConfirmBtn: document.querySelector("#pdfConfirmBtn"),
};

init();

function init() {
  elements.csvInput.addEventListener("change", async (event) => {
    const file = event.target.files && event.target.files[0];
    if (!file) {
      return;
    }
    const text = await file.text();
    processCsvText(text, file.name);
  });

  elements.monthSelect.addEventListener("change", () => {
    state.selectedMonthKey = elements.monthSelect.value;
    renderMonth();
  });

  elements.prevMonthBtn.addEventListener("click", () => {
    moveMonth(-1);
  });

  elements.nextMonthBtn.addEventListener("click", () => {
    moveMonth(1);
  });

  if (elements.exportExcelBtn) {
    elements.exportExcelBtn.addEventListener("click", () => {
      exportAllMonthsToExcel();
    });
  }

  if (elements.exportPdfBtn) {
    elements.exportPdfBtn.addEventListener("click", () => {
      openPdfExportDialog();
    });
  }

  if (elements.pdfExportForm) {
    elements.pdfExportForm.addEventListener("submit", (event) => {
      event.preventDefault();
      exportSelectedMonthsToPdf();
    });
  }

  if (elements.pdfSelectAllBtn) {
    elements.pdfSelectAllBtn.addEventListener("click", () => {
      setPdfMonthSelection(() => true);
    });
  }

  if (elements.pdfSelectCurrentBtn) {
    elements.pdfSelectCurrentBtn.addEventListener("click", () => {
      setPdfMonthSelection((month) => month.key === state.selectedMonthKey);
    });
  }

  if (elements.pdfSelectNoneBtn) {
    elements.pdfSelectNoneBtn.addEventListener("click", () => {
      setPdfMonthSelection(() => false);
    });
  }

  if (elements.pdfExportCloseBtn) {
    elements.pdfExportCloseBtn.addEventListener("click", () => {
      closePdfExportDialog();
    });
  }

  if (elements.pdfCancelBtn) {
    elements.pdfCancelBtn.addEventListener("click", () => {
      closePdfExportDialog();
    });
  }
}

function processCsvText(text, sourceLabel) {
  setDatasetMessage("CSV wird verarbeitet...");

  const parseResult = buildModelFromCsv(text);

  if (parseResult.months.length === 0) {
    if (elements.exportExcelBtn) {
      elements.exportExcelBtn.disabled = true;
    }
    if (elements.exportPdfBtn) {
      elements.exportPdfBtn.disabled = true;
    }
    setDatasetMessage("Keine auswertbaren Zeilen gefunden.", true);
    return;
  }

  state.months = parseResult.months;
  state.monthsByKey = new Map(parseResult.months.map((month) => [month.key, month]));
  state.selectedMonthKey = parseResult.months[parseResult.months.length - 1].key;
  state.selectedDayKey = null;
  state.datasetMeta = {
    sourceLabel,
    rangeStart: parseResult.rangeStart,
    rangeEnd: parseResult.rangeEnd,
    rowCount: parseResult.rowCount,
    keptCount: parseResult.keptCount,
    duplicateCount: parseResult.duplicateCount,
  };

  if (elements.exportExcelBtn) {
    elements.exportExcelBtn.disabled = false;
  }
  if (elements.exportPdfBtn) {
    elements.exportPdfBtn.disabled = false;
  }

  renderMonthOptions();
  renderMonth();
}

function renderMonthOptions() {
  elements.monthSelect.innerHTML = "";

  for (const month of state.months) {
    const option = document.createElement("option");
    option.value = month.key;
    option.textContent = month.label;
    elements.monthSelect.appendChild(option);
  }

  elements.monthSelect.value = state.selectedMonthKey;
}

function moveMonth(delta) {
  const index = state.months.findIndex((month) => month.key === state.selectedMonthKey);
  if (index < 0) {
    return;
  }
  const newIndex = index + delta;
  if (newIndex < 0 || newIndex >= state.months.length) {
    return;
  }
  state.selectedMonthKey = state.months[newIndex].key;
  elements.monthSelect.value = state.selectedMonthKey;
  renderMonth();
}

function renderMonth() {
  const month = state.monthsByKey.get(state.selectedMonthKey);
  if (!month) {
    return;
  }

  renderDatasetMeta(month);
  renderMonthStats(month);
  renderDailyTable(month);

  let day = month.days.find((entry) => entry.key === state.selectedDayKey);
  if (!day) {
    day = month.days.find((entry) => entry.glucoseReadings.length > 0 || entry.insulinEvents.length > 0 || entry.notes.length > 0);
  }
  if (!day) {
    day = month.days[0];
  }

  state.selectedDayKey = day.key;
  highlightSelectedDay();
  renderDayDetail(day);
}

function renderDatasetMeta(month) {
  const meta = state.datasetMeta;
  if (!meta) {
    return;
  }
  const rangeText = `${formatDate(meta.rangeStart)} bis ${formatDate(meta.rangeEnd)}`;
  const rowText = `${meta.keptCount.toLocaleString("de-CH")} Zeilen verwendet`;
  setDatasetMessage(
    `Quelle: ${meta.sourceLabel}. Zeitraum: ${rangeText}. ${rowText}. Doppelte Zeilen ignoriert: ${meta.duplicateCount.toLocaleString("de-CH")}.`
  );

  elements.monthCoverage.textContent = `Ausgewählt: ${month.label}. Tage mit Glukose: ${month.daysWithGlucose}/${month.days.length}.`;
}

function renderMonthStats(month) {
  elements.monthMin.textContent = formatMmol(month.stats.min);
  elements.monthMax.textContent = formatMmol(month.stats.max);
  elements.monthAvg.textContent = formatMmol(month.stats.avg);
  elements.monthFastInsulin.textContent = formatUnits(month.stats.fastInsulin);
  elements.monthDepotInsulin.textContent = formatUnits(month.stats.depotInsulin);
  elements.monthTotalInsulin.textContent = formatUnits(month.stats.totalInsulin);
  elements.monthInRange.textContent = formatPercent(month.stats.inRangePercent);
}

function renderDailyTable(month) {
  elements.dailyTableBody.innerHTML = "";

  for (const day of month.days) {
    const row = document.createElement("tr");
    row.dataset.dayKey = day.key;

    if (day.glucoseReadings.length === 0 && day.insulinEvents.length === 0 && day.notes.length === 0) {
      row.classList.add("day-empty");
    }

    row.addEventListener("click", () => {
      state.selectedDayKey = day.key;
      highlightSelectedDay();
      renderDayDetail(day);
    });

    const insulinTimes = day.insulinEvents.map((event) => `${formatTime(event.time)} ${event.units.toFixed(1)}E`).join(" · ");

    appendCell(row, `${pad2(day.day)}.${pad2(month.month)} (${day.weekday})`);
    appendGlucoseCell(row, day.low);
    appendGlucoseCell(row, day.high);
    appendGlucoseCell(row, periodValue(day, "morning"));
    appendGlucoseCell(row, periodValue(day, "midday"));
    appendGlucoseCell(row, periodValue(day, "evening"));
    appendGlucoseCell(row, periodValue(day, "night"));
    appendCell(row, formatPercent(day.inRangePercent));
    appendCell(row, `${formatUnits(day.fastTotal)} / ${formatUnits(day.depotTotal)}`);
    appendCell(row, insulinTimes || "-");

    elements.dailyTableBody.appendChild(row);
  }
}

function exportAllMonthsToExcel() {
  if (!state.months.length) {
    setDatasetMessage("Keine Monate zum Export vorhanden.", true);
    return;
  }

  if (typeof XLSX === "undefined") {
    setDatasetMessage("Excel-Export nicht verfügbar: Bibliothek konnte nicht geladen werden.", true);
    return;
  }

  const workbook = XLSX.utils.book_new();
  workbook.Props = {
    Title: "Glukose Dashboard",
    Subject: APP_DISCLAIMER,
    Author: APP_VIEWER_LABEL,
  };
  const usedSheetNames = new Set();

  for (const month of state.months) {
    const worksheet = buildMonthWorksheetForExport(month);
    const sheetName = buildExportSheetName(month, usedSheetNames);
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
    usedSheetNames.add(sheetName);
  }

  const fileName = buildExportFileName();
  XLSX.writeFile(workbook, fileName, { compression: true });

  setDatasetMessage(`Excel exportiert: ${fileName}. Monate: ${state.months.length}.`);
}

function openPdfExportDialog() {
  if (!state.months.length) {
    setDatasetMessage("Keine Daten geladen. Bitte zuerst eine CSV auswählen.", true);
    return;
  }

  renderPdfMonthSelection();

  if (elements.pdfExportDialog && typeof elements.pdfExportDialog.showModal === "function") {
    elements.pdfExportDialog.showModal();
  } else {
    exportDashboardToPdf(state.months);
  }
}

function closePdfExportDialog() {
  if (elements.pdfExportDialog && elements.pdfExportDialog.open) {
    elements.pdfExportDialog.close();
  }
}

function renderPdfMonthSelection() {
  if (!elements.pdfMonthList) {
    return;
  }

  elements.pdfMonthList.innerHTML = "";

  for (const month of state.months) {
    const label = document.createElement("label");
    label.className = "month-check";

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.value = month.key;
    checkbox.checked = true;
    checkbox.addEventListener("change", updatePdfSelectionSummary);
    label.appendChild(checkbox);

    const text = document.createElement("span");
    text.textContent = `${month.label} (${month.daysWithGlucose}/${month.days.length} Tage)`;
    label.appendChild(text);

    elements.pdfMonthList.appendChild(label);
  }

  updatePdfSelectionSummary();
}

function setPdfMonthSelection(predicate) {
  if (!elements.pdfMonthList) {
    return;
  }

  const checkboxes = elements.pdfMonthList.querySelectorAll("input[type='checkbox']");
  for (const checkbox of checkboxes) {
    const month = state.monthsByKey.get(checkbox.value);
    checkbox.checked = Boolean(month && predicate(month));
  }
  updatePdfSelectionSummary();
}

function getSelectedPdfMonths() {
  if (!elements.pdfMonthList) {
    return state.months;
  }

  const selectedKeys = Array.from(elements.pdfMonthList.querySelectorAll("input[type='checkbox']:checked")).map((input) => input.value);
  return selectedKeys.map((key) => state.monthsByKey.get(key)).filter(Boolean);
}

function updatePdfSelectionSummary() {
  if (!elements.pdfExportSelectionSummary) {
    return;
  }

  const selectedCount = getSelectedPdfMonths().length;
  elements.pdfExportSelectionSummary.textContent = `${selectedCount} von ${state.months.length} Monaten ausgewählt`;

  if (elements.pdfConfirmBtn) {
    elements.pdfConfirmBtn.disabled = selectedCount === 0;
  }
}

function exportSelectedMonthsToPdf() {
  const selectedMonths = getSelectedPdfMonths();
  if (!selectedMonths.length) {
    setDatasetMessage("Bitte mindestens einen Monat für den PDF-Export auswählen.", true);
    return;
  }

  closePdfExportDialog();
  exportDashboardToPdf(selectedMonths);
}

async function exportDashboardToPdf(selectedMonths = state.months) {
  if (!state.months.length) {
    setDatasetMessage("Keine Daten geladen. Bitte zuerst eine CSV auswählen.", true);
    return;
  }
  if (!selectedMonths.length) {
    setDatasetMessage("Keine Monate für den PDF-Export ausgewählt.", true);
    return;
  }

  const PdfConstructor = window.jspdf && window.jspdf.jsPDF;
  if (typeof PdfConstructor !== "function") {
    setDatasetMessage("PDF-Export nicht verfügbar: jsPDF konnte nicht geladen werden.", true);
    return;
  }

  try {
    const pdf = new PdfConstructor({ orientation: "portrait", unit: "mm", format: "a4" });
    if (typeof pdf.autoTable !== "function") {
      setDatasetMessage("PDF-Export nicht verfügbar: AutoTable konnte nicht geladen werden.", true);
      return;
    }
    buildPdfDocument(pdf, selectedMonths);
    const fileName = buildPdfFileName(selectedMonths);
    const pdfBlob = pdf.output("blob");
    downloadPdfBlob(fileName, pdfBlob);
    setDatasetMessage(`PDF heruntergeladen: ${fileName}. Monate: ${selectedMonths.length}.`);
  } catch (error) {
    if (error && error.name === "AbortError") {
      setDatasetMessage("PDF-Export abgebrochen.");
    } else {
      const reason = error && error.message ? ` (${error.message})` : "";
      setDatasetMessage(`PDF-Export fehlgeschlagen${reason}.`, true);
    }
  }
}

function buildPdfDocument(pdf, months) {
  const layout = {
    margin: 10,
    pageWidth: pdf.internal.pageSize.getWidth(),
    pageHeight: pdf.internal.pageSize.getHeight(),
  };
  layout.contentWidth = layout.pageWidth - layout.margin * 2;

  let y = drawPdfReportHeader(pdf, layout);

  for (let index = 0; index < months.length; index += 1) {
    if (index > 0) {
      pdf.addPage();
      y = layout.margin;
    }

    y = drawPdfMonthHeader(pdf, months[index], layout, y);
    y = drawPdfStats(pdf, months[index], layout, y + 4);
    y = drawPdfMonthTable(pdf, months[index], layout, y + 5);
    y = drawPdfMonthlyChart(pdf, months[index], layout, y + 7);
  }

  drawPdfPageNumbers(pdf, layout);
}

function drawPdfReportHeader(pdf, layout) {
  const meta = state.datasetMeta;
  const lines = meta
    ? pdf.splitTextToSize(
        `Quelle: ${meta.sourceLabel}. Zeitraum: ${formatDate(meta.rangeStart)} bis ${formatDate(meta.rangeEnd)}. ${meta.keptCount.toLocaleString(
          "de-CH"
        )} Zeilen verwendet. Doppelte Zeilen ignoriert: ${meta.duplicateCount.toLocaleString("de-CH")}.`,
        layout.contentWidth
      )
    : [];
  const disclaimerLines = pdf.splitTextToSize(APP_DISCLAIMER, layout.contentWidth);

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(7);
  setPdfTextColor(pdf, "#4c5a56");
  pdf.text(APP_VIEWER_LABEL.toUpperCase(), layout.margin, 8.5);

  pdf.setFontSize(17);
  setPdfTextColor(pdf, "#16211f");
  pdf.text("Glukose Monatsbericht", layout.margin, 15.8);

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(7);
  setPdfTextColor(pdf, "#4c5a56");
  if (lines.length) {
    pdf.text(lines, layout.margin, 21.5);
  }

  const disclaimerY = 21.5 + Math.max(lines.length, 1) * 3.3 + 0.6;
  pdf.setFontSize(6.3);
  pdf.text(disclaimerLines, layout.margin, disclaimerY);

  const y = disclaimerY + disclaimerLines.length * 3 + 1.5;
  setPdfStrokeColor(pdf, "#d8dfdc");
  pdf.line(layout.margin, y, layout.pageWidth - layout.margin, y);
  return y + 4;
}

function drawPdfMonthHeader(pdf, month, layout, y) {
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(14);
  setPdfTextColor(pdf, "#16211f");
  pdf.text(month.label, layout.margin, y);

  const summary = `Tage mit Glukose: ${month.daysWithGlucose}/${month.days.length} | Min ${formatMmol(month.stats.min)} | Max ${formatMmol(
    month.stats.max
  )} | Durchschnitt ${formatMmol(month.stats.avg)} | Im Bereich ${formatPercent(month.stats.inRangePercent)}`;
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(7);
  setPdfTextColor(pdf, "#4c5a56");
  pdf.text(summary, layout.pageWidth - layout.margin, y, { align: "right" });

  return y + 4;
}

function drawPdfStats(pdf, month, layout, y) {
  const stats = [
    ["Min", formatMmol(month.stats.min), "mmol/L"],
    ["Max", formatMmol(month.stats.max), "mmol/L"],
    ["Durchschnitt", formatMmol(month.stats.avg), "mmol/L"],
    ["Schnellwirkend", formatUnits(month.stats.fastInsulin), "Einheiten"],
    ["Depot", formatUnits(month.stats.depotInsulin), "Einheiten"],
    ["Gesamt Insulin", formatUnits(month.stats.totalInsulin), "Einheiten"],
    ["Im Bereich", formatPercent(month.stats.inRangePercent), "3,9 - 10,0 mmol/L"],
  ];

  const gap = 1.4;
  const boxWidth = (layout.contentWidth - gap * (stats.length - 1)) / stats.length;
  const boxHeight = 14;

  for (let index = 0; index < stats.length; index += 1) {
    const x = layout.margin + index * (boxWidth + gap);
    setPdfStrokeColor(pdf, "#d8dfdc");
    setPdfFillColor(pdf, "#ffffff");
    pdf.roundedRect(x, y, boxWidth, boxHeight, 1.5, 1.5, "FD");

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(5.4);
    setPdfTextColor(pdf, "#4c5a56");
    pdf.text(stats[index][0].toUpperCase(), x + 1.4, y + 3.6, { maxWidth: boxWidth - 2.8 });

    pdf.setFontSize(8.8);
    setPdfTextColor(pdf, "#16211f");
    pdf.text(stats[index][1], x + 1.4, y + 8.6, { maxWidth: boxWidth - 2.8 });

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(4.8);
    setPdfTextColor(pdf, "#4c5a56");
    pdf.text(stats[index][2], x + 1.4, y + 12.4, { maxWidth: boxWidth - 2.8 });
  }

  return y + boxHeight;
}

function drawPdfMonthTable(pdf, month, layout, y) {
  const rows = month.days.map((day) => [
    `${pad2(day.day)}.${pad2(month.month)} (${day.weekday})`,
    formatMmol(day.low),
    formatMmol(day.high),
    formatMmol(periodValue(day, "morning")),
    formatMmol(periodValue(day, "midday")),
    formatMmol(periodValue(day, "evening")),
    formatMmol(periodValue(day, "night")),
    formatPercent(day.inRangePercent),
    `${formatUnits(day.fastTotal)} / ${formatUnits(day.depotTotal)}`,
    formatInsulinTimesForPdf(day),
  ]);

  pdf.autoTable({
    startY: y,
    head: [["Tag", "Tief", "Hoch", "Morgen", "Mittag", "Abend", "Nacht", "Im Bereich %", "Insulin", "Zeiten"]],
    body: rows,
    margin: { left: layout.margin, right: layout.margin, top: layout.margin, bottom: layout.margin + 5 },
    tableWidth: layout.contentWidth,
    theme: "grid",
    styles: {
      font: "helvetica",
      fontSize: 6.4,
      cellPadding: { top: 0.8, right: 0.8, bottom: 0.8, left: 0.8 },
      lineColor: [229, 233, 231],
      lineWidth: 0.15,
      overflow: "linebreak",
      valign: "top",
    },
    headStyles: {
      fillColor: [234, 243, 239],
      textColor: [37, 51, 47],
      fontStyle: "bold",
      lineColor: [216, 223, 220],
    },
    columnStyles: {
      0: { cellWidth: 15 },
      1: { cellWidth: 10 },
      2: { cellWidth: 10 },
      3: { cellWidth: 12 },
      4: { cellWidth: 12 },
      5: { cellWidth: 12 },
      6: { cellWidth: 12 },
      7: { cellWidth: 16 },
      8: { cellWidth: 18 },
      9: { cellWidth: 73, fontSize: 5.8 },
    },
    didParseCell: (data) => {
      if (data.section !== "body") {
        return;
      }

      const day = month.days[data.row.index];
      if (!day) {
        return;
      }

      if (day.glucoseReadings.length === 0 && day.insulinEvents.length === 0 && day.notes.length === 0) {
        data.cell.styles.textColor = [125, 138, 133];
      }

      const value = pdfGlucoseValueForColumn(day, data.column.index);
      if (value === null) {
        return;
      }

      if (value > 10) {
        data.cell.styles.fillColor = [242, 218, 213];
        data.cell.styles.textColor = [126, 39, 31];
        data.cell.styles.fontStyle = "bold";
      } else if (value < 3.9) {
        data.cell.styles.fillColor = [216, 232, 242];
        data.cell.styles.textColor = [32, 81, 125];
        data.cell.styles.fontStyle = "bold";
      }
    },
  });

  return (pdf.lastAutoTable && pdf.lastAutoTable.finalY ? pdf.lastAutoTable.finalY : y) + 2;
}

function drawPdfMonthlyChart(pdf, month, layout, y) {
  const chartHeight = 54;
  const legendHeight = 4.5;
  const blockHeight = chartHeight + legendHeight + 8;

  if (y + blockHeight > layout.pageHeight - layout.margin) {
    pdf.addPage();
    y = layout.margin;
  }

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(8);
  setPdfTextColor(pdf, "#16211f");
  pdf.text("Min, Median, Max und Im Bereich pro Tag", layout.margin, y);

  const chartY = y + 3.5;
  const chart = {
    x: layout.margin,
    y: chartY,
    width: layout.contentWidth,
    height: chartHeight,
    plotLeft: layout.margin + 13,
    plotTop: chartY + 6.5,
    plotRight: layout.margin + layout.contentWidth - 14,
    plotBottom: chartY + chartHeight - 9.5,
  };
  chart.plotWidth = chart.plotRight - chart.plotLeft;
  chart.plotHeight = chart.plotBottom - chart.plotTop;

  setPdfStrokeColor(pdf, "#d8dfdc");
  setPdfFillColor(pdf, "#ffffff");
  pdf.roundedRect(chart.x, chart.y, chart.width, chart.height, 1.8, 1.8, "FD");

  const stats = buildPdfDailyChartStats(month);
  if (!stats.some((day) => day.min !== null || day.max !== null || day.median !== null)) {
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8);
    setPdfTextColor(pdf, "#4c5a56");
    pdf.text("Keine Glukosewerte für diesen Monat.", chart.plotLeft, chart.plotTop + 12);
    return drawPdfChartLegend(pdf, layout, chart.y + chart.height + 4);
  }

  const glucoseValues = stats.flatMap((day) => [day.min, day.median, day.max].filter((value) => value !== null));
  let yMin = Math.min(...glucoseValues, 3.5);
  let yMax = Math.max(...glucoseValues, 10.5);
  yMin = Math.floor((yMin - 0.4) * 2) / 2;
  yMax = Math.ceil((yMax + 0.4) * 2) / 2;

  const xAt = (index) => chart.plotLeft + (stats.length === 1 ? chart.plotWidth / 2 : (index / (stats.length - 1)) * chart.plotWidth);
  const yAtGlucose = (value) => chart.plotTop + ((yMax - value) / (yMax - yMin || 1)) * chart.plotHeight;
  const yAtPercent = (value) => chart.plotTop + ((100 - value) / 100) * chart.plotHeight;

  setPdfFillColor(pdf, "#e7f1eb");
  const targetTop = yAtGlucose(10);
  const targetBottom = yAtGlucose(3.9);
  pdf.rect(chart.plotLeft, targetTop, chart.plotWidth, targetBottom - targetTop, "F");

  drawPdfChartGrid(pdf, stats, chart, xAt, yAtGlucose, yAtPercent, yMin, yMax);
  drawPdfSeries(pdf, stats, "max", xAt, yAtGlucose, "#a6352a", false);
  drawPdfSeries(pdf, stats, "median", xAt, yAtGlucose, "#2f5a95", false);
  drawPdfSeries(pdf, stats, "min", xAt, yAtGlucose, "#1a7f6b", false);
  drawPdfSeries(pdf, stats, "inRange", xAt, yAtPercent, "#7a2f6d", true);

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(7.4);
  setPdfTextColor(pdf, "#5b6662");
  pdf.text("Zielbereich 3,9 bis 10,0", chart.plotLeft + 4, chart.plotTop + 6);
  pdf.text("mmol/L", chart.plotRight, chart.plotTop + 6, { align: "right" });
  setPdfTextColor(pdf, "#7a2f6d");
  pdf.text("%", chart.plotRight + 6, chart.plotTop + 6);

  return drawPdfChartLegend(pdf, layout, chart.y + chart.height + 4);
}

function drawPdfChartGrid(pdf, stats, chart, xAt, yAtGlucose, yAtPercent, yMin, yMax) {
  const yTicks = [yMin, 3.9, 10, yMax].filter((value, index, values) => values.indexOf(value) === index);

  setPdfStrokeColor(pdf, "#dfe5e2");
  pdf.setLineWidth(0.15);
  for (const value of yTicks) {
    const y = yAtGlucose(value);
    pdf.line(chart.plotLeft, y, chart.plotRight, y);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(6.3);
    setPdfTextColor(pdf, "#5b6662");
    pdf.text(value.toFixed(1).replace(".", ","), chart.plotLeft - 3, y + 1.6, { align: "right" });
  }

  for (let index = 0; index < stats.length; index += 1) {
    const day = stats[index].day;
    if (day !== 1 && day % 5 !== 0 && day !== stats.length) {
      continue;
    }
    const x = xAt(index);
    setPdfStrokeColor(pdf, "#e8ecea");
    pdf.line(x, chart.plotTop, x, chart.plotBottom);
    setPdfTextColor(pdf, "#5b6662");
    pdf.text(pad2(day), x, chart.plotBottom + 4, { align: "center" });
  }

  setPdfTextColor(pdf, "#7a2f6d");
  for (const value of [0, 50, 100]) {
    const y = yAtPercent(value);
    pdf.text(`${value}%`, chart.plotRight + 3, y + 1.6);
  }
}

function drawPdfSeries(pdf, stats, key, xAt, yAt, color, dashed) {
  setPdfStrokeColor(pdf, color);
  setPdfFillColor(pdf, color);
  pdf.setLineWidth(key === "median" ? 0.55 : 0.45);
  pdf.setLineDashPattern(dashed ? [1.8, 1.2] : [], 0);

  let previous = null;
  for (let index = 0; index < stats.length; index += 1) {
    const value = stats[index][key];
    if (value === null || value === undefined) {
      previous = null;
      continue;
    }

    const point = { x: xAt(index), y: yAt(value) };
    if (previous) {
      pdf.line(previous.x, previous.y, point.x, point.y);
    }
    pdf.circle(point.x, point.y, 0.62, "F");
    previous = point;
  }

  pdf.setLineDashPattern([], 0);
}

function drawPdfChartLegend(pdf, layout, y) {
  const items = [
    ["Min", "#1a7f6b", false],
    ["Median", "#2f5a95", false],
    ["Max", "#a6352a", false],
    ["Im Bereich %", "#7a2f6d", true],
    ["Zielbereich 3,9 - 10,0", "#e7f1eb", false],
  ];

  let x = layout.margin;
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(6.5);
  for (const [label, color, dashed] of items) {
    if (label.startsWith("Zielbereich")) {
      setPdfFillColor(pdf, color);
      setPdfStrokeColor(pdf, "#a9c7b6");
      pdf.rect(x, y - 2.2, 3, 2, "FD");
    } else {
      setPdfStrokeColor(pdf, color);
      pdf.setLineWidth(0.5);
      pdf.setLineDashPattern(dashed ? [1.5, 1] : [], 0);
      pdf.line(x, y - 1.2, x + 4, y - 1.2);
      pdf.setLineDashPattern([], 0);
    }
    setPdfTextColor(pdf, "#4c5a56");
    pdf.text(label, x + 5, y);
    x += pdf.getTextWidth(label) + 11;
  }

  return y + 4;
}

function drawPdfPageNumbers(pdf, layout) {
  const pageCount = pdf.internal.getNumberOfPages();
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(7);
  setPdfTextColor(pdf, "#7d8a85");
  for (let page = 1; page <= pageCount; page += 1) {
    pdf.setPage(page);
    pdf.text(`${page} / ${pageCount}`, layout.pageWidth - layout.margin, layout.pageHeight - 5, { align: "right" });
  }
}

function buildPdfDailyChartStats(month) {
  return month.days.map((day) => {
    const values = day.glucoseReadings.map((point) => point.value).sort((a, b) => a - b);
    return {
      day: day.day,
      min: values.length ? values[0] : null,
      median: values.length ? medianOfSortedValues(values) : null,
      max: values.length ? values[values.length - 1] : null,
      inRange: values.length ? day.inRangePercent : null,
    };
  });
}

function pdfGlucoseValueForColumn(day, columnIndex) {
  if (columnIndex === 1) {
    return day.low;
  }
  if (columnIndex === 2) {
    return day.high;
  }
  if (columnIndex >= 3 && columnIndex <= 6) {
    return periodValue(day, PERIODS[columnIndex - 3].key);
  }
  return null;
}

function formatInsulinTimesForPdf(day) {
  if (!day.insulinEvents.length) {
    return "-";
  }
  return day.insulinEvents.map((event) => `${formatTime(event.time)} ${event.units.toFixed(1)}E`).join(" · ");
}

function setPdfTextColor(pdf, color) {
  const [red, green, blue] = hexToRgb(color);
  pdf.setTextColor(red, green, blue);
}

function setPdfStrokeColor(pdf, color) {
  const [red, green, blue] = hexToRgb(color);
  pdf.setDrawColor(red, green, blue);
}

function setPdfFillColor(pdf, color) {
  const [red, green, blue] = hexToRgb(color);
  pdf.setFillColor(red, green, blue);
}

function hexToRgb(color) {
  const normalized = color.replace("#", "");
  return [0, 2, 4].map((start) => parseInt(normalized.slice(start, start + 2), 16));
}

function medianOfSortedValues(values) {
  const middle = Math.floor(values.length / 2);
  if (values.length % 2 === 1) {
    return values[middle];
  }
  return (values[middle - 1] + values[middle]) / 2;
}

function downloadPdfBlob(fileName, pdfBlob) {
  const link = document.createElement("a");
  const url = URL.createObjectURL(pdfBlob);
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

function buildPdfFileName(months = state.months) {
  const normalizedSource = buildSafeSourceBase();
  const monthPart = buildMonthRangeSlug(months);
  const timestamp = buildExportTimestamp();
  return `${normalizedSource}_${monthPart}_dashboard_${timestamp}.pdf`;
}

function buildSafeSourceBase() {
  const sourceLabel = state.datasetMeta?.sourceLabel || "glukose_export";
  const sourceBase = sourceLabel.replace(/\.[^/.]+$/, "");
  const safeSource = sourceBase.replace(/[\\/:*?"<>|]+/g, "_").replace(/\s+/g, "_").replace(/^_+|_+$/g, "");
  return safeSource || "glukose_export";
}

function buildMonthRangeSlug(months) {
  if (!months || months.length === 0) {
    return "keine_monate";
  }

  if (months.length === 1) {
    return months[0].key;
  }

  return `${months[0].key}_bis_${months[months.length - 1].key}`;
}

function buildExportTimestamp() {
  const now = new Date();
  return `${now.getFullYear()}${pad2(now.getMonth() + 1)}${pad2(now.getDate())}_${pad2(now.getHours())}${pad2(now.getMinutes())}${pad2(
    now.getSeconds()
  )}${String(now.getMilliseconds()).padStart(3, "0")}`;
}

function waitForNextFrame() {
  return new Promise((resolve) => {
    requestAnimationFrame(() => resolve());
  });
}

function expandScrollableElementsForPrint() {
  const touched = [];
  const allElements = document.querySelectorAll("*");

  for (const element of allElements) {
    const computed = window.getComputedStyle(element);
    const hasScrollableOverflow =
      computed.overflow === "auto" ||
      computed.overflow === "scroll" ||
      computed.overflowX === "auto" ||
      computed.overflowX === "scroll" ||
      computed.overflowY === "auto" ||
      computed.overflowY === "scroll";
    const hasMaxHeight = computed.maxHeight && computed.maxHeight !== "none";

    if (!hasScrollableOverflow && !hasMaxHeight) {
      continue;
    }

    touched.push({
      element,
      overflow: element.style.overflow,
      overflowX: element.style.overflowX,
      overflowY: element.style.overflowY,
      maxHeight: element.style.maxHeight,
      height: element.style.height,
    });

    element.style.overflow = "visible";
    element.style.overflowX = "visible";
    element.style.overflowY = "visible";
    element.style.maxHeight = "none";
    element.style.height = "auto";
  }

  return () => {
    for (const item of touched) {
      item.element.style.overflow = item.overflow;
      item.element.style.overflowX = item.overflowX;
      item.element.style.overflowY = item.overflowY;
      item.element.style.maxHeight = item.maxHeight;
      item.element.style.height = item.height;
    }
  };
}

function buildMonthWorksheetForExport(month) {
  const injectionSlotCount = 6;
  const noteColumnCount = Math.max(1, month.days.reduce((max, day) => Math.max(max, day.notes.length), 0));

  const injectionHeaders = [];
  for (let slot = 1; slot <= injectionSlotCount; slot += 1) {
    injectionHeaders.push(`Injektion ${slot}\nZeit`, `Injektion ${slot}\nMenge (E)`);
  }

  const noteHeaders = [];
  for (let column = 1; column <= noteColumnCount; column += 1) {
    noteHeaders.push(`Bemerkung ${column}`);
  }

  const header = [
    "Datum",
    "Min\n(mmol/L)",
    "Max\n(mmol/L)",
    "Durchschnitt\n(mmol/L)",
    "Im Bereich\n(%)",
    "Morgen\nScan vor Injektion\n(mmol/L)",
    "Mittag\nScan vor Injektion\n(mmol/L)",
    "Abend\nScan vor Injektion\n(mmol/L)",
    "Nacht\nScan vor Depot\n(mmol/L)",
    ...injectionHeaders,
    ...noteHeaders,
  ];

  const rows = month.days.map((day) => {
    const mean = computeDayMean(day.glucoseReadings);
    const injectionSlots = buildInjectionSlotsForExport(day, injectionSlotCount);
    const noteColumns = buildNoteColumnsForExport(day, noteColumnCount);

    const injectionCells = [];
    for (const slot of injectionSlots) {
      injectionCells.push(slot.time, slot.amount);
    }

    return [
      `${pad2(day.day)}.${pad2(month.month)}.${month.year}`,
      round1OrNull(day.low),
      round1OrNull(day.high),
      round1OrNull(mean),
      round1OrNull(day.inRangePercent),
      round1OrNull(periodValue(day, "morning")),
      round1OrNull(periodValue(day, "midday")),
      round1OrNull(periodValue(day, "evening")),
      round1OrNull(periodValue(day, "night")),
      ...injectionCells,
      ...noteColumns,
    ];
  });

  const title = normalizeExcelText(month.label);
  const disclaimer = normalizeExcelText(APP_DISCLAIMER);
  const normalizedHeader = header.map((cell) => normalizeExcelText(cell));
  const normalizedRows = rows.map((row) => row.map((cell) => normalizeExcelText(cell)));

  const worksheet = XLSX.utils.aoa_to_sheet([[title], [disclaimer], [], normalizedHeader, ...normalizedRows]);

  const totalColumns = normalizedHeader.length;
  worksheet["!merges"] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: totalColumns - 1 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: totalColumns - 1 } },
  ];

  worksheet["!cols"] = computeAutoColumnWidths(normalizedHeader, normalizedRows);
  worksheet["!rows"] = computeAutoRowHeights(title, disclaimer, normalizedHeader, normalizedRows);

  applyExportStyles(worksheet, normalizedRows, totalColumns);

  return worksheet;
}

function computeDayMean(readings) {
  if (!readings || readings.length === 0) {
    return null;
  }
  const sum = readings.reduce((total, reading) => total + reading.value, 0);
  return sum / readings.length;
}

function buildInjectionSlotsForExport(day, slotCount) {
  const sortedEvents = [...day.insulinEvents].sort((a, b) => a.time - b.time || a.units - b.units);
  const slots = [];

  for (let slot = 0; slot < slotCount; slot += 1) {
    const event = sortedEvents[slot];
    if (!event) {
      slots.push({ time: "", amount: null });
      continue;
    }

    slots.push({
      time: formatTime(event.time),
      amount: round1(event.units),
    });
  }

  return slots;
}

function buildNoteColumnsForExport(day, columnCount) {
  const sortedNotes = [...day.notes].sort((a, b) => a.time - b.time);
  const columns = [];

  for (let column = 0; column < columnCount; column += 1) {
    const note = sortedNotes[column];
    columns.push(note ? `${formatTime(note.time)} ${note.text}` : "");
  }

  return columns;
}

function applyExportStyles(worksheet, rows, totalColumns) {
  const rowCount = rows.length;
  const titleRowIndex = 0;
  const disclaimerRowIndex = 1;
  const headerRowIndex = 3;
  const dataStartRowIndex = 4;
  const centerColumns = inferCenterAlignedColumns(rows, totalColumns);

  const boldStyle = { font: { bold: true } };
  const boldWrapStyle = { font: { bold: true }, alignment: { wrapText: true, vertical: "center", horizontal: "left" } };
  const titleStyle = {
    font: { bold: true, sz: 14 },
    alignment: { horizontal: "left", vertical: "center" },
  };
  const disclaimerStyle = {
    font: { italic: true, sz: 9, color: { rgb: "4C5A56" } },
    alignment: { horizontal: "left", vertical: "center", wrapText: true },
  };

  const titleCell = XLSX.utils.encode_cell({ r: titleRowIndex, c: 0 });
  if (worksheet[titleCell]) {
    mergeCellStyle(worksheet[titleCell], titleStyle);
  }

  const disclaimerCell = XLSX.utils.encode_cell({ r: disclaimerRowIndex, c: 0 });
  if (worksheet[disclaimerCell]) {
    mergeCellStyle(worksheet[disclaimerCell], disclaimerStyle);
  }

  for (let column = 0; column < totalColumns; column += 1) {
    const headerCell = XLSX.utils.encode_cell({ r: headerRowIndex, c: column });
    if (worksheet[headerCell]) {
      mergeCellStyle(worksheet[headerCell], boldWrapStyle);
      if (centerColumns[column]) {
        mergeCellStyle(worksheet[headerCell], { alignment: { horizontal: "center" } });
      }
    }
  }

  for (let row = 0; row < rowCount; row += 1) {
    const dateCell = XLSX.utils.encode_cell({ r: row + dataStartRowIndex, c: 0 });
    if (worksheet[dateCell]) {
      mergeCellStyle(worksheet[dateCell], boldStyle);
    }
  }

  for (let row = 0; row < rowCount; row += 1) {
    for (let column = 0; column < totalColumns; column += 1) {
      if (!centerColumns[column]) {
        continue;
      }

      const cellAddress = XLSX.utils.encode_cell({ r: row + dataStartRowIndex, c: column });
      const cell = worksheet[cellAddress];
      if (!cell) {
        continue;
      }

      mergeCellStyle(cell, {
        alignment: {
          horizontal: "center",
          vertical: "center",
        },
      });
    }
  }

  const totalRows = rowCount + dataStartRowIndex;
  for (let row = 0; row < totalRows; row += 1) {
    for (let column = 0; column < totalColumns; column += 1) {
      const cellAddress = XLSX.utils.encode_cell({ r: row, c: column });
      const cell = worksheet[cellAddress];
      if (!cell || typeof cell.v !== "string") {
        continue;
      }

      if (cell.v.includes("\n") || cell.v.includes("\r")) {
        mergeCellStyle(cell, {
          alignment: {
            wrapText: true,
            vertical: row <= headerRowIndex ? "center" : "top",
          },
        });
      }
    }
  }
}

function inferCenterAlignedColumns(rows, totalColumns) {
  const centerColumns = new Array(totalColumns).fill(false);

  for (let column = 0; column < totalColumns; column += 1) {
    let numericCount = 0;
    let timeCount = 0;
    let textCount = 0;

    for (const row of rows) {
      const value = row[column];
      if (value === null || value === undefined || value === "") {
        continue;
      }

      if (typeof value === "number") {
        numericCount += 1;
      } else if (isExcelTimeValue(value)) {
        timeCount += 1;
      } else {
        textCount += 1;
      }
    }

    if (numericCount + timeCount > 0 && textCount === 0) {
      centerColumns[column] = true;
    }
  }

  return centerColumns;
}

function isExcelTimeValue(value) {
  if (typeof value !== "string") {
    return false;
  }
  return /^\d{2}:\d{2}$/.test(value.trim());
}

function normalizeExcelText(value) {
  if (typeof value !== "string") {
    return value;
  }

  return value
    .replace(/\\n/g, "\n")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/\n/g, "\r\n");
}

function measureExcelCellWidth(value) {
  if (value === null || value === undefined) {
    return 0;
  }

  const text = String(value);
  const lines = text.split(/\r\n|\n|\r/);
  let maxLineLength = 0;

  for (const line of lines) {
    if (line.length > maxLineLength) {
      maxLineLength = line.length;
    }
  }

  return maxLineLength;
}

function countExcelCellLines(value) {
  if (value === null || value === undefined) {
    return 1;
  }
  const text = String(value);
  return text.split(/\r\n|\n|\r/).length;
}

function computeAutoColumnWidths(header, rows) {
  const totalColumns = header.length;
  const widths = new Array(totalColumns).fill(6);

  for (let column = 0; column < totalColumns; column += 1) {
    const lengths = [];
    lengths.push(measureExcelCellWidth(header[column]));

    for (const row of rows) {
      lengths.push(measureExcelCellWidth(row[column]));
    }

    const nonZero = lengths.filter((length) => length > 0).sort((a, b) => a - b);
    if (nonZero.length === 0) {
      widths[column] = 6;
      continue;
    }

    const maxLength = nonZero[nonZero.length - 1];
    const percentileIndex = Math.floor((nonZero.length - 1) * 0.9);
    const percentileLength = nonZero[percentileIndex];

    // Use p90 to avoid one outlier value forcing huge width.
    const targetLength = Math.max(measureExcelCellWidth(header[column]), Math.min(maxLength, percentileLength + 2));
    widths[column] = Math.max(6, Math.min(30, targetLength + 1));
  }

  return widths.map((width) => ({ wch: width }));
}

function computeAutoRowHeights(title, disclaimer, header, rows) {
  const rowHeights = [
    { hpt: Math.max(22, 14 * countExcelCellLines(title) + 8) },
    { hpt: Math.max(30, 12 * countExcelCellLines(disclaimer) + 10) },
    { hpt: 6 },
  ];

  let headerLineCount = 1;
  for (const cell of header) {
    headerLineCount = Math.max(headerLineCount, countExcelCellLines(cell));
  }
  rowHeights.push({ hpt: 14 * headerLineCount + 6 });

  for (const row of rows) {
    let lineCount = 1;
    for (const cell of row) {
      lineCount = Math.max(lineCount, countExcelCellLines(cell));
    }
    rowHeights.push({ hpt: 14 * lineCount + 4 });
  }

  return rowHeights;
}

function mergeCellStyle(cell, stylePatch) {
  const currentStyle = cell.s || {};
  const patchFont = stylePatch.font || {};
  const patchAlignment = stylePatch.alignment || {};

  cell.s = {
    ...currentStyle,
    ...stylePatch,
    font: {
      ...(currentStyle.font || {}),
      ...patchFont,
    },
    alignment: {
      ...(currentStyle.alignment || {}),
      ...patchAlignment,
    },
  };
}

function buildExportFileName(months = state.months) {
  const normalizedSource = buildSafeSourceBase();
  const monthPart = buildMonthRangeSlug(months);
  const timestamp = buildExportTimestamp();
  return `${normalizedSource}_${monthPart}_tagesexport_${timestamp}.xlsx`;
}

function buildExportSheetName(month, usedSheetNames = new Set()) {
  const baseName = `Monat_${month.year}_${pad2(month.month)}`.slice(0, 31);
  if (!usedSheetNames.has(baseName)) {
    return baseName;
  }

  let index = 2;
  while (true) {
    const suffix = `_${index}`;
    const candidate = `${baseName.slice(0, 31 - suffix.length)}${suffix}`;
    if (!usedSheetNames.has(candidate)) {
      return candidate;
    }
    index += 1;
  }
}

function round1(value) {
  return Math.round(value * 10) / 10;
}

function round1OrNull(value) {
  if (value === null || value === undefined) {
    return null;
  }
  return round1(value);
}

function appendCell(row, text) {
  const td = document.createElement("td");
  td.textContent = text;
  row.appendChild(td);
}

function appendGlucoseCell(row, value) {
  const td = document.createElement("td");
  td.textContent = formatMmol(value);

  if (value !== null && value !== undefined) {
    if (value > 10) {
      td.classList.add("value-high");
    } else if (value < 3.9) {
      td.classList.add("value-low");
    }
  }

  row.appendChild(td);
}

function renderDayDetail(day) {
  const month = state.monthsByKey.get(state.selectedMonthKey);
  elements.detailTitle.textContent = `${pad2(day.day)}.${pad2(month.month)}.${month.year} (${day.weekday})`;

  const avg = day.glucoseReadings.length ? day.glucoseReadings.reduce((sum, point) => sum + point.value, 0) / day.glucoseReadings.length : null;
  elements.detailSummary.textContent = `Tief ${formatMmol(day.low)} | Hoch ${formatMmol(day.high)} | Durchschnitt ${formatMmol(avg)} | Insulin Gesamt ${formatUnits(
    day.fastTotal + day.depotTotal
  )}E`;

  elements.notesList.innerHTML = "";
  if (day.notes.length === 0) {
    elements.notesList.appendChild(listItem("Keine Notizen."));
  } else {
    for (const note of day.notes) {
      elements.notesList.appendChild(listItem(`${formatTime(note.time)}: ${note.text}`));
    }
  }

  elements.dayInsulinList.innerHTML = "";
  if (day.insulinEvents.length === 0) {
    elements.dayInsulinList.appendChild(listItem("Keine Insulin-Ereignisse."));
  } else {
    for (const event of day.insulinEvents) {
      const kind = event.kind === "fast" ? "Schnellwirkend" : "Depot";
      elements.dayInsulinList.appendChild(listItem(`${formatTime(event.time)}: ${kind} ${event.units.toFixed(1)}E`));
    }
  }

  renderDayChart(day);
}

function renderDayChart(day) {
  if (day.glucoseReadings.length === 0) {
    elements.chartContainer.innerHTML = "<p class=\"chart-empty\">Keine Glukosewerte für diesen Tag.</p>";
    return;
  }

  const width = 920;
  const sidePad = { left: 48, right: 20 };
  const chartWidth = width - sidePad.left - sidePad.right;
  const xAt = (minute) => sidePad.left + (minute / 1440) * chartWidth;

  const sortedNotes = [...day.notes].sort((a, b) => a.time - b.time);
  const noteEntries = sortedNotes.map((note) => ({
    x: xAt(minutesOfDay(note.time)),
    label: `${formatTime(note.time)} ${truncateText(note.text, 22)}`,
  }));

  const minLabelX = sidePad.left + 4;
  const maxLabelX = width - sidePad.right - 4;
  const labelGap = 8;
  const estimatedCharWidth = 5;
  const laneLastRight = [];
  const notePlacements = [];

  for (const entry of noteEntries) {
    const textWidth = Math.max(34, entry.label.length * estimatedCharWidth);
    let placed = false;

    for (let lane = 0; lane < laneLastRight.length; lane += 1) {
      let left = Math.max(entry.x - textWidth / 2, minLabelX, laneLastRight[lane] + labelGap);
      if (left + textWidth <= maxLabelX) {
        laneLastRight[lane] = left + textWidth;
        notePlacements.push({ ...entry, lane, left, width: textWidth });
        placed = true;
        break;
      }
    }

    if (!placed) {
      const lane = laneLastRight.length;
      let left = Math.max(entry.x - textWidth / 2, minLabelX);
      if (left + textWidth > maxLabelX) {
        left = maxLabelX - textWidth;
      }
      laneLastRight.push(left + textWidth);
      notePlacements.push({ ...entry, lane, left, width: textWidth });
    }
  }

  const laneCount = Math.max(1, laneLastRight.length);
  const pad = { top: 16, right: sidePad.right, bottom: 74 + laneCount * 13, left: sidePad.left };
  const height = 260 + pad.bottom;
  const chartHeight = height - pad.top - pad.bottom;
  const chartBottom = height - pad.bottom;

  const values = day.glucoseReadings.map((point) => point.value);
  let yMin = Math.min(...values, 3.5);
  let yMax = Math.max(...values, 10.5);
  yMin = Math.floor((yMin - 0.4) * 2) / 2;
  yMax = Math.ceil((yMax + 0.4) * 2) / 2;

  const yAt = (value) => pad.top + ((yMax - value) / (yMax - yMin || 1)) * chartHeight;

  const sorted = [...day.glucoseReadings].sort((a, b) => a.time - b.time);
  const path = sorted
    .map((point, index) => {
      const x = xAt(minutesOfDay(point.time));
      const y = yAt(point.value);
      return `${index === 0 ? "M" : "L"}${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(" ");

  const scanDots = sorted
    .filter((point) => point.source === "scan")
    .map((point) => {
      const x = xAt(minutesOfDay(point.time));
      const y = yAt(point.value);
      return `<circle cx="${x.toFixed(2)}" cy="${y.toFixed(2)}" r="3.2" fill="#2f5a95" />`;
    })
    .join("");

  const insulinLines = day.insulinEvents
    .map((event) => {
      const x = xAt(minutesOfDay(event.time));
      const color = event.kind === "fast" ? "#df6a36" : "#2d8f74";
      return `<line x1="${x.toFixed(2)}" y1="${pad.top}" x2="${x.toFixed(2)}" y2="${chartBottom}" stroke="${color}" stroke-width="1.3" stroke-dasharray="5 4" opacity="0.85" />`;
    })
    .join("");

  const noteLines = day.notes
    .map((note) => {
      const x = xAt(minutesOfDay(note.time));
      return `<line x1="${x.toFixed(2)}" y1="${pad.top}" x2="${x.toFixed(2)}" y2="${chartBottom}" stroke="#7a2f6d" stroke-width="1.2" stroke-dasharray="2 4" opacity="0.88" />`;
    })
    .join("");

  const noteLeaderLines = notePlacements
    .map((placement) => {
      const laneY = chartBottom + 7 + placement.lane * 12;
      const centerX = placement.left + placement.width / 2;
      return `<path d="M ${placement.x.toFixed(2)} ${chartBottom} L ${placement.x.toFixed(2)} ${laneY} L ${centerX.toFixed(
        2
      )} ${laneY}" stroke="#7a2f6d" stroke-width="0.9" fill="none" opacity="0.65" />`;
    })
    .join("");

  const noteLabels = notePlacements
    .map((placement) => {
      const y = chartBottom + 18 + placement.lane * 12;
      return `<text x="${placement.left.toFixed(2)}" y="${y}" text-anchor="start" font-size="9" fill="#6a2b5f">${escapeSvgText(
        placement.label
      )}</text>`;
    })
    .join("");

  const insulinMarks = day.insulinEvents
    .map((event, index) => {
      const x = xAt(minutesOfDay(event.time));
      const y = event.kind === "fast" ? pad.top + 12 : pad.top + 26;
      const color = event.kind === "fast" ? "#df6a36" : "#2d8f74";
      const points = `${x},${y - 8} ${x - 6},${y + 6} ${x + 6},${y + 6}`;
      const labelY = y + 18 + (index % 2) * 12;
      return `<polygon points="${points}" fill="${color}" opacity="0.95" />
        <text x="${x + 8}" y="${labelY}" font-size="10" fill="#31403a">${event.units.toFixed(1)}E</text>`;
    })
    .join("");

  const targetTop = yAt(10);
  const targetBottom = yAt(3.9);

  const hourTicks = [];
  for (let hour = 0; hour <= 24; hour += 4) {
    const minute = hour * 60;
    const x = xAt(minute);
    hourTicks.push(`<line x1="${x}" y1="${pad.top}" x2="${x}" y2="${chartBottom}" stroke="rgba(22,33,31,0.1)" />`);
    hourTicks.push(
      `<text x="${x}" y="${chartBottom + 44}" text-anchor="middle" font-size="10" fill="#5b6662">${pad2(hour)}:00</text>`
    );
  }

  const yTicks = [yMin, 3.9, 10, yMax]
    .filter((value, index, array) => array.indexOf(value) === index)
    .map((value) => {
      const y = yAt(value);
      return `<line x1="${pad.left}" y1="${y}" x2="${width - pad.right}" y2="${y}" stroke="rgba(22,33,31,0.12)" />
        <text x="${pad.left - 8}" y="${y + 4}" text-anchor="end" font-size="10" fill="#5b6662">${value
          .toFixed(1)
          .replace(".", ",")}</text>`;
    })
    .join("");

  elements.chartContainer.innerHTML = `
    <svg viewBox="0 0 ${width} ${height}" width="100%" height="100%" role="img" aria-label="Glukoseverlauf">
      <rect x="${pad.left}" y="${pad.top}" width="${chartWidth}" height="${chartHeight}" fill="#ffffff" />
      <rect x="${pad.left}" y="${targetTop}" width="${chartWidth}" height="${targetBottom - targetTop}" fill="rgba(45,123,72,0.15)" />
      ${hourTicks.join("")}
      ${yTicks}
      ${insulinLines}
      ${noteLines}
      ${noteLeaderLines}
      <path d="${path}" fill="none" stroke="#2f5a95" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" />
      ${scanDots}
      ${insulinMarks}
      ${noteLabels}
      <line id="hoverLine" x1="0" y1="${pad.top}" x2="0" y2="${chartBottom}" stroke="#345578" stroke-width="1.2" opacity="0.85" visibility="hidden" />
      <circle id="hoverPoint" cx="0" cy="0" r="4" fill="#1d4f8d" stroke="#ffffff" stroke-width="1.3" visibility="hidden" />
      <text x="${pad.left + 6}" y="${pad.top + 13}" font-size="11" fill="#5b6662">Zielbereich 3,9 bis 10,0</text>
      <text x="${width - pad.right}" y="${pad.top + 13}" text-anchor="end" font-size="11" fill="#5b6662">mmol/L</text>
      <text x="${pad.left + 6}" y="${height - 8}" font-size="10" fill="#6a2b5f">Notizen unten kollisionsfrei, per Hilfslinien mit violetten Linien verknüpft</text>
    </svg>
  `;

  const svg = elements.chartContainer.querySelector("svg");
  const hoverLine = elements.chartContainer.querySelector("#hoverLine");
  const hoverPoint = elements.chartContainer.querySelector("#hoverPoint");
  const tooltip = document.createElement("div");
  tooltip.className = "chart-tooltip";
  tooltip.style.display = "none";
  elements.chartContainer.appendChild(tooltip);

  const hoverPoints = sorted.map((point) => ({
    x: xAt(minutesOfDay(point.time)),
    y: yAt(point.value),
    value: point.value,
    time: point.time,
    source: point.source,
  }));

  const hideHover = () => {
    hoverLine.setAttribute("visibility", "hidden");
    hoverPoint.setAttribute("visibility", "hidden");
    tooltip.style.display = "none";
  };

  svg.addEventListener("mouseleave", hideHover);
  svg.addEventListener("mousemove", (event) => {
    if (!hoverPoints.length) {
      hideHover();
      return;
    }

    const rect = svg.getBoundingClientRect();
    const containerRect = elements.chartContainer.getBoundingClientRect();
    const svgX = ((event.clientX - rect.left) / rect.width) * width;

    if (svgX < pad.left || svgX > width - pad.right) {
      hideHover();
      return;
    }

    let nearest = hoverPoints[0];
    let minDist = Math.abs(nearest.x - svgX);
    for (let i = 1; i < hoverPoints.length; i += 1) {
      const dist = Math.abs(hoverPoints[i].x - svgX);
      if (dist < minDist) {
        minDist = dist;
        nearest = hoverPoints[i];
      }
    }

    hoverLine.setAttribute("x1", nearest.x.toFixed(2));
    hoverLine.setAttribute("x2", nearest.x.toFixed(2));
    hoverLine.setAttribute("visibility", "visible");

    hoverPoint.setAttribute("cx", nearest.x.toFixed(2));
    hoverPoint.setAttribute("cy", nearest.y.toFixed(2));
    hoverPoint.setAttribute("visibility", "visible");

    const sourceLabel = nearest.source === "scan" ? "Scan" : "Verlauf";
    tooltip.textContent = `${formatTime(nearest.time)} • ${formatMmol(nearest.value)} mmol/L (${sourceLabel})`;
    tooltip.style.display = "block";

    const tooltipX = ((nearest.x / width) * rect.width) + (rect.left - containerRect.left);
    const tooltipY = ((nearest.y / height) * rect.height) + (rect.top - containerRect.top);
    const clampedX = Math.max(86, Math.min(containerRect.width - 86, tooltipX));
    tooltip.style.left = `${clampedX}px`;
    tooltip.style.top = `${tooltipY}px`;
  });
}

function highlightSelectedDay() {
  const rows = elements.dailyTableBody.querySelectorAll("tr");
  for (const row of rows) {
    row.classList.toggle("selected", row.dataset.dayKey === state.selectedDayKey);
  }
}

function listItem(text) {
  const li = document.createElement("li");
  li.textContent = text;
  return li;
}

function setDatasetMessage(text, isError = false) {
  elements.datasetMeta.textContent = text;
  elements.datasetMeta.style.color = isError ? "#8f2f24" : "";
}

function buildModelFromCsv(text) {
  const monthMap = new Map();
  const seen = new Set();
  let header = null;
  let columnMap = null;
  let rowCount = 0;
  let keptCount = 0;
  let duplicateCount = 0;
  let rangeStart = null;
  let rangeEnd = null;

  parseCsvRows(text, (row) => {
    if (!header) {
      const candidate = row.map((value) => value.trim());
      if (!candidate.includes("Aufzeichnungstyp") || !candidate.includes("Gerätezeitstempel")) {
        return;
      }
      header = candidate;
      columnMap = buildColumnMap(header);
      return;
    }

    rowCount += 1;

    const type = readCell(row, columnMap.type);
    const timestampText = readCell(row, columnMap.timestamp);
    const date = parseDateTime(timestampText);

    if (!date || !type) {
      return;
    }

    if (!rangeStart || date < rangeStart) {
      rangeStart = date;
    }
    if (!rangeEnd || date > rangeEnd) {
      rangeEnd = date;
    }

    const key = [
      type,
      timestampText,
      readCell(row, columnMap.glucoseHistory),
      readCell(row, columnMap.glucoseScan),
      readCell(row, columnMap.fastInsulin),
      readCell(row, columnMap.depotInsulin),
      readCell(row, columnMap.notes),
    ].join("|");

    if (seen.has(key)) {
      duplicateCount += 1;
      return;
    }
    seen.add(key);

    const month = ensureMonth(monthMap, date);
    const day = ensureDay(month, date);

    if (type === "0" || type === "1") {
      const raw = type === "0" ? readCell(row, columnMap.glucoseHistory) : readCell(row, columnMap.glucoseScan);
      const value = parseLocalizedNumber(raw);
      if (value !== null) {
        const point = { time: date, value, source: type === "0" ? "history" : "scan" };
        day.glucoseReadings.push(point);
        month.glucoseReadings.push(point);
        keptCount += 1;
      }
    }

    if (type === "4") {
      const fast = parseLocalizedNumber(readCell(row, columnMap.fastInsulin));
      const depot = parseLocalizedNumber(readCell(row, columnMap.depotInsulin));

      if (fast !== null && fast > 0) {
        const event = { time: date, units: fast, kind: "fast" };
        day.insulinEvents.push(event);
        month.insulinEvents.push(event);
        keptCount += 1;
      }
      if (depot !== null && depot > 0) {
        const event = { time: date, units: depot, kind: "depot" };
        day.insulinEvents.push(event);
        month.insulinEvents.push(event);
        keptCount += 1;
      }
    }

    if (type === "6") {
      const noteText = readCell(row, columnMap.notes).trim();
      if (noteText) {
        const note = { time: date, text: noteText };
        day.notes.push(note);
        month.notes.push(note);
        keptCount += 1;
      }
    }
  });

  const months = Array.from(monthMap.values())
    .map(finalizeMonth)
    .sort((a, b) => a.key.localeCompare(b.key));

  return {
    months,
    rowCount,
    keptCount,
    duplicateCount,
    rangeStart,
    rangeEnd,
  };
}

function parseCsvRows(text, onRow) {
  let row = [];
  let field = "";
  let inQuotes = false;

  const pushRow = () => {
    row.push(field);
    field = "";

    const hasContent = row.some((cell) => cell.length > 0);
    if (hasContent) {
      onRow(row);
    }
    row = [];
  };

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];

    if (char === '"') {
      if (inQuotes && text[i + 1] === '"') {
        field += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      row.push(field);
      field = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && text[i + 1] === "\n") {
        i += 1;
      }
      pushRow();
      continue;
    }

    field += char;
  }

  if (field.length > 0 || row.length > 0) {
    pushRow();
  }
}

function buildColumnMap(header) {
  return {
    type: header.indexOf("Aufzeichnungstyp"),
    timestamp: header.indexOf("Gerätezeitstempel"),
    glucoseHistory: header.indexOf("Glukosewert-Verlauf mmol/L"),
    glucoseScan: header.indexOf("Glukose-Scan mmol/L"),
    fastInsulin: header.indexOf("Schnellwirkendes Insulin (Einheiten)"),
    depotInsulin: header.indexOf("Depotinsulin (Einheiten)"),
    notes: header.indexOf("Notizen"),
  };
}

function readCell(row, index) {
  if (index < 0 || index >= row.length) {
    return "";
  }
  return row[index] || "";
}

function ensureMonth(monthMap, date) {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const key = `${year}-${pad2(month)}`;

  if (!monthMap.has(key)) {
    monthMap.set(key, {
      key,
      year,
      month,
      label: monthFormatter.format(new Date(year, month - 1, 1)),
      daysMap: new Map(),
      days: [],
      glucoseReadings: [],
      insulinEvents: [],
      notes: [],
      stats: null,
      daysWithGlucose: 0,
    });
  }

  return monthMap.get(key);
}

function ensureDay(month, date) {
  const day = date.getDate();
  const key = `${month.key}-${pad2(day)}`;

  if (!month.daysMap.has(key)) {
    const dateOnly = new Date(date.getFullYear(), date.getMonth(), day);
    month.daysMap.set(key, {
      key,
      day,
      date: dateOnly,
      weekday: weekdayFormatter.format(dateOnly),
      glucoseReadings: [],
      insulinEvents: [],
      notes: [],
      periodValues: {},
      high: null,
      low: null,
      fastTotal: 0,
      depotTotal: 0,
    });
  }

  return month.daysMap.get(key);
}

function finalizeMonth(month) {
  const daysInMonth = new Date(month.year, month.month, 0).getDate();

  for (let day = 1; day <= daysInMonth; day += 1) {
    const key = `${month.key}-${pad2(day)}`;
    if (!month.daysMap.has(key)) {
      const dateOnly = new Date(month.year, month.month - 1, day);
      month.daysMap.set(key, {
        key,
        day,
        date: dateOnly,
        weekday: weekdayFormatter.format(dateOnly),
        glucoseReadings: [],
        insulinEvents: [],
        notes: [],
        periodValues: {},
        high: null,
        low: null,
        fastTotal: 0,
        depotTotal: 0,
      });
    }
  }

  month.days = Array.from(month.daysMap.values()).sort((a, b) => a.day - b.day);

  month.glucoseReadings.sort((a, b) => a.time - b.time);
  month.insulinEvents.sort((a, b) => a.time - b.time);
  month.notes.sort((a, b) => a.time - b.time);

  month.daysWithGlucose = 0;

  for (const day of month.days) {
    day.glucoseReadings.sort((a, b) => a.time - b.time);
    day.insulinEvents.sort((a, b) => a.time - b.time);
    day.notes.sort((a, b) => a.time - b.time);

    if (day.glucoseReadings.length > 0) {
      month.daysWithGlucose += 1;
      const values = day.glucoseReadings.map((point) => point.value);
      day.low = Math.min(...values);
      day.high = Math.max(...values);
    }

    day.fastTotal = day.insulinEvents
      .filter((event) => event.kind === "fast")
      .reduce((sum, event) => sum + event.units, 0);
    day.depotTotal = day.insulinEvents
      .filter((event) => event.kind === "depot")
      .reduce((sum, event) => sum + event.units, 0);

    day.inRangePercent = computeInRangePercent(day.glucoseReadings);

    day.periodValues = buildInjectionScanValues(day);
  }

  const values = month.glucoseReadings.map((point) => point.value);
  const fastInsulin = month.insulinEvents
    .filter((event) => event.kind === "fast")
    .reduce((sum, event) => sum + event.units, 0);
  const depotInsulin = month.insulinEvents
    .filter((event) => event.kind === "depot")
    .reduce((sum, event) => sum + event.units, 0);

  month.stats = {
    min: values.length ? Math.min(...values) : null,
    max: values.length ? Math.max(...values) : null,
    avg: values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null,
    fastInsulin,
    depotInsulin,
    totalInsulin: fastInsulin + depotInsulin,
    inRangePercent: computeInRangePercent(month.glucoseReadings),
  };

  return month;
}

function buildInjectionScanValues(day) {
  const scanReadings = day.glucoseReadings.filter((point) => point.source === "scan").sort((a, b) => a.time - b.time);
  const values = {};

  for (const period of PERIODS) {
    const injection = chooseInjectionForPeriod(day.insulinEvents, period);
    const scan = injection ? findLastScanBeforeInjection(scanReadings, injection.time) : null;
    values[period.key] = scan ? scan.value : null;
  }

  return values;
}

function chooseInjectionForPeriod(events, period) {
  let best = null;
  let bestDistance = Infinity;

  for (const event of events) {
    if (event.kind !== period.insulinKind) {
      continue;
    }

    const minute = minutesOfDay(event.time);
    if (!minuteInPeriod(minute, period)) {
      continue;
    }

    const distance = distanceToTarget(minute, period);
    if (distance < bestDistance || (distance === bestDistance && best && event.time > best.time)) {
      best = event;
      bestDistance = distance;
    }
  }

  return best;
}

function findLastScanBeforeInjection(scanReadings, injectionTime) {
  let lastScan = null;

  for (const scan of scanReadings) {
    if (scan.time > injectionTime) {
      break;
    }
    lastScan = scan;
  }

  return lastScan;
}

function minuteInPeriod(minute, period) {
  if (!period.wraps) {
    return minute >= period.start && minute <= period.end;
  }
  return minute >= period.start || minute <= period.end;
}

function distanceToTarget(minute, period) {
  if (!period.wraps) {
    return Math.abs(minute - period.target);
  }
  const normalizedMinute = minute < period.start ? minute + 1440 : minute;
  const normalizedTarget = period.target < period.start ? period.target + 1440 : period.target;
  return Math.abs(normalizedMinute - normalizedTarget);
}

function parseDateTime(value) {
  const trimmed = (value || "").trim();
  if (!trimmed) {
    return null;
  }

  const [datePart, timePart] = trimmed.split(" ");
  if (!datePart || !timePart) {
    return null;
  }

  const [day, month, year] = datePart.split("-").map((part) => Number.parseInt(part, 10));
  const [hour, minute] = timePart.split(":").map((part) => Number.parseInt(part, 10));

  if ([day, month, year, hour, minute].some((part) => Number.isNaN(part))) {
    return null;
  }

  return new Date(year, month - 1, day, hour, minute);
}

function parseLocalizedNumber(value) {
  const normalized = (value || "").trim().replace(".", ".").replace(",", ".");
  if (!normalized) {
    return null;
  }
  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function minutesOfDay(date) {
  return date.getHours() * 60 + date.getMinutes();
}

function periodValue(day, key) {
  if (!day.periodValues || !(key in day.periodValues)) {
    return null;
  }
  return day.periodValues[key];
}

function formatMmol(value) {
  if (value === null || value === undefined) {
    return "-";
  }
  return value.toFixed(1).replace(".", ",");
}

function formatUnits(value) {
  if (value === null || value === undefined) {
    return "-";
  }
  return value.toFixed(1).replace(".", ",");
}

function formatPercent(value) {
  if (value === null || value === undefined) {
    return "-";
  }
  return `${value.toFixed(1).replace(".", ",")}%`;
}

function computeInRangePercent(readings) {
  if (!readings || readings.length === 0) {
    return null;
  }
  const count = readings.filter((entry) => entry.value >= 3.9 && entry.value <= 10).length;
  return (count / readings.length) * 100;
}

function formatDate(date) {
  return `${pad2(date.getDate())}.${pad2(date.getMonth() + 1)}.${date.getFullYear()}`;
}

function formatTime(date) {
  return `${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
}

function truncateText(text, maxLength) {
  const value = String(text || "");
  if (value.length <= maxLength) {
    return value;
  }
  return `${value.slice(0, maxLength - 1)}…`;
}

function escapeSvgText(text) {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function pad2(value) {
  return String(value).padStart(2, "0");
}
