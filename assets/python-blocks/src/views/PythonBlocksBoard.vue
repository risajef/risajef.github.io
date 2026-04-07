<template>
  <div class="python-blocks-board" ref="boardRef">
    <!-- Header -->
    <header class="sb-header">
      <div class="sb-header-left">
        <span class="sb-title">🐍 Python Blocks Editor</span>
      </div>
      <div class="sb-header-right">
        <button
          class="mode-btn"
          :class="{ 'mode-btn--active': store.simpleMode }"
          data-testid="python-blocks-simple-toggle"
          :aria-pressed="String(store.simpleMode)"
          @click="store.setSimpleMode(!store.simpleMode)"
        >
          {{ store.simpleMode ? 'Simple blocks: on' : 'Simple blocks: off' }}
        </button>
        <button class="clear-btn" @click="store.clearAll()">Clear canvas</button>
      </div>
    </header>

    <!-- 3-column body -->
    <div class="sb-body">
      <BlockPalette />

      <!-- Canvas -->
      <main ref="canvasRef" class="sb-canvas" @keydown.capture="onCanvasKeydown" @focusin="onCanvasFocusIn" @scroll.passive="updateZoneSelectorPosition()">
        <BodyDrop :parentId="null" bodyKey="body" />
      </main>

      <CodePanel />
    </div>

    <PythonBlocksRuntimePanel />

    <teleport to="body">
      <div
        v-if="zoneSelectorTarget"
        class="zone-selector"
        :style="zoneSelectorStyle"
        data-testid="python-blocks-zone-selector"
      >
        <div class="zone-selector__header">
          <span>{{ zoneSelectorTarget.dataset.pythonBlocksAccept === 'stmt' ? 'Statement' : 'Expression' }} selector</span>
          <span class="zone-selector__query">{{ zoneQuery || 'type to filter' }}</span>
        </div>
        <div v-if="filteredZoneTypes.length" class="zone-selector__list">
          <button
            v-for="(type, index) in filteredZoneTypes"
            :key="type"
            class="zone-selector__item"
            :class="{ 'zone-selector__item--active': index === zoneSelectorIndex }"
            type="button"
            @mousedown.prevent="commitZoneSelection(zoneSelectorTarget, type)"
          >
            <span>{{ DEFS[type].label }}</span>
            <small>{{ type }}</small>
          </button>
        </div>
        <div v-else class="zone-selector__empty">No matching blocks.</div>
      </div>
    </teleport>
  </div>
</template>

<script setup>
import { nextTick, onBeforeUnmount, onMounted, ref, watch, computed } from 'vue'
import '../components/python-blocks/StatBlock.vue'
import '../components/python-blocks/ExprBlock.vue'
import BlockPalette from '../components/python-blocks/BlockPalette.vue'
import BodyDrop     from '../components/python-blocks/BodyDrop.vue'
import CodePanel    from '../components/python-blocks/CodePanel.vue'
import PythonBlocksRuntimePanel from '../components/python-blocks/PythonBlocksRuntimePanel.vue'
import { DEFS, isSimpleBlockType, usePythonBlocksStore } from '../store/python-blocks.js'

const store = usePythonBlocksStore()
const boardRef = ref(null)
const canvasRef = ref(null)
const zoneSelectorTarget = ref(null)
const zoneQuery = ref('')
const zoneSelectorIndex = ref(0)
const zoneSelectorPosition = ref({ x: 0, y: 0 })

const zoneSelectorStyle = computed(() => ({
  left: `${zoneSelectorPosition.value.x}px`,
  top: `${zoneSelectorPosition.value.y}px`,
}))

const filteredZoneTypes = computed(() => {
  if (!zoneSelectorTarget.value) return []
  return availableTypesForZone(zoneSelectorTarget.value).filter((type) => matchesZoneQuery(type, zoneQuery.value))
})

const SEARCH_ALIASES = {
  bool: 'boolean true false yes no',
  yieldStmt: 'yield yield from generator',
  yieldExpr: 'yield yield from generator',
  var: 'variable identifier name',
  num: 'number integer float int',
  str: 'string text',
  longStr: 'multiline triple quoted string',
  formatStr: 'f string fstring interpolation template',
  rawStr: 'raw string regex path windows backslash',
  listExpr: 'list array',
  listCompExpr: 'list comprehension',
  generatorExpr: 'generator any all exists',
  callStmt: 'call invoke function',
  callExpr: 'call invoke function',
}

onMounted(() => {
  nextTick(() => focusFirstSelectable())
  window.addEventListener('resize', updateZoneSelectorPosition)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', updateZoneSelectorPosition)
})

watch(() => store.pythonCode, async () => {
  await nextTick()
  const active = document.activeElement
  if (active && canvasRef.value?.contains(active)) return
  focusFirstSelectable()
})

function getSelectables() {
  if (!canvasRef.value) return []
  return Array.from(canvasRef.value.querySelectorAll('[data-python-blocks-selectable]')).filter((element) => {
    if (!(element instanceof HTMLElement)) return false
    return element.offsetParent !== null
  })
}

function focusFirstSelectable() {
  const first = getSelectables()[0]
  if (first instanceof HTMLElement) {
    first.focus({ preventScroll: true })
  }
}

function closestSelectable(element) {
  return element instanceof HTMLElement ? element.closest('[data-python-blocks-selectable]') : null
}

function moveSelection(delta) {
  const items = getSelectables()
  if (!items.length) return

  const current = closestSelectable(document.activeElement)
  const currentIndex = current ? items.indexOf(current) : -1
  const nextIndex = currentIndex === -1
    ? 0
    : (currentIndex + delta + items.length) % items.length

  const next = items[nextIndex]
  if (next instanceof HTMLElement) {
    closeZoneSelector()
    next.focus({ preventScroll: true })
    next.scrollIntoView({ block: 'nearest', inline: 'nearest' })
  }
}

function onCanvasFocusIn(event) {
  const selectable = closestSelectable(event.target)
  if (!selectable) {
    closeZoneSelector()
    return
  }

  if (selectable.dataset.pythonBlocksSelectable !== 'zone') {
    closeZoneSelector()
  } else if (zoneSelectorTarget.value && selectable !== zoneSelectorTarget.value) {
    closeZoneSelector()
  }
}

function onCanvasKeydown(event) {
  const activeElement = document.activeElement
  if (!(activeElement instanceof HTMLElement) || !canvasRef.value?.contains(activeElement)) {
    return
  }

  if (activeElement.matches('[data-python-blocks-editor="true"]')) {
    if (event.key === 'Escape') {
      event.preventDefault()
      const selectable = closestSelectable(activeElement)
      if (selectable instanceof HTMLElement) {
        selectable.focus({ preventScroll: true })
      }
    }
    return
  }

  const selectable = closestSelectable(activeElement)
  if (!(selectable instanceof HTMLElement)) {
    return
  }

  if (selectable.dataset.pythonBlocksSelectable === 'zone') {
    handleZoneKeydown(event, selectable)
    return
  }

  if (isNavigationKey(event.key)) {
    event.preventDefault()
    moveSelection(event.key === 'ArrowLeft' || event.key === 'ArrowUp' ? -1 : 1)
    return
  }

  if ((event.key === 'Enter' || isPrintableKey(event)) && selectable.dataset.pythonBlocksTerminal === 'true') {
    event.preventDefault()
    focusTerminalEditor(selectable, isPrintableKey(event) ? event.key : '')
  }
}

function handleZoneKeydown(event, selectable) {
  if (zoneSelectorTarget.value === selectable && filteredZoneTypes.value.length) {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      zoneSelectorIndex.value = (zoneSelectorIndex.value + 1) % filteredZoneTypes.value.length
      return
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault()
      zoneSelectorIndex.value = (zoneSelectorIndex.value - 1 + filteredZoneTypes.value.length) % filteredZoneTypes.value.length
      return
    }
    if (event.key === 'Enter') {
      event.preventDefault()
      commitZoneSelection(selectable, filteredZoneTypes.value[zoneSelectorIndex.value])
      return
    }
  }

  if (event.key === 'Escape') {
    closeZoneSelector()
    return
  }

  if (event.key === 'Backspace') {
    event.preventDefault()
    if (!zoneSelectorTarget.value) {
      openZoneSelector(selectable)
    }
    zoneQuery.value = zoneQuery.value.slice(0, -1)
    zoneSelectorIndex.value = 0
    updateZoneSelectorPosition(selectable)
    if (!zoneQuery.value && !filteredZoneTypes.value.length) {
      closeZoneSelector()
    }
    return
  }

  if (isPrintableKey(event)) {
    event.preventDefault()
    if (zoneSelectorTarget.value !== selectable) {
      openZoneSelector(selectable)
    }
    zoneQuery.value += event.key
    zoneSelectorIndex.value = 0
    updateZoneSelectorPosition(selectable)
    return
  }

  if (isNavigationKey(event.key)) {
    event.preventDefault()
    moveSelection(event.key === 'ArrowLeft' || event.key === 'ArrowUp' ? -1 : 1)
  }
}

function openZoneSelector(selectable) {
  zoneSelectorTarget.value = selectable
  zoneQuery.value = ''
  zoneSelectorIndex.value = 0
  updateZoneSelectorPosition(selectable)
}

function closeZoneSelector() {
  zoneSelectorTarget.value = null
  zoneQuery.value = ''
  zoneSelectorIndex.value = 0
}

function updateZoneSelectorPosition(selectable = zoneSelectorTarget.value) {
  if (!(selectable instanceof HTMLElement)) return
  const rect = selectable.getBoundingClientRect()
  zoneSelectorPosition.value = {
    x: Math.max(12, Math.min(rect.left + 12, window.innerWidth - 320)),
    y: Math.max(12, Math.min(rect.bottom + 10, window.innerHeight - 240)),
  }
}

function availableTypesForZone(selectable) {
  const accept = selectable.dataset.pythonBlocksAccept
  return Object.entries(DEFS)
    .filter(([, def]) => def.palette !== false && (accept === 'stmt' ? def.stmt : !def.stmt))
    .filter(([type]) => !store.simpleMode || isSimpleBlockType(type))
    .map(([type]) => type)
}

function matchesZoneQuery(type, query) {
  const trimmed = query.trim().toLowerCase()
  if (!trimmed) return true
  const def = DEFS[type]
  const haystack = `${type} ${def.label} ${def.cat} ${SEARCH_ALIASES[type] || ''}`.toLowerCase()
  return haystack.includes(trimmed)
}

async function commitZoneSelection(selectable, type) {
  if (!type) return

  const blockId = store.createBlock(type)
  if (selectable.dataset.pythonBlocksZoneKind === 'body') {
    store.dropInBody(
      blockId,
      selectable.dataset.parentId || null,
      selectable.dataset.bodyKey || 'body',
      selectable.dataset.insertBeforeId || null,
    )
  } else if (selectable.dataset.slotName) {
    store.dropInSlot(blockId, selectable.dataset.parentId, selectable.dataset.slotName)
  } else if (selectable.dataset.argIndex !== '') {
    store.dropInArg(blockId, selectable.dataset.parentId, Number(selectable.dataset.argIndex))
  }

  closeZoneSelector()
  await focusBlockOrEditor(blockId)
}

async function focusBlockOrEditor(blockId) {
  const block = await waitForBlockElement(blockId)
  if (!(block instanceof HTMLElement)) {
    focusFirstSelectable()
    return
  }

  if (block.dataset.pythonBlocksTerminal === 'true') {
    focusTerminalEditor(block)
    return
  }

  block.focus({ preventScroll: true })
}

async function waitForBlockElement(blockId) {
  await nextTick()
  const existing = canvasRef.value?.querySelector(`[data-python-blocks-block-id="${blockId}"]`)
  if (existing instanceof HTMLElement) {
    return existing
  }

  if (!canvasRef.value || typeof MutationObserver === 'undefined') {
    return null
  }

  return new Promise((resolve) => {
    const observer = new MutationObserver(async () => {
      await nextTick()
      const block = canvasRef.value?.querySelector(`[data-python-blocks-block-id="${blockId}"]`)
      if (block instanceof HTMLElement) {
        window.clearTimeout(timeoutId)
        observer.disconnect()
        resolve(block)
      }
    })

    const timeoutId = window.setTimeout(() => {
      observer.disconnect()
      resolve(null)
    }, 4000)

    observer.observe(canvasRef.value, { childList: true, subtree: true })
  })
}

function focusTerminalEditor(selectable, initialText = '') {
  const editor = selectable.querySelector('[data-python-blocks-editor="true"]')
  if (!(editor instanceof HTMLElement)) return
  editor.focus({ preventScroll: true })

  if (initialText && (editor instanceof HTMLInputElement || editor instanceof HTMLTextAreaElement)) {
    const start = editor.selectionStart ?? editor.value.length
    const end = editor.selectionEnd ?? editor.value.length
    editor.setRangeText(initialText, start, end, 'end')
    editor.dispatchEvent(new Event('input', { bubbles: true }))
  }
}

function isPrintableKey(event) {
  return event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey
}

function isNavigationKey(key) {
  return ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(key)
}
</script>

<style scoped>
.python-blocks-board {
  display: flex;
  flex-direction: column;
  height: 100vh;
  overflow: hidden;
  background: #f1f5f9;
  font-family: 'Inter', 'Segoe UI', sans-serif;
}

.sb-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 16px;
  height: 46px;
  background: #0f172a;
  color: #e2e8f0;
  flex-shrink: 0;
  border-bottom: 1px solid #1e293b;
}
.sb-header-left { display: flex; align-items: center; gap: 16px; }
.back-link { color: #94a3b8; font-size: 13px; text-decoration: none; }
.back-link:hover { color: #e2e8f0; }
.sb-title { font-size: 15px; font-weight: 700; color: #f1f5f9; }
.sb-header-right { display: flex; gap: 8px; }
.clear-btn {
  background: #1e293b;
  border: 1px solid #334155;
  color: #94a3b8;
  border-radius: 5px;
  padding: 4px 12px;
  font-size: 12px;
  cursor: pointer;
}
.clear-btn:hover { background: #7f1d1d; border-color: #991b1b; color: #fca5a5; }
.mode-btn {
  background: #1e293b;
  border: 1px solid #334155;
  color: #94a3b8;
  border-radius: 5px;
  padding: 4px 12px;
  font-size: 12px;
  cursor: pointer;
}
.mode-btn:hover {
  background: #1d4ed8;
  border-color: #2563eb;
  color: #dbeafe;
}
.mode-btn--active {
  background: #0f766e;
  border-color: #14b8a6;
  color: #ecfeff;
}

.sb-body {
  display: flex;
  flex: 1;
  overflow: hidden;
  min-height: 0;
}

.sb-canvas {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  background: #f8fafc;
  background-image:
    radial-gradient(circle, #cbd5e1 1px, transparent 1px);
  background-size: 24px 24px;
}
.zone-selector {
  position: fixed;
  z-index: 90;
  width: min(300px, calc(100vw - 24px));
  border-radius: 12px;
  border: 2px solid rgba(37, 99, 235, 0.55);
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.99), rgba(239, 246, 255, 0.98));
  box-shadow: 0 0 0 4px rgba(147, 197, 253, 0.35), 0 22px 44px rgba(15, 23, 42, 0.24);
  overflow: hidden;
}
.zone-selector__header {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  padding: 10px 12px;
  background: linear-gradient(90deg, #0f172a, #1d4ed8);
  color: #eff6ff;
  font-size: 12px;
  font-weight: 700;
}
.zone-selector__query {
  color: #bfdbfe;
  font-family: 'Fira Code', 'Consolas', 'Courier New', monospace;
}
.zone-selector__list {
  display: flex;
  flex-direction: column;
  max-height: 220px;
  overflow-y: auto;
}
.zone-selector__item {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  width: 100%;
  padding: 10px 12px;
  border: none;
  background: #fff;
  color: #0f172a;
  font-size: 13px;
  text-align: left;
  cursor: pointer;
}
.zone-selector__item small {
  color: #64748b;
  font-size: 11px;
}
.zone-selector__item:hover,
.zone-selector__item--active {
  background: linear-gradient(90deg, #dbeafe, #bfdbfe);
  box-shadow: inset 0 0 0 2px rgba(37, 99, 235, 0.8);
}
.zone-selector__empty {
  padding: 12px;
  color: #64748b;
  font-size: 12px;
}
</style>
