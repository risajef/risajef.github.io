<template>
  <!-- Inline expression slot: shows ExprBlock if filled, else drop-target -->
  <span
    class="slot-drop"
    :class="{ 'slot-over': isOver, 'slot-filled': blockId }"
    :style="slotTone"
    :data-python-blocks-selectable="blockId ? null : 'zone'"
    data-python-blocks-zone-kind="slot"
    data-python-blocks-accept="expr"
    :data-parent-id="parentId"
    :data-slot-name="slotName ?? ''"
    :data-arg-index="argIndex ?? ''"
    :data-slot-label="label || ''"
    :tabindex="blockId ? null : 0"
    @dragover.prevent.stop="onDragover"
    @dragleave.stop="onDragleave"
    @drop.prevent.stop="onDrop"
  >
    <component :is="ExprBlock" v-if="blockId" :blockId="blockId" />
    <span v-else class="slot-empty">{{ label || '___' }}</span>
  </span>
</template>

<script setup>
import { computed, ref } from 'vue'
import ExprBlock from './ExprBlock.vue'
import { usePythonBlocksStore } from '../../store/python-blocks.js'

const props = defineProps({
  parentId: { type: String, required: true },
  slotName: { type: String, default: null },
  argIndex: { type: Number, default: null },
  label:    { type: String, default: '' },
})

const store = usePythonBlocksStore()

const blockId = computed(() => {
  const parent = store.blocks[props.parentId]
  if (!parent) return null
  if (props.slotName !== null) return parent.slots[props.slotName] ?? null
  if (props.argIndex !== null) return parent.args[props.argIndex] ?? null
  return null
})

const slotTone = computed(() => resolveSlotTone(props.slotName, props.label))

const isOver = ref(false)

function parseDrag(e) {
  try { return JSON.parse(e.dataTransfer.getData('text/plain')) } catch { return null }
}

function onDragover(e) {
  if (!e.dataTransfer.types.includes('application/x-python-blocks-e')) return  // only expr
  e.dataTransfer.dropEffect = e.dataTransfer.types.includes('application/x-python-blocks-palette')
    ? 'copy'
    : 'move'
  isOver.value = true
}

function onDragleave() { isOver.value = false }

function onDrop(e) {
  isOver.value = false
  const data = parseDrag(e)
  if (!data || data.isStmt) return

  let id = data.id
  if (data.source === 'palette') {
    id = store.createBlock(data.type)
  }

  if (props.slotName !== null) {
    store.dropInSlot(id, props.parentId, props.slotName)
  } else if (props.argIndex !== null) {
    store.dropInArg(id, props.parentId, props.argIndex)
  }
}

function resolveSlotTone(slotName, label) {
  const token = `${slotName || ''} ${label || ''}`.toLowerCase()

  if (/(callee|func|ctx)/.test(token)) {
    return SLOT_TONES.function
  }

  if (/(target|var|module|name|base|attr)/.test(token)) {
    return SLOT_TONES.variable
  }

  if (/(condition|cond|guard)/.test(token)) {
    return SLOT_TONES.operator
  }

  if (/(error|cause)/.test(token)) {
    return SLOT_TONES.control
  }

  return SLOT_TONES.value
}

const SLOT_TONES = {
  variable: {
    '--slot-border': '#d97706',
    '--slot-bg': 'rgba(254, 243, 199, 0.95)',
    '--slot-hover-bg': 'rgba(253, 230, 138, 0.98)',
    '--slot-text': '#92400e',
  },
  value: {
    '--slot-border': '#2563eb',
    '--slot-bg': 'rgba(219, 234, 254, 0.95)',
    '--slot-hover-bg': 'rgba(191, 219, 254, 0.98)',
    '--slot-text': '#1d4ed8',
  },
  function: {
    '--slot-border': '#7c3aed',
    '--slot-bg': 'rgba(237, 233, 254, 0.95)',
    '--slot-hover-bg': 'rgba(221, 214, 254, 0.98)',
    '--slot-text': '#5b21b6',
  },
  operator: {
    '--slot-border': '#4f46e5',
    '--slot-bg': 'rgba(224, 231, 255, 0.95)',
    '--slot-hover-bg': 'rgba(199, 210, 254, 0.98)',
    '--slot-text': '#3730a3',
  },
  control: {
    '--slot-border': '#c2410c',
    '--slot-bg': 'rgba(255, 237, 213, 0.96)',
    '--slot-hover-bg': 'rgba(254, 215, 170, 0.98)',
    '--slot-text': '#9a3412',
  },
}
</script>

<style scoped>
.slot-drop {
  --slot-border: #94a3b8;
  --slot-bg: rgba(241, 245, 249, 0.95);
  --slot-hover-bg: rgba(226, 232, 240, 0.98);
  --slot-text: #64748b;
  display: inline-flex;
  align-items: center;
  min-width: 36px;
  border-radius: 999px;
  transition: box-shadow 0.12s, background 0.12s, transform 0.12s;
  outline: none;
}
.slot-empty {
  display: inline-block;
  padding: 1px 8px;
  border: 2px dashed var(--slot-border);
  border-radius: 999px;
  background: var(--slot-bg);
  color: var(--slot-text);
  font-size: 11px;
  font-weight: 700;
  font-style: italic;
  min-width: 36px;
  text-align: center;
  cursor: default;
}
.slot-drop.slot-over .slot-empty {
  border-color: var(--slot-border);
  background: var(--slot-hover-bg);
  color: var(--slot-text);
}
.slot-drop.slot-over:not(.slot-filled) {
  box-shadow: 0 0 0 2px var(--slot-border);
  border-radius: 999px;
}
.slot-drop:focus-visible .slot-empty {
  background: var(--slot-hover-bg);
  box-shadow: 0 0 0 3px rgba(255,255,255,0.96), 0 0 0 6px color-mix(in srgb, var(--slot-border) 80%, white 20%), 0 0 18px color-mix(in srgb, var(--slot-border) 55%, transparent 45%);
}
.slot-drop:focus-visible {
  transform: scale(1.08);
}
</style>
