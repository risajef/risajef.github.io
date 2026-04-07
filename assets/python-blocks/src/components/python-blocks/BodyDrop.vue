<template>
  <!-- A vertical sequence of statement blocks with drop zones between them -->
  <div class="body-drop" :class="{ 'body-root': !parentId, 'body-nested': !!parentId }">
    <!-- interleave: [zone-0, block-0, zone-1, block-1, ..., zone-n] -->
    <template v-for="(item, idx) in items" :key="item.key">
      <!-- Drop zone -->
      <div
        v-if="item.kind === 'zone'"
        class="drop-zone"
        :data-testid="isEmptyRoot && item.key === 'z-start' ? 'python-blocks-empty-root-zone' : undefined"
        data-python-blocks-selectable="zone"
        data-python-blocks-zone-kind="body"
        data-python-blocks-accept="stmt"
        :data-parent-id="parentId || ''"
        :data-body-key="bodyKey"
        :data-insert-before-id="item.insertBeforeId || ''"
        tabindex="0"
        :class="{ 'dz-over': dzOver === item.key, 'empty-root-zone': isEmptyRoot && item.key === 'z-start' }"
        @dragover.prevent.stop="onZoneOver(item, $event)"
        @dragleave.stop="dzOver = null"
        @drop.prevent.stop="onZoneDrop(item, $event)"
      >
        <span v-if="dzOver === item.key" class="dz-label">Drop here</span>
        <span v-else-if="isEmptyRoot && item.key === 'z-start'" class="empty-hint">
          ↑ Drag statement blocks from the left panel and drop them anywhere here
        </span>
      </div>

      <!-- Block -->
      <component
        v-else
        :is="StatBlock"
        :blockId="item.id"
      />
    </template>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import StatBlock from './StatBlock.vue'
import { usePythonBlocksStore } from '../../store/python-blocks.js'

const props = defineProps({
  parentId: { type: String, default: null },
  bodyKey:  { type: String, default: 'body' }, // 'body' | 'elseBody'
})

const store = usePythonBlocksStore()

const blockIds = computed(() => {
  return store.getBodyArray(props.parentId, props.bodyKey) ?? []
})

const isEmptyRoot = computed(() => props.parentId === null && blockIds.value.length === 0)

/** Interleaved list: zone → block → zone → block → … → zone */
const items = computed(() => {
  const ids = blockIds.value
  const result = []
  result.push({ kind: 'zone', insertBeforeId: ids[0] ?? null, key: `z-start` })
  for (let i = 0; i < ids.length; i++) {
    result.push({ kind: 'block', id: ids[i], key: ids[i] })
    result.push({ kind: 'zone', insertBeforeId: ids[i + 1] ?? null, key: `z-${i}` })
  }
  return result
})

const dzOver = ref(null)

function parseDrag(e) {
  try { return JSON.parse(e.dataTransfer.getData('text/plain')) } catch { return null }
}

function onZoneOver(item, e) {
  if (!e.dataTransfer.types.includes('application/x-python-blocks-s')) return  // only stmts
  e.dataTransfer.dropEffect = e.dataTransfer.types.includes('application/x-python-blocks-palette')
    ? 'copy'
    : 'move'
  dzOver.value = item.key
}

function onZoneDrop(item, e) {
  dzOver.value = null
  const data = parseDrag(e)
  if (!data || !data.isStmt) return

  let id = data.id
  if (data.source === 'palette') {
    id = store.createBlock(data.type)
  }
  store.dropInBody(id, props.parentId, props.bodyKey, item.insertBeforeId)
}
</script>

<style scoped>
.body-drop {
  display: flex;
  flex-direction: column;
  width: 100%;
  min-width: 0;
  box-sizing: border-box;
}
.body-root {
  flex: 1;
  padding: 8px 16px 40px;
  min-height: 100%;
  box-sizing: border-box;
}
.body-nested {
  width: calc(100% - 20px);
  min-width: 0;
  margin-left: 20px;
  border-radius: 0 0 6px 6px;
  box-sizing: border-box;
}
.drop-zone {
  height: 6px;
  border-radius: 3px;
  transition: height 0.12s ease, background 0.12s ease, box-shadow 0.12s ease, transform 0.12s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  outline: none;
}
.drop-zone:focus-visible {
  height: 36px;
  background: #fed7aa;
  border: 3px solid #f97316;
  border-radius: 6px;
  box-shadow: 0 0 0 4px rgba(251, 146, 60, 0.28), 0 0 18px rgba(249, 115, 22, 0.32);
  transform: scaleY(1.05);
}
.drop-zone.empty-root-zone {
  min-height: 320px;
  height: auto;
  flex: 1;
  margin-top: 16px;
  border: 2px dashed #c2410c;
  background: rgba(255, 247, 237, 0.92);
}
.drop-zone.dz-over {
  height: 36px;
  background: #ffedd5;
  border: 3px dashed #ea580c;
  border-radius: 6px;
}
.drop-zone.empty-root-zone.dz-over {
  height: auto;
  min-height: 320px;
}
.dz-label {
  font-size: 11px;
  color: #c2410c;
  font-weight: 600;
  pointer-events: none;
}
.empty-hint {
  text-align: center;
  color: #9a3412;
  font-size: 14px;
  line-height: 1.6;
  pointer-events: none;
  user-select: none;
}
.stat-block {
  border-left: 0;
}
</style>
