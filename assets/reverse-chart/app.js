const imageInput = document.querySelector("#imageInput");
const loadExample = document.querySelector("#loadExample");
const calibrateMode = document.querySelector("#calibrateMode");
const measureMode = document.querySelector("#measureMode");
const calibrationControls = document.querySelector("#calibrationControls");
const measureControls = document.querySelector("#measureControls");
const axisInput = document.querySelector("#axisInput");
const xScaleInput = document.querySelector("#xScaleInput");
const yScaleInput = document.querySelector("#yScaleInput");
const valueInput = document.querySelector("#valueInput");
const readout = document.querySelector("#readout");
const fitStatus = document.querySelector("#fitStatus");
const calibrationList = document.querySelector("#calibrationList");
const measurementList = document.querySelector("#measurementList");
const measureCount = document.querySelector("#measureCount");
const clearCalibration = document.querySelector("#clearCalibration");
const clearMeasurements = document.querySelector("#clearMeasurements");
const exportMeasurements = document.querySelector("#exportMeasurements");
const emptyState = document.querySelector("#emptyState");
const chartFrame = document.querySelector("#chartFrame");
const canvas = document.querySelector("#chartCanvas");
let fakeCursor = document.querySelector("#fakeCursor");
const ctx = canvas.getContext("2d");

if (!fakeCursor) {
  fakeCursor = document.createElement("div");
  fakeCursor.id = "fakeCursor";
  fakeCursor.className = "fake-cursor hidden";
  fakeCursor.setAttribute("aria-hidden", "true");
  chartFrame.insertBefore(fakeCursor, emptyState);
}
const magnifier = {
  radiusCss: 74,
  zoom: 3,
};

const state = {
  mode: "calibrate",
  image: null,
  imageName: "",
  imageUrl: "",
  scales: {
    x: "linear",
    y: "linear",
  },
  calibration: [],
  measurements: [],
  hover: null,
};

function setMode(mode) {
  state.mode = mode;
  calibrateMode.classList.toggle("active", mode === "calibrate");
  measureMode.classList.toggle("active", mode === "measure");
  calibrationControls.classList.toggle("hidden", mode !== "calibrate");
  measureControls.classList.toggle("hidden", mode !== "measure");
  updateReadout(state.hover);
  draw();
}

function loadImage(src, name) {
  const image = new Image();
  image.onload = () => {
    state.image = image;
    state.imageName = name;
    state.calibration = [];
    state.measurements = [];
    state.hover = null;
    sizeCanvas();
    emptyState.style.display = "none";
    updateLists();
    updateFitStatus();
    updateReadout(null);
    updateFakeCursor(null);
    draw();
  };
  image.src = src;
}

function loadImageFile(file) {
  if (!file || !file.type.startsWith("image/")) {
    readout.textContent = "Drop an image file to load a chart.";
    return;
  }

  if (state.imageUrl) URL.revokeObjectURL(state.imageUrl);
  state.imageUrl = URL.createObjectURL(file);
  loadImage(state.imageUrl, file.name);
}

function sizeCanvas() {
  if (!state.image) return;
  const frame = document.querySelector("#chartFrame");
  const availableWidth = Math.max(320, frame.clientWidth - 32);
  const availableHeight = Math.max(280, window.innerHeight - 80);
  const scale = Math.min(availableWidth / state.image.width, availableHeight / state.image.height, 1);

  canvas.width = state.image.width;
  canvas.height = state.image.height;
  canvas.style.width = `${Math.round(state.image.width * scale)}px`;
  canvas.style.height = `${Math.round(state.image.height * scale)}px`;
}

function getPointerPoint(event) {
  if (!state.image) return null;
  const rect = canvas.getBoundingClientRect();
  const x = (event.clientX - rect.left) * (canvas.width / rect.width);
  const y = (event.clientY - rect.top) * (canvas.height / rect.height);
  if (x < 0 || y < 0 || x > canvas.width || y > canvas.height) return null;
  return { x, y };
}

function clampPoint(point) {
  return {
    x: Math.min(Math.max(point.x, 0), canvas.width),
    y: Math.min(Math.max(point.y, 0), canvas.height),
  };
}

function getCenteredPoint() {
  return {
    x: canvas.width / 2,
    y: canvas.height / 2,
  };
}

function createPointId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function updateFakeCursor(point) {
  if (!point || !state.image) {
    fakeCursor.classList.add("hidden");
    return;
  }

  const canvasRect = canvas.getBoundingClientRect();
  const frameRect = chartFrame.getBoundingClientRect();
  const cssX = canvasRect.left - frameRect.left + point.x * (canvasRect.width / canvas.width);
  const cssY = canvasRect.top - frameRect.top + point.y * (canvasRect.height / canvas.height);
  fakeCursor.style.left = `${cssX}px`;
  fakeCursor.style.top = `${cssY}px`;
  fakeCursor.classList.remove("hidden");
}

function setCursorPoint(point) {
  state.hover = point ? clampPoint(point) : null;
  updateReadout(state.hover);
  updateFakeCursor(state.hover);
  draw();
}

function commitCursorPoint() {
  if (!state.hover) return;
  if (state.mode === "calibrate") addCalibration(state.hover);
  if (state.mode === "measure") addMeasurement(state.hover);
}

function addCalibration(point) {
  const value = Number(valueInput.value);
  if (!Number.isFinite(value)) {
    readout.textContent = "Enter a numeric calibration value before clicking the chart.";
    valueInput.focus();
    return;
  }

  const axis = axisInput.value;
  if (state.scales[axis] === "log" && value <= 0) {
    readout.textContent = "Logarithmic calibration values must be greater than zero.";
    valueInput.focus();
    return;
  }

  state.calibration.push({
    id: createPointId(),
    axis,
    value,
    x: point.x,
    y: point.y,
  });
  updateLists();
  updateFitStatus();
  updateReadout(point);
  draw();
}

function addMeasurement(point) {
  const values = computeValues(point);
  state.measurements.push({
    id: createPointId(),
    x: point.x,
    y: point.y,
  });
  updateLists();
  draw();
}

function transformValue(axis, value) {
  if (state.scales[axis] === "log") {
    if (value <= 0) return null;
    return Math.log10(value);
  }
  return value;
}

function inverseTransformValue(axis, fittedValue) {
  if (state.scales[axis] === "log") return 10 ** fittedValue;
  return fittedValue;
}

function fitAxis(axis) {
  const points = state.calibration
    .filter((point) => point.axis === axis)
    .map((point) => ({
      ...point,
      fitValue: transformValue(axis, point.value),
    }))
    .filter((point) => point.fitValue !== null);
  if (points.length < 2) return null;

  const pixelKey = axis === "x" ? "x" : "y";
  const n = points.length;
  const sumPixel = points.reduce((sum, point) => sum + point[pixelKey], 0);
  const sumValue = points.reduce((sum, point) => sum + point.fitValue, 0);
  const sumPixelValue = points.reduce((sum, point) => sum + point[pixelKey] * point.fitValue, 0);
  const sumPixelSquared = points.reduce((sum, point) => sum + point[pixelKey] * point[pixelKey], 0);
  const denominator = n * sumPixelSquared - sumPixel * sumPixel;

  if (Math.abs(denominator) < 0.000001) return null;

  const slope = (n * sumPixelValue - sumPixel * sumValue) / denominator;
  const intercept = (sumValue - slope * sumPixel) / n;
  return { slope, intercept, count: points.length };
}

function computeValues(point) {
  const xFit = fitAxis("x");
  const yFit = fitAxis("y");
  return {
    x: xFit ? inverseTransformValue("x", xFit.slope * point.x + xFit.intercept) : null,
    y: yFit ? inverseTransformValue("y", yFit.slope * point.y + yFit.intercept) : null,
  };
}

function formatPlainNumber(value, maximumFractionDigits = 12) {
  return new Intl.NumberFormat(undefined, {
    useGrouping: false,
    maximumFractionDigits,
  }).format(value);
}

function formatValue(value, axis = null) {
  if (value === null || value === undefined || !Number.isFinite(value)) return "not calibrated";
  if (axis && state.scales[axis] === "linear") return formatPlainNumber(value);
  const abs = Math.abs(value);
  if (abs >= 1000 || (abs > 0 && abs < 0.01)) return value.toExponential(3);
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: 3 }).format(value);
}

function formatPreciseValue(value) {
  if (value === null || value === undefined || !Number.isFinite(value)) return "";
  if (Number.isInteger(value)) return value.toString();
  return Number(value.toPrecision(15)).toString();
}

function formatScale(axis) {
  return state.scales[axis] === "log" ? "log" : "linear";
}

function updateReadout(point) {
  if (!state.image) {
    readout.textContent = "Upload or load a chart to begin.";
    return;
  }

  if (!point) {
    readout.textContent = state.mode === "calibrate"
      ? "Calibration mode: enter a value, choose X or Y, then click the chart."
      : "Measure mode: hover over the chart to read values.";
    return;
  }

  const values = computeValues(point);
  readout.innerHTML = `
    <strong>Pixel</strong> ${Math.round(point.x)}, ${Math.round(point.y)}<br>
    <strong>X</strong> ${formatValue(values.x, "x")} (${formatScale("x")})<br>
    <strong>Y</strong> ${formatValue(values.y, "y")} (${formatScale("y")})
  `;
}

function updateFitStatus() {
  const xFit = fitAxis("x");
  const yFit = fitAxis("y");
  const xCount = state.calibration.filter((point) => point.axis === "x").length;
  const yCount = state.calibration.filter((point) => point.axis === "y").length;
  const invalidX = state.scales.x === "log" ? state.calibration.filter((point) => point.axis === "x" && point.value <= 0).length : 0;
  const invalidY = state.scales.y === "log" ? state.calibration.filter((point) => point.axis === "y" && point.value <= 0).length : 0;

  const xValid = xCount - invalidX;
  const yValid = yCount - invalidY;
  const xText = xFit ? `X ${formatScale("x")} calibrated from ${xFit.count} point${xFit.count === 1 ? "" : "s"}` : `X ${formatScale("x")} needs ${Math.max(0, 2 - xValid)} more valid point${2 - xValid === 1 ? "" : "s"}`;
  const yText = yFit ? `Y ${formatScale("y")} calibrated from ${yFit.count} point${yFit.count === 1 ? "" : "s"}` : `Y ${formatScale("y")} needs ${Math.max(0, 2 - yValid)} more valid point${2 - yValid === 1 ? "" : "s"}`;
  const invalidText = [invalidX ? `${invalidX} invalid X log value${invalidX === 1 ? "" : "s"}` : "", invalidY ? `${invalidY} invalid Y log value${invalidY === 1 ? "" : "s"}` : ""]
    .filter(Boolean)
    .join(". ");
  fitStatus.textContent = `${xText}. ${yText}.${invalidText ? ` ${invalidText}.` : ""}`;
}

function updateLists() {
  calibrationList.innerHTML = "";
  state.calibration.forEach((point) => {
    const item = document.createElement("li");
    const isInvalidLogPoint = state.scales[point.axis] === "log" && point.value <= 0;
    const suffix = isInvalidLogPoint ? " (ignored for log scale)" : "";
    item.textContent = `${point.axis.toUpperCase()} = ${formatValue(point.value, point.axis)} at pixel ${Math.round(point.x)}, ${Math.round(point.y)}${suffix}`;
    calibrationList.append(item);
  });

  measurementList.innerHTML = "";
  state.measurements.forEach((point, index) => {
    const values = computeValues(point);
    const item = document.createElement("li");
    item.textContent = `${index + 1}. X ${formatPreciseValue(values.x)}, Y ${formatPreciseValue(values.y)} at pixel ${formatPreciseValue(point.x)}, ${formatPreciseValue(point.y)}`;
    measurementList.append(item);
  });
  measureCount.textContent = state.measurements.length;
}

function createMeasurementsCsv() {
  const rows = [["nr", "x measured", "y measured", "x pixel", "y pixel"]];
  state.measurements.forEach((point, index) => {
    const values = computeValues(point);
    rows.push([
      index + 1,
      formatPreciseValue(values.x),
      formatPreciseValue(values.y),
      formatPreciseValue(point.x),
      formatPreciseValue(point.y),
    ]);
  });
  return rows.map((row) => row.join(",")).join("\n");
}

function exportMeasuredCsv() {
  if (!state.measurements.length) {
    readout.textContent = "No measured points to export yet.";
    return;
  }

  const csv = createMeasurementsCsv();
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "measured-values.csv";
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

function drawMarker(point, color, label) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(point.x - 8, point.y);
  ctx.lineTo(point.x + 8, point.y);
  ctx.moveTo(point.x, point.y - 8);
  ctx.lineTo(point.x, point.y + 8);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(point.x, point.y, 4, 0, Math.PI * 2);
  ctx.fill();

  if (label) {
    ctx.font = "12px system-ui, sans-serif";
    const width = ctx.measureText(label).width + 10;
    const x = Math.min(point.x + 10, canvas.width - width - 4);
    const y = Math.max(18, point.y - 10);
    ctx.fillStyle = "rgba(255, 255, 255, 0.92)";
    ctx.fillRect(x, y - 15, width, 20);
    ctx.strokeStyle = color;
    ctx.strokeRect(x, y - 15, width, 20);
    ctx.fillStyle = color;
    ctx.fillText(label, x + 5, y);
  }
  ctx.restore();
}

function drawHover(point) {
  if (!point) return;
  ctx.save();
  ctx.strokeStyle = "rgba(15, 118, 110, 0.72)";
  ctx.lineWidth = 1;
  ctx.setLineDash([5, 5]);
  ctx.beginPath();
  ctx.moveTo(point.x, 0);
  ctx.lineTo(point.x, canvas.height);
  ctx.moveTo(0, point.y);
  ctx.lineTo(canvas.width, point.y);
  ctx.stroke();
  ctx.restore();
}

function drawMagnifier(point) {
  if (!point || !state.image) return;

  const rect = canvas.getBoundingClientRect();
  if (!rect.width || !rect.height) return;

  const canvasPerCssPixel = (canvas.width / rect.width + canvas.height / rect.height) / 2;
  const radius = magnifier.radiusCss * canvasPerCssPixel;
  const sourceRadius = radius / magnifier.zoom;
  const sourceLeft = point.x - sourceRadius;
  const sourceTop = point.y - sourceRadius;
  const clippedLeft = Math.max(0, sourceLeft);
  const clippedTop = Math.max(0, sourceTop);
  const clippedRight = Math.min(canvas.width, point.x + sourceRadius);
  const clippedBottom = Math.min(canvas.height, point.y + sourceRadius);
  const sourceWidth = clippedRight - clippedLeft;
  const sourceHeight = clippedBottom - clippedTop;

  if (sourceWidth <= 0 || sourceHeight <= 0) return;

  ctx.save();
  ctx.beginPath();
  ctx.arc(point.x, point.y, radius, 0, Math.PI * 2);
  ctx.clip();
  ctx.fillStyle = "white";
  ctx.fillRect(point.x - radius, point.y - radius, radius * 2, radius * 2);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(
    state.image,
    clippedLeft,
    clippedTop,
    sourceWidth,
    sourceHeight,
    point.x - radius + (clippedLeft - sourceLeft) * magnifier.zoom,
    point.y - radius + (clippedTop - sourceTop) * magnifier.zoom,
    sourceWidth * magnifier.zoom,
    sourceHeight * magnifier.zoom,
  );
  ctx.restore();

  const lineWidth = 2 * canvasPerCssPixel;
  const reticleOuter = 18 * canvasPerCssPixel;
  const reticleGap = 4 * canvasPerCssPixel;
  const reticleDot = 2.6 * canvasPerCssPixel;

  ctx.save();
  ctx.shadowColor = "rgba(15, 23, 42, 0.28)";
  ctx.shadowBlur = 10 * canvasPerCssPixel;
  ctx.shadowOffsetY = 3 * canvasPerCssPixel;
  ctx.strokeStyle = "white";
  ctx.lineWidth = 5 * canvasPerCssPixel;
  ctx.beginPath();
  ctx.arc(point.x, point.y, radius, 0, Math.PI * 2);
  ctx.stroke();
  ctx.shadowColor = "transparent";
  ctx.strokeStyle = getCssVar("--accent");
  ctx.lineWidth = lineWidth;
  ctx.stroke();

  ctx.lineCap = "round";
  ctx.strokeStyle = "rgba(15, 23, 42, 0.86)";
  ctx.lineWidth = lineWidth;
  ctx.beginPath();
  ctx.moveTo(point.x - reticleOuter, point.y);
  ctx.lineTo(point.x - reticleGap, point.y);
  ctx.moveTo(point.x + reticleGap, point.y);
  ctx.lineTo(point.x + reticleOuter, point.y);
  ctx.moveTo(point.x, point.y - reticleOuter);
  ctx.lineTo(point.x, point.y - reticleGap);
  ctx.moveTo(point.x, point.y + reticleGap);
  ctx.lineTo(point.x, point.y + reticleOuter);
  ctx.stroke();

  ctx.fillStyle = "rgba(220, 38, 38, 0.9)";
  ctx.beginPath();
  ctx.arc(point.x, point.y, reticleDot, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  if (!state.image) return;

  ctx.drawImage(state.image, 0, 0);
  state.calibration.forEach((point) => {
    const color = point.axis === "x" ? getCssVar("--x") : getCssVar("--y");
    drawMarker(point, color, `${point.axis.toUpperCase()} ${formatValue(point.value, point.axis)}`);
  });
  if (!state.hover) {
    state.measurements.forEach((point, index) => {
      drawMarker(point, getCssVar("--measure"), `${index + 1}`);
    });
  }
  drawHover(state.hover);
  drawMagnifier(state.hover);
}

function getCssVar(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

imageInput.addEventListener("change", (event) => {
  const [file] = event.target.files;
  loadImageFile(file);
});

loadExample.addEventListener("click", () => {
  loadImage("log_example.png", "Example chart");
});

["dragenter", "dragover"].forEach((eventName) => {
  chartFrame.addEventListener(eventName, (event) => {
    event.preventDefault();
    chartFrame.classList.add("drag-over");
  });
});

["dragleave", "drop"].forEach((eventName) => {
  chartFrame.addEventListener(eventName, () => {
    chartFrame.classList.remove("drag-over");
  });
});

chartFrame.addEventListener("drop", (event) => {
  event.preventDefault();
  const [file] = event.dataTransfer.files;
  loadImageFile(file);
});

calibrateMode.addEventListener("click", () => setMode("calibrate"));
measureMode.addEventListener("click", () => setMode("measure"));

xScaleInput.addEventListener("change", () => {
  state.scales.x = xScaleInput.value;
  updateLists();
  updateFitStatus();
  updateReadout(state.hover);
  draw();
});

yScaleInput.addEventListener("change", () => {
  state.scales.y = yScaleInput.value;
  updateLists();
  updateFitStatus();
  updateReadout(state.hover);
  draw();
});

canvas.addEventListener("click", (event) => {
  const point = getPointerPoint(event);
  if (!point) return;
  setCursorPoint(point);
  commitCursorPoint();
});

canvas.addEventListener("mousemove", (event) => {
  setCursorPoint(getPointerPoint(event));
});

canvas.addEventListener("mouseleave", () => {
  if (document.activeElement === canvas) return;
  setCursorPoint(null);
});

canvas.addEventListener("focus", () => {
  if (state.image && !state.hover) setCursorPoint(getCenteredPoint());
});

canvas.addEventListener("blur", () => {
  setCursorPoint(null);
});

canvas.addEventListener("keydown", (event) => {
  if (!state.image) return;

  const movement = {
    ArrowLeft: [-1, 0],
    ArrowRight: [1, 0],
    ArrowUp: [0, -1],
    ArrowDown: [0, 1],
  };
  const vector = movement[event.key];

  if (vector) {
    event.preventDefault();
    const step = event.altKey ? 0.1 : event.shiftKey ? 10 : 1;
    const current = state.hover || getCenteredPoint();
    setCursorPoint({
      x: current.x + vector[0] * step,
      y: current.y + vector[1] * step,
    });
    return;
  }

  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    if (!state.hover) setCursorPoint(getCenteredPoint());
    commitCursorPoint();
  }
});

clearCalibration.addEventListener("click", () => {
  state.calibration = [];
  updateLists();
  updateFitStatus();
  updateReadout(state.hover);
  draw();
});

clearMeasurements.addEventListener("click", () => {
  state.measurements = [];
  updateLists();
  draw();
});

exportMeasurements.addEventListener("click", exportMeasuredCsv);

window.addEventListener("resize", () => {
  sizeCanvas();
  updateFakeCursor(state.hover);
  draw();
});

updateFitStatus();
