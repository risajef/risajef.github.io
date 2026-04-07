<template>
  <aside class="palette">
    <div class="palette-title">
      Blocks
      <span v-if="store.simpleMode" class="palette-badge">Simple</span>
    </div>

    <div v-for="(items, cat) in grouped" :key="cat" class="palette-section">
      <div class="cat-label">{{ cat }}</div>
      <div
        v-for="type in items"
        :key="type"
        class="palette-item"
        :data-testid="`python-blocks-palette-item-${type}`"
        :style="{ background: DEFS[type].color, color: '#fff' }"
        :aria-label="helpFor(type).description"
        tabindex="0"
        draggable="true"
        @mouseenter="showTooltip(type, $event)"
        @mousemove="moveTooltip($event)"
        @mouseleave="hideTooltip"
        @focus="showTooltip(type, $event)"
        @blur="hideTooltip"
        @dragstart="onDragStart($event, type)"
      >
        {{ DEFS[type].label }}
      </div>
    </div>

    <div class="palette-note">{{ paletteNote }}</div>

    <teleport to="body">
      <div
        v-if="hoveredHelp"
        class="palette-tooltip"
        :data-testid="`python-blocks-palette-tooltip-${hoveredType}`"
        :style="tooltipStyle"
      >
        <div class="hint-title">{{ hoveredHelp.label }}</div>
        <div class="hint-body">{{ hoveredHelp.description }}</div>
        <pre class="hint-example">{{ hoveredHelp.example }}</pre>
      </div>
    </teleport>
  </aside>
</template>

<script setup>
import { computed, ref } from 'vue'
import { DEFS, isSimpleBlockType, usePythonBlocksStore } from '../../store/python-blocks.js'

const store = usePythonBlocksStore()

const hoveredType = ref(null)
const tooltipPosition = ref({ x: 24, y: 24 })

function snippet(...lines) {
  return lines.join('\n')
}

const BLOCK_HELP = {
  assign: { description: 'Store a value in a variable.', example: snippet('score = 0', 'score = score + bonus') },
  augAssign: { description: 'Update a variable using its current value.', example: snippet('score = 0', 'score += 1') },
  commentStmt: { description: 'Leave a note in the generated Python.', example: snippet('# TODO: tune threshold', '# Revisit after validation run') },
  exprStmt: { description: 'Evaluate an expression for its side effect.', example: snippet('items.append(value)', 'logger.info("saved")') },
  importStmt: { description: 'Import a whole module.', example: snippet('import logging', 'import torch') },
  fromImportStmt: { description: 'Import a name from a module.', example: snippet('from math import sqrt', 'from pathlib import Path') },
  print: { description: 'Send a value to the output.', example: snippet('name = "Reto"', 'print(f"Hello {name}")') },
  input: { description: 'Read text from the user.', example: snippet('name = input("Name?")', 'print(name)') },
  for: { description: 'Loop over a range or iterable.', example: snippet('for item in items:', '    print(item)') },
  while: { description: 'Repeat while a condition stays true.', example: snippet('while x < 10:', '    x += 1') },
  if: { description: 'Choose a branch based on a condition.', example: snippet('if ready:', '    print("go")', 'else:', '    print("wait")') },
  try: { description: 'Handle exceptions around risky code.', example: snippet('try:', '    risky()', 'except ValueError as err:', '    print(err)') },
  raiseStmt: { description: 'Raise an exception on purpose.', example: snippet('if not dataset_path:', '    raise ValueError("dataset_path is required")') },
  withStmt: { description: 'Run code inside a managed context.', example: snippet('with torch.no_grad():', '    prediction = model(batch)') },
  matchStmt: { description: 'Branch on patterns using case clauses.', example: snippet('match model_size:', '    case "tiny":', '        width = 64', '    case _:', '        width = 128') },
  funcDef: { description: 'Define a reusable function.', example: snippet('def greet(name):', '    return f"Hello {name}"') },
  classDef: { description: 'Define a class.', example: snippet('class Greeter:', '    def speak(self):', '        return "hi"') },
  return: { description: 'Send a value back from a function.', example: snippet('def total(xs):', '    return sum(xs)') },
  yieldStmt: { description: 'Produce a value from a generator function.', example: snippet('def rows(items):', '    for item in items:', '        yield item') },
  callStmt: { description: 'Call a function as a statement.', example: snippet('logger.info("loaded")', 'model.eval()') },
  break: { description: 'Exit the current loop early.', example: snippet('for item in items:', '    if item is None:', '        break') },
  continue: { description: 'Skip straight to the next loop iteration.', example: snippet('for item in items:', '    if item is None:', '        continue') },
  var: { description: 'Reference a variable name.', example: snippet('total', 'dataset_path') },
  bool: { description: 'Use a real boolean literal.', example: snippet('True', 'False') },
  num: { description: 'Use a numeric literal.', example: snippet('42', '0.001') },
  str: { description: 'Use a short string literal.', example: snippet('"hello"', '"cuda"') },
  longStr: { description: 'Use a multiline string literal.', example: snippet('"""Training notes', 'best checkpoint: epoch 12', '"""') },
  formatStr: { description: 'Build a string with inline values.', example: snippet('f"Epoch {epoch}: loss={loss:.4f}"') },
  rawStr: { description: 'Keep backslashes and escapes literal.', example: snippet('r"C:\\models\\best.pt"', 'r"\\d+\\.csv"') },
  binOp: { description: 'Combine two values with math.', example: snippet('width * height', 'loss + regularizer') },
  compare: { description: 'Compare two values.', example: snippet('count >= limit', 'dataset_path is None') },
  boolOp: { description: 'Combine boolean conditions.', example: snippet('ready and valid', 'has_gpu or force_cpu') },
  conditionalExpr: { description: 'Choose one value inline.', example: snippet('"ok" if passed else "retry"') },
  not: { description: 'Invert a condition.', example: snippet('not done', 'not np.isfinite(loss)') },
  memberExpr: { description: 'Access an attribute on an object.', example: snippet('model.eval', 'batch.image') },
  subscriptExpr: { description: 'Index into a list, dict, or array.', example: snippet('items[0]', 'checkpoint["model_state_dict"]') },
  sliceExpr: { description: 'Take part of a sequence.', example: snippet('text[1:4]', 'image[:, :, ::-1]') },
  tupleExpr: { description: 'Pack several values together.', example: snippet('x, y', 'key, val') },
  listExpr: { description: 'Create a list literal.', example: snippet('[first, second]', '[loss, accuracy]') },
  listCompExpr: { description: 'Build a list from a loop.', example: snippet('[name.strip() for name in names]', '[item * 2 for item in values if item > 0]') },
  dictEntryExpr: { description: 'Create one dictionary key-value pair.', example: snippet('"name": value', '"loss": metrics.loss') },
  dictExpr: { description: 'Create a dictionary literal.', example: snippet('{"name": value}', '{"loss": loss, "epoch": epoch}') },
  dictCompExpr: { description: 'Build a dictionary from a loop.', example: snippet('{str(key): serialize_value(val)', ' for key, val in value.items()}') },
  generatorExpr: { description: 'Stream values into calls like any(...) or all(...).', example: snippet('any("train.py" in arg for arg in cmdline)', 'all(item > 0 for item in values)') },
  yieldExpr: { description: 'Yield inside an expression context.', example: snippet('value = (yield item)', 'chunk = (yield from stream)') },
  callExpr: { description: 'Call a function inside an expression.', example: snippet('max(a, b)', 'serialize_value(val)') },
  lambda: { description: 'Create a small inline function.', example: snippet('lambda x: x + 1') },
}

const grouped = computed(() => {
  const result = {}
  for (const [type, def] of Object.entries(DEFS)) {
    if (def.palette === false) continue
    if (store.simpleMode && !isSimpleBlockType(type)) continue
    if (!result[def.cat]) result[def.cat] = []
    result[def.cat].push(type)
  }
  return result
})

const paletteNote = computed(() => store.simpleMode
  ? 'Simple mode shows a smaller Turing-complete set: variables, booleans, basic values, lists, conditionals, and while-based control flow.'
  : 'Hover any block for a real snippet, then drag it onto the canvas.')

const hoveredHelp = computed(() => hoveredType.value ? helpFor(hoveredType.value) : null)
const tooltipStyle = computed(() => ({
  left: `${tooltipPosition.value.x}px`,
  top: `${tooltipPosition.value.y}px`,
}))

function helpFor(type) {
  const def = DEFS[type]
  return {
    label: def?.label ?? type,
    description: BLOCK_HELP[type]?.description ?? 'Build this Python construct by dragging blocks into its slots.',
    example: BLOCK_HELP[type]?.example ?? def?.label ?? type,
  }
}

function showTooltip(type, event) {
  hoveredType.value = type
  updateTooltipPosition(event)
}

function onDragStart(e, type) {
  hideTooltip()
  const def = DEFS[type]
  e.dataTransfer.effectAllowed = 'copyMove'
  e.dataTransfer.setData('text/plain', JSON.stringify({ source: 'palette', type, isStmt: def.stmt }))
  // Type hint readable during dragover (getData blocked by browser security)
  e.dataTransfer.setData(def.stmt ? 'application/x-python-blocks-s' : 'application/x-python-blocks-e', '1')
  e.dataTransfer.setData('application/x-python-blocks-palette', '1')
}

function moveTooltip(event) {
  updateTooltipPosition(event)
}

function hideTooltip() {
  hoveredType.value = null
}

function updateTooltipPosition(event) {
  if (typeof window === 'undefined') return

  const targetRect = event?.currentTarget?.getBoundingClientRect?.()
  const x = typeof event?.clientX === 'number' ? event.clientX + 18 : (targetRect?.right || 16) + 14
  const y = typeof event?.clientY === 'number' ? event.clientY + 18 : (targetRect?.top || 16) + 12

  tooltipPosition.value = {
    x: Math.max(12, Math.min(x, window.innerWidth - 360)),
    y: Math.max(12, Math.min(y, window.innerHeight - 260)),
  }
}
</script>

<style scoped>
.palette {
  width: 216px;
  flex-shrink: 0;
  background: #1e293b;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  padding-bottom: 16px;
}
.palette-title {
  padding: 10px 12px 6px;
  font-weight: 700;
  font-size: 13px;
  color: #94a3b8;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  border-bottom: 1px solid #334155;
  margin-bottom: 4px;
}
.palette-badge {
  display: inline-flex;
  margin-left: 8px;
  padding: 2px 6px;
  border-radius: 999px;
  background: #0f766e;
  color: #ecfeff;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.04em;
}
.palette-section { padding: 4px 8px; }
.cat-label {
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: #64748b;
  margin: 6px 0 3px 2px;
}
.palette-item {
  padding: 5px 10px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;
  cursor: grab;
  margin-bottom: 3px;
  user-select: none;
  transition: filter 0.1s;
}
.palette-item:hover { filter: brightness(1.15); }
.palette-item:active { cursor: grabbing; }
.palette-note {
  margin: 10px 12px 0;
  padding: 10px 12px 0;
  border-top: 1px solid #334155;
  font-size: 11px;
  color: #94a3b8;
  line-height: 1.5;
}
.palette-tooltip {
  position: fixed;
  z-index: 80;
  width: min(340px, calc(100vw - 24px));
  padding: 12px;
  border-radius: 12px;
  background: rgba(2, 6, 23, 0.96);
  border: 1px solid rgba(148, 163, 184, 0.22);
  box-shadow: 0 18px 40px rgba(2, 6, 23, 0.45);
  pointer-events: none;
  backdrop-filter: blur(10px);
}
.hint-title {
  color: #e2e8f0;
  font-size: 13px;
  font-weight: 700;
  margin-bottom: 4px;
}
.hint-body {
  color: #94a3b8;
  margin-bottom: 8px;
}
.hint-example {
  display: block;
  margin: 0;
  padding: 10px 12px;
  border-radius: 8px;
  background: #020617;
  color: #cbd5e1;
  font-family: 'Fira Code', 'Consolas', 'Courier New', monospace;
  font-size: 12px;
  line-height: 1.6;
  white-space: pre-wrap;
}
</style>
