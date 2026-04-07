<template>
  <section class="runtime-panel" :class="{ 'runtime-panel--expanded': isShellOpen }">
    <div class="runtime-toolbar">
      <div>
        <div class="runtime-title">Run in browser</div>
        <div class="runtime-subtitle">PyScript execution is available even when nerd mode is collapsed.</div>
      </div>
      <div class="runtime-actions">
        <button
          v-if="hasRuntimeSession || runtimeError"
          class="runtime-btn"
          data-testid="python-blocks-runtime-toggle"
          @click="isShellOpen = !isShellOpen"
        >
          {{ isShellOpen ? 'Hide output' : 'Show output' }}
        </button>
        <button class="runtime-btn runtime-btn--primary" data-testid="python-blocks-run-browser" :disabled="running" @click="runInBrowser">
          {{ running ? 'Running…' : runtimeReady ? 'Run with PyScript' : 'Load PyScript + run' }}
        </button>
        <button class="runtime-btn" :disabled="!runtimeReady" @click="clearRuntimeOutput">
          Clear output
        </button>
        <button class="runtime-btn" :disabled="!runtimeReady" @click="resetRuntime">
          Reset runtime
        </button>
      </div>
    </div>

    <p class="runtime-help">
      Uses a worker when the page is cross-origin-isolated. Otherwise it falls back to main-thread mode, where input() opens a browser prompt.
    </p>
    <p v-if="runtimeError" class="runtime-error">{{ runtimeError }}</p>
    <p v-else-if="runtimeStatus" class="runtime-success">{{ runtimeStatus }}</p>

    <div v-if="isShellOpen" class="runtime-shell" data-testid="python-blocks-runtime-output">
      <div v-if="!hasRuntimeSession" class="runtime-placeholder">
        Click “Run with PyScript” to execute the generated Python here.
      </div>
      <div :id="runtimeTargetId" class="runtime-target"></div>
    </div>
  </section>
</template>

<script setup>
import { onBeforeUnmount, ref } from 'vue'
import { usePythonBlocksStore } from '../../store/python-blocks.js'
import { createPyScriptRunner } from '../../utilities/pyscriptRunner.js'

const runtimeTargetId = 'python-blocks-pyscript-terminal'

const store = usePythonBlocksStore()
const runtimeReady = ref(false)
const runtimeStatus = ref('')
const runtimeError = ref('')
const running = ref(false)
const hasRuntimeSession = ref(false)
const isShellOpen = ref(false)

let runner = null
let runnerPromise = null

async function ensureRunner() {
  if (runner) return runner

  if (!runnerPromise) {
    runtimeError.value = ''
    runtimeStatus.value = 'Loading PyScript runtime...'
    hasRuntimeSession.value = true
    runnerPromise = createPyScriptRunner({ terminal: `#${runtimeTargetId}` })
      .then((instance) => {
        runner = instance
        runtimeReady.value = true
        runtimeStatus.value = instance.mode === 'main-thread'
          ? 'PyScript ready (main-thread mode: input() uses browser prompt).'
          : 'PyScript ready.'
        return instance
      })
      .catch((error) => {
        runnerPromise = null
        runtimeReady.value = false
        hasRuntimeSession.value = false
        runtimeStatus.value = ''
        runtimeError.value = error instanceof Error ? error.message : 'Could not load PyScript.'
        throw error
      })
  }

  return runnerPromise
}

async function runInBrowser() {
  running.value = true
  runtimeError.value = ''
  runtimeStatus.value = 'Loading PyScript runtime...'
  hasRuntimeSession.value = true
  isShellOpen.value = true

  try {
    const pyRunner = await ensureRunner()
    runtimeStatus.value = 'Running Python in the browser...'
    await pyRunner.reset()
    await pyRunner.process(store.pythonCode)
    runtimeStatus.value = 'Execution finished.'
  } catch (error) {
    runtimeStatus.value = ''
    runtimeError.value = error instanceof Error ? error.message : 'PyScript execution failed.'
  } finally {
    running.value = false
  }
}

async function clearRuntimeOutput() {
  runtimeError.value = ''
  runtimeStatus.value = 'Output cleared.'
  if (runner) {
    await runner.clear()
  }
  hasRuntimeSession.value = false
  isShellOpen.value = false
}

function wipeRuntimeTarget() {
  if (typeof document === 'undefined') return
  const target = document.getElementById(runtimeTargetId)
  if (target) {
    target.innerHTML = ''
  }
}

async function resetRuntime() {
  runtimeError.value = ''
  runtimeStatus.value = 'PyScript runtime reset.'
  if (runner) {
    runner.kill()
    runner = null
  }
  runnerPromise = null
  runtimeReady.value = false
  hasRuntimeSession.value = false
  isShellOpen.value = false
  wipeRuntimeTarget()
}

onBeforeUnmount(() => {
  if (runner) {
    runner.kill()
    runner = null
  }
})
</script>

<style scoped>
.runtime-panel {
  padding: 12px 16px;
  border-top: 1px solid #cbd5e1;
  background: linear-gradient(180deg, #eff6ff 0%, #e2e8f0 100%);
  flex-shrink: 0;
}
.runtime-panel--expanded {
  box-shadow: 0 -8px 24px rgba(15, 23, 42, 0.08);
}
.runtime-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.runtime-title {
  color: #0f172a;
  font-size: 13px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.runtime-subtitle {
  color: #475569;
  font-size: 12px;
}
.runtime-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
.runtime-btn {
  background: #cbd5e1;
  color: #1e293b;
  border: none;
  border-radius: 8px;
  padding: 7px 12px;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  transition: background 0.15s ease, transform 0.15s ease;
}
.runtime-btn:hover:not(:disabled) {
  background: #94a3b8;
  transform: translateY(-1px);
}
.runtime-btn--primary {
  background: #1d4ed8;
  color: #eff6ff;
}
.runtime-btn--primary:hover:not(:disabled) {
  background: #2563eb;
}
.runtime-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
}
.runtime-help,
.runtime-error,
.runtime-success {
  margin: 10px 0 0;
  font-size: 12px;
  line-height: 1.5;
}
.runtime-help {
  color: #475569;
}
.runtime-error {
  color: #b91c1c;
}
.runtime-success {
  color: #166534;
}
.runtime-shell {
  margin-top: 10px;
  min-height: 144px;
  border: 1px solid #1e293b;
  border-radius: 12px;
  background: #020617;
  overflow: hidden;
  position: relative;
}
.runtime-placeholder {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  text-align: center;
  color: #64748b;
  font-size: 12px;
  line-height: 1.6;
}
.runtime-target {
  min-height: 144px;
}
@media (max-width: 900px) {
  .runtime-toolbar {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>