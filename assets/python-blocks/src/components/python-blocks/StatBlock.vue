<template>
  <div
    v-if="block"
    class="stat-block"
    :data-testid="`python-blocks-stat-block-${block.type}`"
    :data-python-blocks-selectable="'node'"
    :data-python-blocks-block-id="blockId"
    :data-python-blocks-terminal="String(isTerminalNode)"
    tabindex="0"
    :style="{ borderLeftColor: def.color, background: def.bg || '#fff' }"
    :class="{ dragging: isDragging }"
    draggable="true"
    @dragstart.stop="onDragStart"
    @dragend.stop="isDragging = false"
    @dblclick.stop="store.deleteBlock(blockId)"
    title="Double-click to delete"
  >
    <button class="del-btn" @click.stop="store.deleteBlock(blockId)" title="Delete">✕</button>

    <!-- ── Content ───────────────────────────────────────── -->
    <div class="block-content">

      <!-- assign: [target] = [value] -->
      <template v-if="block.type === 'assign'">
        <div class="inline-row">
          <SlotDrop :parentId="blockId" slotName="target" label="var" />
          <span class="sep">=</span>
          <SlotDrop :parentId="blockId" slotName="value" label="value" />
        </div>
      </template>

      <template v-else-if="block.type === 'annAssign'">
        <div class="inline-row flex-wrap">
          <SlotDrop :parentId="blockId" slotName="target" label="var" />
          <span class="sep">:</span>
          <input
            v-model="block.annotation"
            class="name-inp short-inp"
            data-python-blocks-editor="true"
            :size="getBlockInputSize(block.annotation, 'Type', 6, 24)"
            placeholder="Type"
            @click.stop
            @input="store.refresh()"
          />
          <template v-if="block.slots?.value">
            <span class="sep">=</span>
            <SlotDrop :parentId="blockId" slotName="value" label="value" />
          </template>
        </div>
      </template>

      <!-- augAssign: [target] op= [value] -->
      <template v-else-if="block.type === 'augAssign'">
        <div class="inline-row">
          <SlotDrop :parentId="blockId" slotName="target" label="var" />
          <select v-model="block.op" class="inline-select" data-python-blocks-editor="true" @change="store.refresh()" @click.stop>
            <option v-for="op in def.ops" :key="op">{{ op }}</option>
          </select>
          <span class="sep">=</span>
          <SlotDrop :parentId="blockId" slotName="value" label="value" />
        </div>
      </template>

      <template v-else-if="block.type === 'importStmt'">
        <div class="inline-row flex-wrap">
          <span class="kw">import</span>
          <SlotDrop :parentId="blockId" slotName="module" label="module" />
          <template v-if="block.alias">
            <span class="kw">as</span>
          </template>
          <input
            v-model="block.alias"
            class="name-inp short-inp"
            data-python-blocks-editor="true"
            :size="getBlockInputSize(block.alias, 'alias', 6, 24)"
            placeholder="alias"
            @click.stop
            @input="store.refresh()"
          />
        </div>
      </template>

      <template v-else-if="block.type === 'fromImportStmt'">
        <div class="inline-row flex-wrap">
          <span class="kw">from</span>
          <SlotDrop :parentId="blockId" slotName="module" label="module" />
          <span class="kw">import</span>
          <SlotDrop :parentId="blockId" slotName="name" label="name" />
          <template v-if="block.alias">
            <span class="kw">as</span>
          </template>
          <input
            v-model="block.alias"
            class="name-inp short-inp"
            data-python-blocks-editor="true"
            :size="getBlockInputSize(block.alias, 'alias', 6, 24)"
            placeholder="alias"
            @click.stop
            @input="store.refresh()"
          />
          <template v-for="(nameId, i) in block.args" :key="`import-name-${i}`">
            <span class="kw">,</span>
            <SlotDrop :parentId="blockId" :argIndex="i" label="name" />
            <template v-if="block.importAliases?.[i]">
              <span class="kw">as</span>
            </template>
            <input
              v-model="block.importAliases[i]"
              class="name-inp short-inp"
              data-python-blocks-editor="true"
              :size="getBlockInputSize(block.importAliases[i], 'alias', 6, 24)"
              placeholder="alias"
              @click.stop
              @input="store.refresh()"
            />
            <button class="small-btn" @click.stop="store.removeArgSlot(blockId, i)">✕</button>
          </template>
          <button class="add-btn" @click.stop="store.addArgSlot(blockId)">+ name</button>
        </div>
      </template>

      <template v-else-if="block.type === 'commentStmt'">
        <div class="inline-row flex-wrap">
          <span class="kw">#</span>
          <input
            v-model="block.value"
            class="name-inp"
            data-python-blocks-editor="true"
            :size="getBlockInputSize(block.value, 'comment', 10, 48)"
            placeholder="comment"
            @click.stop
            @input="store.refresh()"
          />
        </div>
      </template>

      <template v-else-if="block.type === 'decoratorStmt'">
        <div class="inline-row flex-wrap">
          <span class="kw">@</span>
          <input
            v-model="block.value"
            class="name-inp"
            data-python-blocks-editor="true"
            :size="getBlockInputSize(block.value, 'decorator', 10, 48)"
            placeholder="decorator"
            @click.stop
            @input="store.refresh()"
          />
        </div>
      </template>

      <template v-else-if="block.type === 'rawStmt'">
        <div class="inline-row raw-block-row">
          <textarea
            v-model="block.value"
            class="raw-textarea"
            data-python-blocks-editor="true"
            placeholder="raw Python statement"
            @click.stop
            @input="store.refresh()"
          />
        </div>
      </template>

      <template v-else-if="block.type === 'exprStmt'">
        <div class="inline-row">
          <SlotDrop :parentId="blockId" slotName="value" label="expr" />
        </div>
      </template>

      <!-- print: print( [value] ) -->
      <template v-else-if="block.type === 'print'">
        <div class="inline-row">
          <span class="kw">print(</span>
          <SlotDrop :parentId="blockId" slotName="value" label="value" />
          <span class="kw">)</span>
        </div>
      </template>

      <!-- input: [target] = input( [prompt] ) -->
      <template v-else-if="block.type === 'input'">
        <div class="inline-row">
          <SlotDrop :parentId="blockId" slotName="target" label="var" />
          <span class="sep">=</span>
          <span class="kw">input(</span>
          <SlotDrop :parentId="blockId" slotName="prompt" label='"prompt"' />
          <span class="kw">)</span>
        </div>
      </template>

      <!-- for: for [var] in range( [start], [end] ): -->
      <template v-else-if="block.type === 'for'">
        <div class="inline-row">
          <span class="kw">for</span>
          <SlotDrop :parentId="blockId" slotName="var" label="i" />
          <template v-if="block.slots?.iterable">
            <span class="kw">in</span>
            <SlotDrop :parentId="blockId" slotName="iterable" label="items" />
            <span class="kw">:</span>
          </template>
          <template v-else>
            <span class="kw">in range(</span>
            <SlotDrop :parentId="blockId" slotName="start" label="0" />
            <span class="kw">,</span>
            <SlotDrop :parentId="blockId" slotName="end" label="n" />
            <span class="kw">):</span>
          </template>
        </div>
        <BodyDrop :parentId="blockId" bodyKey="body" />
      </template>

      <!-- while: while [condition]: -->
      <template v-else-if="block.type === 'while'">
        <div class="inline-row">
          <span class="kw">while</span>
          <SlotDrop :parentId="blockId" slotName="condition" label="cond" />
          <span class="kw">:</span>
        </div>
        <BodyDrop :parentId="blockId" bodyKey="body" />
      </template>

      <!-- if / else -->
      <template v-else-if="block.type === 'if'">
        <div class="inline-row">
          <span class="kw">if</span>
          <SlotDrop :parentId="blockId" slotName="condition" label="cond" />
          <span class="kw">:</span>
        </div>
        <BodyDrop :parentId="blockId" bodyKey="body" />
        <div class="else-bar" :style="{ background: def.color }">else:</div>
        <BodyDrop :parentId="blockId" bodyKey="elseBody" />
      </template>

      <template v-else-if="block.type === 'try'">
        <div class="inline-row">
          <span class="kw">try:</span>
        </div>
        <BodyDrop :parentId="blockId" bodyKey="body" />

        <template v-for="(handler, i) in block.exceptHandlers" :key="`except-${i}`">
          <div class="inline-row except-row">
            <span class="kw">except</span>
            <input
              v-model="handler.type"
              class="name-inp short-inp"
              data-python-blocks-editor="true"
              :size="getBlockInputSize(handler.type, 'Exception', 8, 28)"
              placeholder="Exception"
              @click.stop
              @input="store.refresh()"
            />
            <span v-if="handler.alias" class="kw">as</span>
            <input
              v-model="handler.alias"
              class="name-inp short-inp"
              data-python-blocks-editor="true"
              :size="getBlockInputSize(handler.alias, 'alias', 6, 24)"
              placeholder="alias"
              @click.stop
              @input="store.refresh()"
            />
            <span class="kw">:</span>
            <button class="small-btn" @click.stop="store.removeExceptHandler(blockId, i)">✕</button>
          </div>
          <BodyDrop :parentId="blockId" :bodyKey="`exceptBody:${i}`" />
        </template>

        <div class="inline-row section-actions">
          <button class="add-btn" @click.stop="store.addExceptHandler(blockId)">+ except</button>
          <button class="add-btn" @click.stop="store.setTryElseVisible(blockId, !block.showElse)">
            {{ block.showElse ? '− else' : '+ else' }}
          </button>
          <button class="add-btn" @click.stop="store.setTryFinallyVisible(blockId, !block.showFinally)">
            {{ block.showFinally ? '− finally' : '+ finally' }}
          </button>
        </div>

        <template v-if="block.showElse">
          <div class="else-bar" :style="{ background: def.color }">else:</div>
          <BodyDrop :parentId="blockId" bodyKey="elseBody" />
        </template>

        <template v-if="block.showFinally">
          <div class="else-bar" :style="{ background: def.color }">finally:</div>
          <BodyDrop :parentId="blockId" bodyKey="finallyBody" />
        </template>
      </template>

      <template v-else-if="block.type === 'raiseStmt'">
        <div class="inline-row flex-wrap">
          <span class="kw">raise</span>
          <SlotDrop :parentId="blockId" slotName="value" label="error" />
          <span class="kw">from</span>
          <SlotDrop :parentId="blockId" slotName="cause" label="cause" />
        </div>
      </template>

      <template v-else-if="block.type === 'withStmt'">
        <div class="inline-row flex-wrap">
          <span class="kw">with</span>
          <template v-for="(_, i) in block.args" :key="`with-item-${i}`">
            <SlotDrop :parentId="blockId" :argIndex="i" label="ctx" />
            <span class="kw">as</span>
            <input
              v-model="block.withAliases[i]"
              class="name-inp short-inp"
              data-python-blocks-editor="true"
              :size="getBlockInputSize(block.withAliases[i], 'alias', 6, 24)"
              placeholder="alias"
              @click.stop
              @input="store.refresh()"
            />
            <button class="small-btn" @click.stop="store.removeArgSlot(blockId, i)">✕</button>
            <span v-if="i < block.args.length - 1" class="kw">,</span>
          </template>
          <button class="add-btn" @click.stop="store.addArgSlot(blockId)">+ item</button>
          <span class="kw">:</span>
        </div>
        <BodyDrop :parentId="blockId" bodyKey="body" />
      </template>

      <template v-else-if="block.type === 'matchStmt'">
        <div class="inline-row">
          <span class="kw">match</span>
          <SlotDrop :parentId="blockId" slotName="subject" label="value" />
          <span class="kw">:</span>
        </div>
        <template v-for="(matchCase, i) in block.matchCases" :key="`match-case-${i}`">
          <div class="inline-row case-row">
            <span class="kw">case</span>
            <input
              v-model="matchCase.pattern"
              class="name-inp"
              data-python-blocks-editor="true"
              :size="getBlockInputSize(matchCase.pattern, 'pattern', 10, 40)"
              placeholder="pattern"
              @click.stop
              @input="store.refresh()"
            />
            <span class="kw">if</span>
            <input
              v-model="matchCase.guard"
              class="name-inp"
              data-python-blocks-editor="true"
              :size="getBlockInputSize(matchCase.guard, 'guard (optional)', 12, 40)"
              placeholder="guard (optional)"
              @click.stop
              @input="store.refresh()"
            />
            <span class="kw">:</span>
            <button class="small-btn" @click.stop="store.removeMatchCase(blockId, i)">✕</button>
          </div>
          <BodyDrop :parentId="blockId" :bodyKey="`matchCase:${i}`" />
        </template>
        <div class="inline-row section-actions">
          <button class="add-btn" @click.stop="store.addMatchCase(blockId)">+ case</button>
        </div>
      </template>

      <!-- funcDef: def name(params): -->
      <template v-else-if="block.type === 'funcDef'">
        <div class="inline-row flex-wrap">
          <span class="kw">def</span>
          <input v-model="block.name" class="name-inp" placeholder="my_func"
            data-python-blocks-editor="true"
            :size="getBlockInputSize(block.name, 'my_func', 10, 48)"
            @click.stop @input="store.refresh()" />
          <span class="kw">(</span>
          <template v-for="(_, i) in block.params" :key="i">
            <input v-model="block.params[i]" class="param-inp" placeholder="param"
              data-python-blocks-editor="true"
              :size="getBlockInputSize(block.params[i], 'param', 6, 24)"
              @click.stop @input="store.refresh()" />
            <button class="small-btn" @click.stop="store.removeParam(blockId, i)">✕</button>
            <span v-if="i < block.params.length - 1" class="kw">,</span>
          </template>
          <button class="add-btn" @click.stop="store.addParam(blockId)">+ param</button>
          <span class="kw">):</span>
        </div>
        <BodyDrop :parentId="blockId" bodyKey="body" />
      </template>

      <template v-else-if="block.type === 'classDef'">
        <div class="inline-row flex-wrap">
          <span class="kw">class</span>
          <input v-model="block.name" class="name-inp" placeholder="MyClass"
            data-python-blocks-editor="true"
            :size="getBlockInputSize(block.name, 'MyClass', 10, 48)"
            @click.stop @input="store.refresh()" />
          <span class="kw">(</span>
          <template v-for="(baseId, i) in block.args" :key="i">
            <SlotDrop :parentId="blockId" :argIndex="i" :label="`base${i}`" />
            <button class="small-btn" @click.stop="store.removeArgSlot(blockId, i)">✕</button>
            <span v-if="i < block.args.length - 1" class="kw">,</span>
          </template>
          <button class="add-btn" @click.stop="store.addArgSlot(blockId)">+ base</button>
          <span class="kw">):</span>
        </div>
        <BodyDrop :parentId="blockId" bodyKey="body" />
      </template>

      <!-- return: return [value] -->
      <template v-else-if="block.type === 'return'">
        <div class="inline-row">
          <span class="kw">return</span>
          <SlotDrop :parentId="blockId" slotName="value" label="value" />
        </div>
      </template>

      <template v-else-if="block.type === 'yieldStmt'">
        <div class="inline-row flex-wrap">
          <span class="kw">yield</span>
          <button class="mode-chip" @click.stop="toggleYieldMode(block)">{{ block.yieldFrom ? 'from' : 'value' }}</button>
          <SlotDrop :parentId="blockId" slotName="value" label="value" />
        </div>
      </template>

      <!-- callStmt: name(args...) -->
      <template v-else-if="block.type === 'callStmt'">
        <div class="inline-row flex-wrap">
          <template v-if="block.slots?.callee">
            <SlotDrop :parentId="blockId" slotName="callee" label="func" />
          </template>
          <input v-else v-model="block.name" class="name-inp" placeholder="func_name"
            data-python-blocks-editor="true"
            :size="getBlockInputSize(block.name, 'func_name', 10, 48)"
            @click.stop @input="store.refresh()" />
          <span class="kw">(</span>
          <template v-for="(argId, i) in block.args" :key="i">
            <SlotDrop :parentId="blockId" :argIndex="i" :label="`arg${i}`" />
            <button class="small-btn" @click.stop="store.removeArgSlot(blockId, i)">✕</button>
            <span v-if="i < block.args.length - 1" class="kw">,</span>
          </template>
          <button class="add-btn" @click.stop="store.addArgSlot(blockId)">+ arg</button>
          <span class="kw">)</span>
        </div>
      </template>

      <!-- break / continue: no extra content -->
      <template v-else-if="block.type === 'break' || block.type === 'continue'">
        <div class="inline-row">
          <span class="kw">{{ block.type }}</span>
        </div>
      </template>

    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import BodyDrop from './BodyDrop.vue'
import SlotDrop from './SlotDrop.vue'
import { usePythonBlocksStore, DEFS } from '../../store/python-blocks.js'
import { getBlockInputSize } from '../../utilities/block-input-sizing.js'

const props = defineProps({ blockId: { type: String, required: true } })

const store = usePythonBlocksStore()
const block = computed(() => store.blocks[props.blockId])
const def   = computed(() => DEFS[block.value?.type] || {})
const isDragging = ref(false)
const isTerminalNode = computed(() => TERMINAL_STATEMENT_TYPES.has(block.value?.type))

const TERMINAL_STATEMENT_TYPES = new Set(['commentStmt', 'decoratorStmt', 'rawStmt'])

function onDragStart(e) {
  isDragging.value = true
  e.dataTransfer.effectAllowed = 'move'
  e.dataTransfer.setData('text/plain', JSON.stringify({
    source: 'canvas', type: block.value?.type, id: props.blockId, isStmt: true,
  }))
  e.dataTransfer.setData('application/x-python-blocks-s', '1')
  e.dataTransfer.setData('application/x-python-blocks-canvas', '1')
}

function toggleYieldMode(targetBlock) {
  targetBlock.yieldFrom = !targetBlock.yieldFrom
  store.refresh()
}
</script>

<style scoped>
.stat-block {
  border-left: 5px solid #ccc;
  border-radius: 6px;
  box-shadow: 0 1px 4px rgba(0,0,0,0.10);
  cursor: grab;
  user-select: none;
  transition: opacity 0.15s, box-shadow 0.15s, transform 0.12s;
  margin-bottom: 2px;
  overflow: visible;
  position: relative;
  width: 100%;
  min-width: 0;
  box-sizing: border-box;
  outline: none;
}
.stat-block:hover { box-shadow: 0 3px 10px rgba(0,0,0,0.16); }
.stat-block:focus-visible {
  box-shadow:
    0 0 0 3px rgba(255,255,255,0.96),
    0 0 0 7px rgba(250, 204, 21, 0.98),
    0 0 24px rgba(250, 204, 21, 0.52),
    0 6px 18px rgba(0,0,0,0.18);
  transform: translateX(2px);
}
.stat-block:active { cursor: grabbing; }
.raw-block-row { width: 100%; }
.raw-textarea {
  width: 100%;
  min-height: 64px;
  resize: vertical;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  padding: 8px;
  font: 12px/1.45 Consolas, Monaco, 'Courier New', monospace;
  color: #0f172a;
  background: #f8fafc;
}
.stat-block.dragging { opacity: 0.4; }

.del-btn {
  background: rgba(15, 23, 42, 0.08);
  border: none;
  border-radius: 3px;
  color: #475569;
  font-size: 11px;
  width: 18px;
  height: 18px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  opacity: 0;
  transition: opacity 0.1s;
  position: absolute;
  top: 6px;
  right: 6px;
  z-index: 1;
}
.stat-block:hover .del-btn { opacity: 1; }
.del-btn:hover { background: rgba(15, 23, 42, 0.16); }

.block-content {
  width: 100%;
  min-width: 0;
  box-sizing: border-box;
}
.inline-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 4px;
  min-height: 28px;
}
.except-row,
.case-row,
.section-actions {
  margin-top: 4px;
}
.kw {
  font-size: 12px;
  font-weight: 600;
  color: #475569;
  white-space: nowrap;
}
.sep {
  font-size: 14px;
  font-weight: 700;
  color: #334155;
  padding: 0 2px;
}
.else-bar {
  padding: 3px 10px;
  font-size: 12px;
  font-weight: 700;
  color: rgba(255,255,255,0.9);
  margin-top: 4px;
}
.inline-select {
  border: 1px solid #d1d5db;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 600;
  padding: 2px 4px;
  background: #f8fafc;
  color: #334155;
  cursor: pointer;
  outline: none;
}
.name-inp {
  border: 1px solid #d1d5db;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 600;
  padding: 2px 6px;
  width: auto;
  min-width: 0;
  max-width: 100%;
  box-sizing: border-box;
  outline: none;
  color: #1e293b;
  background: #f8fafc;
}
.short-inp {
  min-width: 7ch;
}
.name-inp:focus { border-color: #6366f1; background: #fff; }
.param-inp {
  border: 1px solid #d1d5db;
  border-radius: 4px;
  font-size: 12px;
  padding: 2px 5px;
  width: auto;
  min-width: 0;
  max-width: 100%;
  box-sizing: border-box;
  outline: none;
  color: #1e293b;
}
.param-inp:focus { border-color: #6366f1; }
.small-btn {
  background: #fee2e2;
  border: none;
  border-radius: 3px;
  color: #dc2626;
  font-size: 10px;
  width: 16px;
  height: 16px;
  cursor: pointer;
  padding: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.small-btn:hover { background: #fca5a5; }
.add-btn {
  background: #e0e7ff;
  border: none;
  border-radius: 4px;
  color: #4338ca;
  font-size: 11px;
  font-weight: 600;
  padding: 2px 8px;
  cursor: pointer;
}
.add-btn:hover { background: #c7d2fe; }
.mode-chip {
  background: #ddd6fe;
  border: none;
  border-radius: 999px;
  color: #4c1d95;
  font-size: 10px;
  font-weight: 700;
  padding: 2px 6px;
  cursor: pointer;
}
.mode-chip:hover { background: #c4b5fd; }
</style>
