const PYSCRIPT_VERSION = '0.7.19'
const PYSCRIPT_BASE_URL = `https://cdn.jsdelivr.net/npm/@pyscript/core@${PYSCRIPT_VERSION}/dist`
const PYSCRIPT_CORE_URL = `${PYSCRIPT_BASE_URL}/core.js`
const PYSCRIPT_CSS_URL = `${PYSCRIPT_BASE_URL}/core.css`
const PYSCRIPT_STYLE_ID = 'python-blocks-pyscript-core-css'
const MAIN_THREAD_RUN_PREFIX = 'python-blocks-pyscript-main-thread'
const MAIN_THREAD_TIMEOUT_MS = 15000

let coreModulePromise = null
let stylesheetPromise = null
let mainThreadRunCounter = 0

function ensureBrowserContext() {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
        throw new Error('PyScript can only run in the browser.')
    }
}

function ensurePyScriptStylesheet() {
    ensureBrowserContext()

    if (!stylesheetPromise) {
        stylesheetPromise = new Promise((resolve, reject) => {
            const existing = document.getElementById(PYSCRIPT_STYLE_ID)
            if (existing) {
                resolve(existing)
                return
            }

            const link = document.createElement('link')
            link.id = PYSCRIPT_STYLE_ID
            link.rel = 'stylesheet'
            link.href = PYSCRIPT_CSS_URL
            link.onload = () => resolve(link)
            link.onerror = () => reject(new Error('Could not load the PyScript stylesheet.'))
            document.head.append(link)
        })
    }

    return stylesheetPromise
}

async function loadCoreModule() {
    ensureBrowserContext()
    await ensurePyScriptStylesheet()

    if (!coreModulePromise) {
        coreModulePromise = import(/* @vite-ignore */ PYSCRIPT_CORE_URL)
    }

    return coreModulePromise
}

// Worker-backed terminals need a cross-origin-isolated context.
function supportsWorkerTerminal() {
    return typeof SharedArrayBuffer === 'function' && window.crossOriginIsolated === true
}

function isElement(value) {
    return typeof Element !== 'undefined' && value instanceof Element
}

function resolveOutputTarget(target) {
    ensureBrowserContext()

    if (!target) {
        throw new Error('A PyScript output target is required.')
    }

    if (isElement(target)) {
        return target
    }

    if (typeof target === 'string') {
        const directIdMatch = target.startsWith('#') ? document.getElementById(target.slice(1)) : null
        const resolved = directIdMatch || document.querySelector(target)
        if (resolved) {
            return resolved
        }
    }

    throw new Error('Could not find the PyScript output target.')
}

function createMainThreadScaffold(outputTarget) {
    mainThreadRunCounter += 1

    const status = document.createElement('div')
    status.id = `${MAIN_THREAD_RUN_PREFIX}-status-${mainThreadRunCounter}`
    status.hidden = true

    const host = document.createElement('div')
    host.id = `${MAIN_THREAD_RUN_PREFIX}-host-${mainThreadRunCounter}`

    outputTarget.replaceChildren(status, host)

    return { host, status }
}

function buildMainThreadScript(sourceCode, statusId) {
    const sourceLiteral = JSON.stringify(sourceCode)
    const statusLiteral = JSON.stringify(statusId)

    return `from js import document, window
import builtins
import traceback

__python_blocks_status__ = document.getElementById(${statusLiteral})
__python_blocks_source__ = ${sourceLiteral}
__python_blocks_scope__ = {"__name__": "__main__"}
__python_blocks_original_input__ = builtins.input

def __python_blocks_prompt__(prompt_text=''):
    __python_blocks_response__ = window.prompt(str(prompt_text))
    if __python_blocks_response__ is None:
        raise EOFError('Input cancelled.')
    return str(__python_blocks_response__)

builtins.input = __python_blocks_prompt__

try:
        exec(__python_blocks_source__, __python_blocks_scope__, __python_blocks_scope__)
except Exception as __python_blocks_error__:
        traceback.print_exc()
        __python_blocks_status__.dataset.errorMessage = type(__python_blocks_error__).__name__ + ": " + str(__python_blocks_error__)
        __python_blocks_status__.dataset.state = "error"
else:
        __python_blocks_status__.dataset.state = "success"
finally:
    builtins.input = __python_blocks_original_input__
`
}

function waitForMainThreadRun(statusElement) {
    return new Promise((resolve, reject) => {
        let settled = false

        const cleanup = () => {
            if (settled) return
            settled = true
            observer.disconnect()
            window.clearTimeout(timeoutId)
        }

        const settle = () => {
            const state = statusElement.dataset.state
            if (!state) return

            cleanup()
            if (state === 'success') {
                resolve()
                return
            }

            reject(new Error(statusElement.dataset.errorMessage || 'PyScript execution failed.'))
        }

        const observer = new MutationObserver(settle)
        observer.observe(statusElement, {
            attributes: true,
            attributeFilter: ['data-state', 'data-error-message'],
        })

        const timeoutId = window.setTimeout(() => {
            cleanup()
            reject(new Error('PyScript execution timed out.'))
        }, MAIN_THREAD_TIMEOUT_MS)

        settle()
    })
}

function createWorkerRunner(donkey, options) {
    return donkey({
        type: 'py',
        persistent: false,
        ...options,
    }).then((runner) => ({
        mode: 'worker',
        reset: (...args) => runner.reset(...args),
        process: (...args) => runner.process(...args),
        clear: (...args) => runner.clear(...args),
        kill: (...args) => runner.kill(...args),
    }))
}

function createMainThreadRunner(options) {
    const outputTarget = resolveOutputTarget(options.terminal)
    let activeScript = null

    const clearOutput = () => {
        if (activeScript?.isConnected) {
            activeScript.remove()
        }
        activeScript = null
        outputTarget.replaceChildren()
    }

    return {
        mode: 'main-thread',
        async reset() {
            clearOutput()
        },
        async process(sourceCode) {
            const { host, status } = createMainThreadScaffold(outputTarget)

            if (activeScript?.isConnected) {
                activeScript.remove()
            }

            activeScript = document.createElement('script')
            activeScript.type = 'py'
            activeScript.setAttribute('terminal', '')
            activeScript.setAttribute('target', `#${host.id}`)
            activeScript.textContent = buildMainThreadScript(sourceCode, status.id)
            document.body.append(activeScript)

            await waitForMainThreadRun(status)
        },
        async clear() {
            clearOutput()
        },
        kill() {
            clearOutput()
        },
    }
}

export async function createPyScriptRunner(options = {}) {
    const { donkey } = await loadCoreModule()

    if (supportsWorkerTerminal()) {
        return createWorkerRunner(donkey, options)
    }

    return createMainThreadRunner(options)
}