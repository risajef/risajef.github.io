const PERIODS = [
  { key: "morning", label: "Morgen", start: 4 * 60, end: 10 * 60 + 59, target: 8 * 60, wraps: false },
  { key: "midday", label: "Mittag", start: 11 * 60, end: 15 * 60 + 59, target: 13 * 60, wraps: false },
  { key: "evening", label: "Abend", start: 16 * 60, end: 21 * 60 + 59, target: 19 * 60, wraps: false },
  { key: "night", label: "Nacht", start: 22 * 60, end: 3 * 60 + 59, target: 23 * 60, wraps: true },
];

const monthFormatter = new Intl.DateTimeFormat("de-CH", { month: "long", year: "numeric" });
const weekdayFormatter = new Intl.DateTimeFormat("de-CH", { weekday: "short" });

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
}

function processCsvText(text, sourceLabel) {
  setDatasetMessage("CSV wird verarbeitet...");

  const parseResult = buildModelFromCsv(text);

  if (parseResult.months.length === 0) {
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

    for (const period of PERIODS) {
      const chosen = choosePeriodValue(day.glucoseReadings, period);
      day.periodValues[period.key] = chosen ? chosen.value : null;
    }
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

function choosePeriodValue(points, period) {
  let best = null;
  let bestDistance = Infinity;

  for (const point of points) {
    const minute = minutesOfDay(point.time);
    if (!minuteInPeriod(minute, period)) {
      continue;
    }

    const distance = distanceToTarget(minute, period);
    if (distance < bestDistance || (distance === bestDistance && best && point.time > best.time)) {
      best = point;
      bestDistance = distance;
    }

    if (!best) {
      best = point;
      bestDistance = distance;
    }
  }

  return best;
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
  const normalized = minute < period.start ? minute + 1440 : minute;
  return Math.abs(normalized - period.target);
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
