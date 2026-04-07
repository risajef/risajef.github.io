<template>
  <span
    v-if="block"
    class="expr-block"
    :data-python-blocks-selectable="'node'"
    :data-python-blocks-block-id="blockId"
    :data-python-blocks-terminal="String(isTerminalNode)"
    tabindex="0"
    :style="{ background: def.color }"
    :class="{ dragging: isDragging }"
    draggable="true"
    @dragstart.stop="onDragStart"
    @dragend.stop="isDragging = false"
    @dblclick.stop="store.deleteBlock(blockId)"
    title="Double-click to delete"
  >
    <!-- var -->
    <template v-if="block.type === 'var'">
      <input v-model="block.value" class="expr-input" placeholder="name"
        data-python-blocks-editor="true"
        :size="getBlockInputSize(block.value, 'name', 6, 40)"
        @click.stop @input="store.refresh()" />
    </template>

    <template v-else-if="block.type === 'bool'">
      <select v-model="block.value" class="expr-select" data-python-blocks-editor="true" @click.stop @change="store.refresh()">
        <option value="True">True</option>
        <option value="False">False</option>
      </select>
    </template>

    <!-- num -->
    <template v-else-if="block.type === 'num'">
      <input v-model="block.value" class="expr-input" placeholder="0"
        data-python-blocks-editor="true"
        :size="getBlockInputSize(block.value, '0', 3, 16)"
        @click.stop @input="store.refresh()" />
    </template>

    <!-- str -->
    <template v-else-if="block.type === 'str'">
      <span class="op-ch">"</span>
      <input v-model="block.value" class="expr-input" placeholder="text"
        data-python-blocks-editor="true"
        :size="getBlockInputSize(block.value, 'text', 6, 40)"
        @click.stop @input="store.refresh()" />
      <span class="op-ch">"</span>
    </template>

    <template v-else-if="block.type === 'longStr'">
      <span class="op-ch">"""</span>
      <textarea
        v-model="block.value"
        class="expr-textarea"
        data-python-blocks-editor="true"
        placeholder="text"
        @click.stop
        @input="store.refresh()"
      />
      <span class="op-ch">"""</span>
    </template>

    <template v-else-if="block.type === 'formatStr'">
      <span class="op-ch">f{{ stringQuote(block) }}</span>
      <button class="expr-mode" @click.stop="toggleStringQuoteMode(block)">{{ block.tripleQuoted ? 'triple' : 'inline' }}</button>
      <textarea
        v-if="block.tripleQuoted"
        v-model="block.value"
        class="expr-textarea"
        data-python-blocks-editor="true"
        placeholder="text {value}"
        @click.stop
        @input="store.refresh()"
      />
      <input
        v-else
        v-model="block.value"
        class="expr-input"
        data-python-blocks-editor="true"
        :size="getBlockInputSize(block.value, 'text {value}', 12, 72)"
        placeholder="text {value}"
        @click.stop
        @input="store.refresh()"
      />
      <span class="op-ch">{{ stringQuote(block) }}</span>
    </template>

    <template v-else-if="block.type === 'rawStr'">
      <span class="op-ch">r{{ stringQuote(block) }}</span>
      <button class="expr-mode" @click.stop="toggleStringQuoteMode(block)">{{ block.tripleQuoted ? 'triple' : 'inline' }}</button>
      <textarea
        v-if="block.tripleQuoted"
        v-model="block.value"
        class="expr-textarea"
        data-python-blocks-editor="true"
        placeholder="raw text"
        @click.stop
        @input="store.refresh()"
      />
      <input
        v-else
        v-model="block.value"
        class="expr-input"
        data-python-blocks-editor="true"
        :size="getBlockInputSize(block.value, 'raw text', 10, 72)"
        placeholder="raw text"
        @click.stop
        @input="store.refresh()"
      />
      <span class="op-ch">{{ stringQuote(block) }}</span>
    </template>

    <template v-else-if="block.type === 'rawExpr'">
      <input
        v-model="block.value"
        class="expr-input"
        data-python-blocks-editor="true"
        :size="getBlockInputSize(block.value, 'raw expr', 14, 80)"
        placeholder="raw expr"
        @click.stop
        @input="store.refresh()"
      />
    </template>

    <!-- binOp / compare / boolOp -->
    <template v-else-if="['binOp','compare','boolOp'].includes(block.type)">
      <SlotDrop :parentId="blockId" slotName="left" />
      <select v-model="block.op" class="expr-select" @click.stop @change="store.refresh()">
        <option v-for="op in def.ops" :key="op">{{ op }}</option>
      </select>
      <SlotDrop :parentId="blockId" slotName="right" />
    </template>

    <template v-else-if="block.type === 'conditionalExpr'">
      <SlotDrop :parentId="blockId" slotName="whenTrue" label="true" />
      <span class="kw-badge">if</span>
      <SlotDrop :parentId="blockId" slotName="condition" label="cond" />
      <span class="kw-badge">else</span>
      <SlotDrop :parentId="blockId" slotName="whenFalse" label="false" />
    </template>

    <!-- not -->
    <template v-else-if="block.type === 'not'">
      <span class="kw-badge">not</span>
      <SlotDrop :parentId="blockId" slotName="value" />
    </template>

    <template v-else-if="block.type === 'memberExpr'">
      <SlotDrop :parentId="blockId" slotName="value" />
      <span class="op-ch">.</span>
      <input
        v-model="block.name"
        class="expr-input"
        data-python-blocks-editor="true"
        :size="getBlockInputSize(block.name, 'attr', 6, 32)"
        placeholder="attr"
        @click.stop
        @input="store.refresh()"
      />
    </template>

    <template v-else-if="block.type === 'subscriptExpr'">
      <SlotDrop :parentId="blockId" slotName="value" />
      <span class="op-ch">[</span>
      <SlotDrop :parentId="blockId" slotName="index" />
      <span class="op-ch">]</span>
    </template>

    <template v-else-if="block.type === 'sliceExpr'">
      <SlotDrop :parentId="blockId" slotName="start" label="start" />
      <span class="op-ch">:</span>
      <SlotDrop :parentId="blockId" slotName="end" label="end" />
      <span class="op-ch">:</span>
      <SlotDrop :parentId="blockId" slotName="step" label="step" />
    </template>

    <template v-else-if="block.type === 'tupleExpr'">
      <template v-for="(argId, i) in block.args" :key="i">
        <SlotDrop :parentId="blockId" :argIndex="i" />
        <span v-if="i < block.args.length - 1" class="op-ch">,</span>
      </template>
      <button class="expr-add" @click.stop="store.addArgSlot(blockId)" title="Add item">+</button>
      <button v-if="block.args.length" class="expr-add" @click.stop="store.removeArgSlot(blockId, block.args.length-1)" title="Remove last item">−</button>
    </template>

    <template v-else-if="block.type === 'listExpr'">
      <span class="op-ch">[</span>
      <template v-for="(argId, i) in block.args" :key="i">
        <SlotDrop :parentId="blockId" :argIndex="i" />
        <span v-if="i < block.args.length - 1" class="op-ch">,</span>
      </template>
      <button class="expr-add" @click.stop="store.addArgSlot(blockId)" title="Add item">+</button>
      <button v-if="block.args.length" class="expr-add" @click.stop="store.removeArgSlot(blockId, block.args.length-1)" title="Remove last item">−</button>
      <span class="op-ch">]</span>
    </template>

    <template v-else-if="block.type === 'listCompExpr'">
      <span class="op-ch">[</span>
      <SlotDrop :parentId="blockId" slotName="value" label="value" />
      <span class="kw-badge">for</span>
      <input
        v-model="block.targetPattern"
        class="expr-input"
        data-python-blocks-editor="true"
        :size="getBlockInputSize(block.targetPattern, 'item', 6, 32)"
        placeholder="item"
        @click.stop
        @input="store.refresh()"
      />
      <span class="kw-badge">in</span>
      <SlotDrop :parentId="blockId" slotName="iterable" label="items" />
      <input
        v-model="block.filterText"
        class="expr-input"
        data-python-blocks-editor="true"
        :size="getBlockInputSize(block.filterText, 'if cond', 8, 32)"
        placeholder="if cond"
        @click.stop
        @input="store.refresh()"
      />
      <span class="op-ch">]</span>
    </template>

    <template v-else-if="block.type === 'dictEntryExpr'">
      <SlotDrop :parentId="blockId" slotName="key" />
      <span class="op-ch">:</span>
      <SlotDrop :parentId="blockId" slotName="value" />
    </template>

    <template v-else-if="block.type === 'dictExpr'">
      <span class="op-ch">{</span>
      <template v-for="(argId, i) in block.args" :key="i">
        <SlotDrop :parentId="blockId" :argIndex="i" />
        <span v-if="i < block.args.length - 1" class="op-ch">,</span>
      </template>
      <button class="expr-add" @click.stop="store.addArgSlot(blockId)" title="Add entry">+</button>
      <button v-if="block.args.length" class="expr-add" @click.stop="store.removeArgSlot(blockId, block.args.length-1)" title="Remove last entry">−</button>
      <span class="op-ch">}</span>
    </template>

    <template v-else-if="block.type === 'dictCompExpr'">
      <span class="op-ch">{</span>
      <SlotDrop :parentId="blockId" slotName="key" label="key" />
      <span class="op-ch">:</span>
      <SlotDrop :parentId="blockId" slotName="value" label="value" />
      <span class="kw-badge">for</span>
      <input
        v-model="block.targetPattern"
        class="expr-input"
        data-python-blocks-editor="true"
        :size="getBlockInputSize(block.targetPattern, 'key, val', 8, 32)"
        placeholder="key, val"
        @click.stop
        @input="store.refresh()"
      />
      <span class="kw-badge">in</span>
      <SlotDrop :parentId="blockId" slotName="iterable" label="items" />
      <input
        v-model="block.filterText"
        class="expr-input"
        data-python-blocks-editor="true"
        :size="getBlockInputSize(block.filterText, 'if cond', 8, 32)"
        placeholder="if cond"
        @click.stop
        @input="store.refresh()"
      />
      <span class="op-ch">}</span>
    </template>

    <template v-else-if="block.type === 'generatorExpr'">
      <span class="op-ch">(</span>
      <SlotDrop :parentId="blockId" slotName="value" label="value" />
      <span class="kw-badge">for</span>
      <input
        v-model="block.targetPattern"
        class="expr-input"
        data-python-blocks-editor="true"
        :size="getBlockInputSize(block.targetPattern, 'item', 6, 32)"
        placeholder="item"
        @click.stop
        @input="store.refresh()"
      />
      <span class="kw-badge">in</span>
      <SlotDrop :parentId="blockId" slotName="iterable" label="items" />
      <input
        v-model="block.filterText"
        class="expr-input"
        data-python-blocks-editor="true"
        :size="getBlockInputSize(block.filterText, 'if cond', 8, 32)"
        placeholder="if cond"
        @click.stop
        @input="store.refresh()"
      />
      <span class="op-ch">)</span>
    </template>

    <template v-else-if="block.type === 'yieldExpr'">
      <span class="kw-badge">yield</span>
      <button class="expr-mode" @click.stop="toggleYieldMode(block)">{{ block.yieldFrom ? 'from' : 'value' }}</button>
      <SlotDrop :parentId="blockId" slotName="value" label="value" />
    </template>

    <!-- callExpr -->
    <template v-else-if="block.type === 'callExpr'">
      <template v-if="block.slots?.callee">
        <SlotDrop :parentId="blockId" slotName="callee" label="func" />
      </template>
      <input v-else v-model="block.name" class="expr-input" placeholder="func"
        :size="getBlockInputSize(block.name, 'func', 8, 48)"
        @click.stop @input="store.refresh()" />
      <span class="op-ch">(</span>
      <template v-for="(argId, i) in block.args" :key="i">
        <SlotDrop :parentId="blockId" :argIndex="i" />
        <span v-if="i < block.args.length - 1" class="op-ch">,</span>
      </template>
      <button class="expr-add" @click.stop="store.addArgSlot(blockId)" title="Add argument">+</button>
      <button v-if="block.args.length" class="expr-add" @click.stop="store.removeArgSlot(blockId, block.args.length-1)" title="Remove last arg">−</button>
      <span class="op-ch">)</span>
    </template>

    <template v-else-if="block.type === 'lambda'">
      <span class="kw-badge">lambda</span>
      <template v-for="(_, i) in block.params" :key="i">
        <input v-model="block.params[i]" class="expr-input" placeholder="arg"
          data-python-blocks-editor="true"
          :size="getBlockInputSize(block.params[i], 'arg', 4, 24)"
          @click.stop @input="store.refresh()" />
        <button class="expr-add" @click.stop="store.removeParam(blockId, i)" title="Remove parameter">−</button>
        <span v-if="i < block.params.length - 1" class="op-ch">,</span>
      </template>
      <button class="expr-add" @click.stop="store.addParam(blockId)" title="Add parameter">+</button>
      <span class="op-ch">:</span>
      <SlotDrop :parentId="blockId" slotName="value" />
    </template>
  </span>
</template>

<script setup>
import { computed, ref } from 'vue'
import SlotDrop from './SlotDrop.vue'
import { usePythonBlocksStore, DEFS } from '../../store/python-blocks.js'
import { getBlockInputSize } from '../../utilities/block-input-sizing.js'

const props = defineProps({ blockId: { type: String, required: true } })

const store = usePythonBlocksStore()
const block = computed(() => store.blocks[props.blockId])
const def   = computed(() => DEFS[block.value?.type] || {})
const isDragging = ref(false)
const isTerminalNode = computed(() => TERMINAL_EXPR_TYPES.has(block.value?.type))

const TERMINAL_EXPR_TYPES = new Set(['var', 'bool', 'num', 'str', 'longStr', 'formatStr', 'rawStr', 'rawExpr'])

function onDragStart(e) {
  isDragging.value = true
  e.dataTransfer.effectAllowed = 'move'
  e.dataTransfer.setData('text/plain', JSON.stringify({
    source: 'canvas', type: block.value?.type, id: props.blockId, isStmt: false,
  }))
  e.dataTransfer.setData('application/x-python-blocks-e', '1')
  e.dataTransfer.setData('application/x-python-blocks-canvas', '1')
}

function toggleYieldMode(targetBlock) {
  targetBlock.yieldFrom = !targetBlock.yieldFrom
  store.refresh()
}

function toggleStringQuoteMode(targetBlock) {
  targetBlock.tripleQuoted = !targetBlock.tripleQuoted
  store.refresh()
}

function stringQuote(targetBlock) {
  return targetBlock.tripleQuoted ? '"""' : '"'
}
</script>

<style scoped>
.expr-block {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 600;
  color: #fff;
  cursor: grab;
  user-select: none;
  transition: filter 0.1s, opacity 0.15s, box-shadow 0.12s, transform 0.12s;
  white-space: nowrap;
  padding: 2px 6px;
  box-shadow: inset 0 0 0 1px rgba(255,255,255,0.10);
  outline: none;
}
.expr-block:hover { filter: brightness(1.12); }
.expr-block:focus-visible {
  box-shadow:
    0 0 0 3px rgba(255,255,255,0.95),
    0 0 0 6px rgba(250, 204, 21, 0.98),
    0 0 18px rgba(250, 204, 21, 0.55),
    inset 0 0 0 1px rgba(255,255,255,0.18);
  transform: translateY(-1px) scale(1.02);
}
.expr-block:active { cursor: grabbing; }
.expr-block.dragging { opacity: 0.45; }
.expr-input {
  background: rgba(255,255,255,0.25);
  border: none;
  border-radius: 4px;
  color: #fff;
  font-size: 12px;
  font-weight: 600;
  padding: 0 4px;
  min-width: 32px;
  width: auto;
  max-width: 100%;
  box-sizing: border-box;
  outline: none;
}
.expr-textarea {
  background: rgba(255,255,255,0.25);
  border: none;
  border-radius: 4px;
  color: #fff;
  font-size: 12px;
  font-weight: 600;
  min-width: 120px;
  min-height: 44px;
  outline: none;
  padding: 4px;
  resize: both;
}
.expr-textarea::placeholder { color: rgba(255,255,255,0.5); }
.expr-textarea:focus { background: rgba(255,255,255,0.35); }
.expr-input::placeholder { color: rgba(255,255,255,0.5); }
.expr-input:focus { background: rgba(255,255,255,0.35); }
.expr-select {
  background: rgba(255,255,255,0.25);
  border: none;
  border-radius: 4px;
  color: #fff;
  font-size: 12px;
  font-weight: 700;
  padding: 0 2px;
  cursor: pointer;
  outline: none;
}
.expr-select option {
  color: #1a1a1a;
  background: #ffffff;
}
.op-ch {
  font-size: 11px;
  opacity: 0.75;
}
.kw-badge {
  font-size: 11px;
  font-weight: 700;
  opacity: 0.9;
}
.expr-add {
  background: rgba(255,255,255,0.25);
  border: none;
  border-radius: 4px;
  color: #fff;
  font-size: 13px;
  font-weight: 700;
  width: 16px;
  height: 16px;
  line-height: 1;
  cursor: pointer;
  padding: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.expr-add:hover { background: rgba(255,255,255,0.4); }
.expr-mode {
  background: rgba(255,255,255,0.18);
  border: none;
  border-radius: 999px;
  color: #fff;
  font-size: 10px;
  font-weight: 700;
  padding: 2px 6px;
  cursor: pointer;
}
.expr-mode:hover { background: rgba(255,255,255,0.3); }
</style>
