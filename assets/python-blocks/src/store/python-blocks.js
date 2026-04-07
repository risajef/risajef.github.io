import { defineStore } from 'pinia'
import { pythonBlocksToPython } from '../utilities/python-blocks-to-python.js'
import { parsePythonToBlocks } from '../utilities/python-to-blocks.js'

const STORAGE_KEY = 'python-blocks-state'

function loadPersistedState() {
  if (typeof window === 'undefined') {
    return null
  }

  const raw = window.sessionStorage.getItem(STORAGE_KEY)
  if (!raw) {
    return null
  }

  try {
    const parsed = JSON.parse(raw)
    const normalized = normalizePythonBlocksState(parsed)
    if (normalized !== parsed) {
      window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(normalized))
    }
    return normalized
  } catch {
    window.sessionStorage.removeItem(STORAGE_KEY)
    return null
  }
}

function persistState(state) {
  if (typeof window === 'undefined') {
    return
  }

  window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify({
    blocks: state.blocks,
    rootBody: state.rootBody,
    pythonCode: state.pythonCode,
    simpleMode: state.simpleMode,
  }))
}

function normalizePythonBlocksState(state) {
  if (!state || typeof state !== 'object' || !state.blocks || typeof state.blocks !== 'object') {
    return state
  }

  let changed = false
  const blocks = {}

  for (const [id, block] of Object.entries(state.blocks)) {
    if (!block || typeof block !== 'object') {
      blocks[id] = block
      continue
    }

    const nextBlock = { ...block }
    if (normalizeStringLiteralBlock(nextBlock)) {
      changed = true
    }
    blocks[id] = nextBlock
  }

  return changed
    ? {
      ...state,
      blocks,
      pythonCode: pythonBlocksToPython(blocks, state.rootBody ?? []),
    }
    : state
}

function normalizeStringBlocks(blocks) {
  if (!blocks || typeof blocks !== 'object') {
    return
  }

  for (const block of Object.values(blocks)) {
    normalizeStringLiteralBlock(block)
  }
}

function normalizeStringLiteralBlock(block) {
  if (!block || typeof block.value !== 'string') {
    return false
  }

  if (block.type === 'formatStr') {
    return applyWrappedLiteralNormalization(block, 'f')
  }

  if (block.type === 'rawStr') {
    return applyWrappedLiteralNormalization(block, 'r')
  }

  return false
}

function applyWrappedLiteralNormalization(block, prefix) {
  const normalized = unwrapPrefixedLiteral(block.value, prefix)
  if (!normalized) {
    return false
  }

  const nextTripleQuoted = normalized.tripleQuoted
  if (block.value === normalized.content && Boolean(block.tripleQuoted) === nextTripleQuoted) {
    return false
  }

  block.value = normalized.content
  block.tripleQuoted = nextTripleQuoted
  return true
}

function unwrapPrefixedLiteral(value, prefix) {
  if (typeof value !== 'string' || value.length < 3 || value[0]?.toLowerCase() !== prefix) {
    return null
  }

  const body = value.slice(1)
  if (body.startsWith('"""') && body.endsWith('"""') && body.length >= 6) {
    return { content: body.slice(3, -3), tripleQuoted: true }
  }
  if (body.startsWith("'''") && body.endsWith("'''") && body.length >= 6) {
    return { content: body.slice(3, -3), tripleQuoted: true }
  }
  if (body.startsWith('"') && body.endsWith('"') && body.length >= 2) {
    return { content: body.slice(1, -1), tripleQuoted: false }
  }
  if (body.startsWith("'") && body.endsWith("'") && body.length >= 2) {
    return { content: body.slice(1, -1), tripleQuoted: false }
  }

  return null
}

function instantiateImportedBlock(store, descriptor, parentId = null, parentCtx = null) {
  const block = makeBlock(descriptor.type)
  block.parentId = parentId
  block.parentCtx = parentCtx
  block.value = descriptor.value ?? block.value
  block.annotation = descriptor.annotation ?? block.annotation
  block.op = descriptor.op ?? block.op
  block.name = descriptor.name ?? block.name
  block.alias = descriptor.alias ?? block.alias
  block.params = [...(descriptor.params ?? block.params)]
  block.importAliases = [...(descriptor.importAliases ?? block.importAliases)]
  block.withAliases = [...(descriptor.withAliases ?? block.withAliases)]
  block.targetPattern = descriptor.targetPattern ?? block.targetPattern
  block.filterText = descriptor.filterText ?? block.filterText
  block.yieldFrom = descriptor.yieldFrom ?? block.yieldFrom
  block.tripleQuoted = descriptor.tripleQuoted ?? block.tripleQuoted
  block.showElse = descriptor.showElse ?? block.showElse
  block.showFinally = descriptor.showFinally ?? block.showFinally
  store.blocks[block.id] = block

  for (const [slotName, childDesc] of Object.entries(descriptor.slots || {})) {
    if (!childDesc) continue
    block.slots[slotName] = instantiateImportedBlock(store, childDesc, block.id, `slot:${slotName}`)
  }

  for (const childDesc of (descriptor.body || [])) {
    const childId = instantiateImportedBlock(store, childDesc, block.id, 'body')
    block.body.push(childId)
  }

  for (const childDesc of (descriptor.elseBody || [])) {
    const childId = instantiateImportedBlock(store, childDesc, block.id, 'elseBody')
    block.elseBody.push(childId)
  }

  for (const childDesc of (descriptor.finallyBody || [])) {
    const childId = instantiateImportedBlock(store, childDesc, block.id, 'finallyBody')
    block.finallyBody.push(childId)
  }

  block.args = (descriptor.args || []).map((argDesc, index) =>
    argDesc ? instantiateImportedBlock(store, argDesc, block.id, `arg:${index}`) : null)

  block.exceptHandlers = (descriptor.exceptHandlers || []).map((handler, index) => ({
    type: handler.type ?? '',
    alias: handler.alias ?? '',
    body: (handler.body || []).map((childDesc) =>
      instantiateImportedBlock(store, childDesc, block.id, `exceptBody:${index}`)),
  }))

  block.matchCases = (descriptor.matchCases || []).map((matchCase, index) => ({
    pattern: matchCase.pattern ?? '_',
    guard: matchCase.guard ?? '',
    body: (matchCase.body || []).map((childDesc) =>
      instantiateImportedBlock(store, childDesc, block.id, `matchCase:${index}`)),
  }))

  return block.id
}

export const DEFS = {
  // ── Statement blocks ────────────────────────────────────────────────────────
  assign: { cat: 'Variables', color: '#92400e', bg: '#fffbeb', label: 'assign', stmt: true, slots: ['target', 'value'] },
  annAssign: { cat: 'Variables', color: '#92400e', bg: '#fffbeb', label: 'x: T', stmt: true, slots: ['target', 'value'], palette: false },
  augAssign: { cat: 'Variables', color: '#92400e', bg: '#fffbeb', label: 'x += y', stmt: true, slots: ['target', 'value'], hasOp: true, ops: ['+', '-', '*', '/'] },
  decoratorStmt: { cat: 'Functions', color: '#4c1d95', bg: '#faf5ff', label: '@decorator', stmt: true, slots: [], palette: false },
  rawStmt: { cat: 'Functions', color: '#475569', bg: '#f8fafc', label: 'raw stmt', stmt: true, slots: [], palette: false },
  commentStmt: { cat: 'Functions', color: '#475569', bg: '#f8fafc', label: '# comment', stmt: true, slots: [] },
  exprStmt: { cat: 'Functions', color: '#4c1d95', bg: '#faf5ff', label: 'expr', stmt: true, slots: ['value'] },
  importStmt: { cat: 'Functions', color: '#4c1d95', bg: '#faf5ff', label: 'import', stmt: true, slots: ['module'], hasAlias: true },
  fromImportStmt: { cat: 'Functions', color: '#4c1d95', bg: '#faf5ff', label: 'from import', stmt: true, slots: ['module', 'name'], hasAlias: true, hasArgs: true },
  print: { cat: 'I / O', color: '#14532d', bg: '#f0fdf4', label: 'print', stmt: true, slots: ['value'] },
  input: { cat: 'I / O', color: '#14532d', bg: '#f0fdf4', label: 'input →', stmt: true, slots: ['target', 'prompt'] },
  for: { cat: 'Control', color: '#7c2d12', bg: '#fff7ed', label: 'for loop', stmt: true, slots: ['var', 'start', 'end', 'iterable'], body: true },
  while: { cat: 'Control', color: '#7c2d12', bg: '#fff7ed', label: 'while', stmt: true, slots: ['condition'], body: true },
  if: { cat: 'Control', color: '#7c2d12', bg: '#fff7ed', label: 'if / else', stmt: true, slots: ['condition'], body: true, hasElse: true },
  try: { cat: 'Control', color: '#7c2d12', bg: '#fff7ed', label: 'try / except', stmt: true, slots: [], body: true },
  raiseStmt: { cat: 'Control', color: '#9a3412', bg: '#fff7ed', label: 'raise', stmt: true, slots: ['value', 'cause'] },
  withStmt: { cat: 'Control', color: '#0f766e', bg: '#ecfeff', label: 'with', stmt: true, slots: [], body: true, hasArgs: true },
  matchStmt: { cat: 'Control', color: '#7c2d12', bg: '#fff7ed', label: 'match / case', stmt: true, slots: ['subject'], body: true },
  funcDef: { cat: 'Functions', color: '#4c1d95', bg: '#faf5ff', label: 'def', stmt: true, slots: [], body: true, hasName: true, hasParams: true },
  classDef: { cat: 'Functions', color: '#4c1d95', bg: '#faf5ff', label: 'class', stmt: true, slots: [], body: true, hasName: true, hasArgs: true },
  return: { cat: 'Functions', color: '#4c1d95', bg: '#faf5ff', label: 'return', stmt: true, slots: ['value'] },
  yieldStmt: { cat: 'Functions', color: '#4c1d95', bg: '#faf5ff', label: 'yield', stmt: true, slots: ['value'] },
  callStmt: { cat: 'Functions', color: '#4c1d95', bg: '#faf5ff', label: 'call( )', stmt: true, slots: ['callee'], hasName: true, hasArgs: true },
  break: { cat: 'Control', color: '#7c2d12', bg: '#fff7ed', label: 'break', stmt: true, slots: [] },
  continue: { cat: 'Control', color: '#7c2d12', bg: '#fff7ed', label: 'continue', stmt: true, slots: [] },

  // ── Expression blocks ───────────────────────────────────────────────────────
  var: { cat: 'Variables', color: '#b45309', bg: '#fef3c7', label: 'var', stmt: false, slots: [] },
  bool: { cat: 'Values', color: '#0f766e', bg: '#ccfbf1', label: 'True / False', stmt: false, slots: [] },
  num: { cat: 'Values', color: '#1e40af', bg: '#dbeafe', label: '1 2 3', stmt: false, slots: [] },
  str: { cat: 'Values', color: '#155e75', bg: '#cffafe', label: '"abc"', stmt: false, slots: [] },
  longStr: { cat: 'Values', color: '#155e75', bg: '#cffafe', label: '"""abc"""', stmt: false, slots: [] },
  formatStr: { cat: 'Values', color: '#155e75', bg: '#cffafe', label: 'f"..."', stmt: false, slots: [] },
  rawStr: { cat: 'Values', color: '#0f766e', bg: '#ccfbf1', label: 'r"..."', stmt: false, slots: [] },
  binOp: { cat: 'Operators', color: '#3730a3', bg: '#e0e7ff', label: 'a ○ b', stmt: false, slots: ['left', 'right'], hasOp: true, ops: ['+', '-', '*', '/', '//', '%', '**'] },
  compare: { cat: 'Operators', color: '#3730a3', bg: '#e0e7ff', label: '== < >', stmt: false, slots: ['left', 'right'], hasOp: true, ops: ['==', '!=', '<', '>', '<=', '>=', 'is', 'is not', 'in', 'not in'] },
  boolOp: { cat: 'Operators', color: '#3730a3', bg: '#e0e7ff', label: 'and / or', stmt: false, slots: ['left', 'right'], hasOp: true, ops: ['and', 'or'] },
  conditionalExpr: { cat: 'Control', color: '#7c2d12', bg: '#fff7ed', label: 'a if cond else b', stmt: false, slots: ['whenTrue', 'condition', 'whenFalse'] },
  not: { cat: 'Operators', color: '#3730a3', bg: '#e0e7ff', label: 'not', stmt: false, slots: ['value'] },
  memberExpr: { cat: 'Variables', color: '#b45309', bg: '#fef3c7', label: 'obj.attr', stmt: false, slots: ['value'], hasName: true },
  subscriptExpr: { cat: 'Variables', color: '#b45309', bg: '#fef3c7', label: 'obj[key]', stmt: false, slots: ['value', 'index'] },
  sliceExpr: { cat: 'Values', color: '#1e40af', bg: '#dbeafe', label: 'a:b:c', stmt: false, slots: ['start', 'end', 'step'] },
  tupleExpr: { cat: 'Values', color: '#1e40af', bg: '#dbeafe', label: 'a, b', stmt: false, slots: [], hasArgs: true },
  listExpr: { cat: 'Values', color: '#1e40af', bg: '#dbeafe', label: '[a, b]', stmt: false, slots: [], hasArgs: true },
  listCompExpr: { cat: 'Values', color: '#1d4ed8', bg: '#dbeafe', label: '[x for item in xs]', stmt: false, slots: ['value', 'iterable'] },
  dictEntryExpr: { cat: 'Values', color: '#1e40af', bg: '#dbeafe', label: 'k: v', stmt: false, slots: ['key', 'value'] },
  dictExpr: { cat: 'Values', color: '#1e40af', bg: '#dbeafe', label: '{k: v}', stmt: false, slots: [], hasArgs: true },
  dictCompExpr: { cat: 'Values', color: '#1d4ed8', bg: '#dbeafe', label: '{k: v for x in xs}', stmt: false, slots: ['key', 'value', 'iterable'] },
  generatorExpr: { cat: 'Values', color: '#2563eb', bg: '#dbeafe', label: '(x for item in xs)', stmt: false, slots: ['value', 'iterable'] },
  yieldExpr: { cat: 'Functions', color: '#5b21b6', bg: '#ede9fe', label: 'yield', stmt: false, slots: ['value'] },
  callExpr: { cat: 'Functions', color: '#5b21b6', bg: '#ede9fe', label: 'call( )', stmt: false, slots: ['callee'], hasName: true, hasArgs: true },
  lambda: { cat: 'Functions', color: '#5b21b6', bg: '#ede9fe', label: 'lambda', stmt: false, slots: ['value'], hasParams: true },
  rawExpr: { cat: 'Functions', color: '#475569', bg: '#f8fafc', label: 'raw expr', stmt: false, slots: [], palette: false },
}

export const SIMPLE_BLOCK_TYPES = new Set([
  'assign',
  'print',
  'input',
  'while',
  'if',
  'break',
  'continue',
  'var',
  'bool',
  'num',
  'str',
  'listExpr',
  'binOp',
  'compare',
  'boolOp',
  'not',
  'subscriptExpr',
])

export function isSimpleBlockType(type) {
  return SIMPLE_BLOCK_TYPES.has(type)
}

export function uid() {
  return 'b' + Math.random().toString(36).slice(2, 9)
}

export function makeBlock(type) {
  const d = DEFS[type] || {}
  return {
    id: uid(),
    type,
    parentId: null,
    parentCtx: null,
    slots: Object.fromEntries((d.slots || []).map(s => [s, null])),
    body: [],
    elseBody: [],
    finallyBody: [],
    value: '',
    annotation: '',
    op: d.ops ? d.ops[0] : '',
    name: '',
    alias: '',
    params: [],
    args: type === 'withStmt' ? [null] : [],
    importAliases: [],
    withAliases: type === 'withStmt' ? [''] : [],
    exceptHandlers: type === 'try' ? [{ type: '', alias: '', body: [] }] : [],
    matchCases: type === 'matchStmt' ? [{ pattern: '_', guard: '', body: [] }] : [],
    targetPattern: ['dictCompExpr', 'listCompExpr', 'generatorExpr'].includes(type) ? 'item' : '',
    filterText: '',
    yieldFrom: false,
    tripleQuoted: false,
    showElse: false,
    showFinally: false,
  }
}

export const usePythonBlocksStore = defineStore('python-blocks', {
  state: () => {
    const persisted = loadPersistedState()

    return {
      blocks: persisted?.blocks ?? {},
      rootBody: persisted?.rootBody ?? [],
      pythonCode: persisted?.pythonCode ?? '# Empty program\n# Drag blocks onto the canvas',
      simpleMode: persisted?.simpleMode ?? true,
    }
  },

  actions: {
    refresh() {
      normalizeStringBlocks(this.blocks)
      this.pythonCode = pythonBlocksToPython(this.blocks, this.rootBody)
      persistState(this.$state)
    },

    descendants(id) {
      const b = this.blocks[id]
      if (!b) return [id]
      const result = [id]
      for (const sid of Object.values(b.slots || {})) {
        if (sid) result.push(...this.descendants(sid))
      }
      for (const arr of [b.body, b.elseBody, b.finallyBody, b.args]) {
        for (const cid of (arr || [])) {
          if (cid) result.push(...this.descendants(cid))
        }
      }
      for (const handler of (b.exceptHandlers || [])) {
        for (const cid of handler.body || []) {
          if (cid) result.push(...this.descendants(cid))
        }
      }
      for (const matchCase of (b.matchCases || [])) {
        for (const cid of matchCase.body || []) {
          if (cid) result.push(...this.descendants(cid))
        }
      }
      return result
    },

    getBodyArray(parentId, bodyKey) {
      if (parentId === null) return this.rootBody
      const parent = this.blocks[parentId]
      if (!parent) return null
      if (['body', 'elseBody', 'finallyBody'].includes(bodyKey)) {
        return parent[bodyKey] ?? null
      }
      if (bodyKey?.startsWith('exceptBody:')) {
        const index = Number.parseInt(bodyKey.slice('exceptBody:'.length), 10)
        return parent.exceptHandlers?.[index]?.body ?? null
      }
      if (bodyKey?.startsWith('matchCase:')) {
        const index = Number.parseInt(bodyKey.slice('matchCase:'.length), 10)
        return parent.matchCases?.[index]?.body ?? null
      }
      return null
    },

    detach(id) {
      const b = this.blocks[id]
      if (!b) return
      if (!b.parentId) {
        const i = this.rootBody.indexOf(id)
        if (i !== -1) this.rootBody.splice(i, 1)
      } else {
        const p = this.blocks[b.parentId]
        if (p) {
          const ctx = b.parentCtx
          if (ctx === 'body') {
            const i = p.body.indexOf(id); if (i !== -1) p.body.splice(i, 1)
          } else if (ctx === 'elseBody') {
            const i = p.elseBody.indexOf(id); if (i !== -1) p.elseBody.splice(i, 1)
          } else if (ctx === 'finallyBody') {
            const i = p.finallyBody.indexOf(id); if (i !== -1) p.finallyBody.splice(i, 1)
          } else if (ctx?.startsWith('exceptBody:')) {
            const n = parseInt(ctx.slice('exceptBody:'.length))
            const arr = p.exceptHandlers?.[n]?.body
            if (arr) {
              const i = arr.indexOf(id)
              if (i !== -1) arr.splice(i, 1)
            }
          } else if (ctx?.startsWith('matchCase:')) {
            const n = parseInt(ctx.slice('matchCase:'.length))
            const arr = p.matchCases?.[n]?.body
            if (arr) {
              const i = arr.indexOf(id)
              if (i !== -1) arr.splice(i, 1)
            }
          } else if (ctx?.startsWith('slot:')) {
            p.slots[ctx.slice(5)] = null
          } else if (ctx?.startsWith('arg:')) {
            const n = parseInt(ctx.slice(4))
            if (p.args[n] === id) p.args[n] = null
          }
        }
      }
      b.parentId = null
      b.parentCtx = null
    },

    deleteBlock(id) {
      const all = this.descendants(id)
      this.detach(id)
      for (const did of all) delete this.blocks[did]
      this.refresh()
    },

    /** Place a statement block before insertBeforeId (null = end of array). */
    dropInBody(blockId, parentId, bodyKey, insertBeforeId) {
      if (insertBeforeId === blockId) return
      this.detach(blockId)
      const arr = this.getBodyArray(parentId, bodyKey)
      if (!arr) return
      const idx = insertBeforeId ? arr.indexOf(insertBeforeId) : -1
      arr.splice(idx === -1 ? arr.length : idx, 0, blockId)
      const b = this.blocks[blockId]
      if (b) { b.parentId = parentId; b.parentCtx = parentId === null ? 'root' : bodyKey }
      this.refresh()
    },

    dropInSlot(blockId, parentId, slotName) {
      const parent = this.blocks[parentId]
      if (!parent) return
      const existing = parent.slots[slotName]
      if (existing && existing !== blockId) this.deleteBlock(existing)
      this.detach(blockId)
      parent.slots[slotName] = blockId
      const b = this.blocks[blockId]
      if (b) { b.parentId = parentId; b.parentCtx = `slot:${slotName}` }
      this.refresh()
    },

    dropInArg(blockId, parentId, argIdx) {
      const parent = this.blocks[parentId]
      if (!parent) return
      while (parent.args.length <= argIdx) parent.args.push(null)
      const existing = parent.args[argIdx]
      if (existing && existing !== blockId) this.deleteBlock(existing)
      this.detach(blockId)
      parent.args[argIdx] = blockId
      const b = this.blocks[blockId]
      if (b) { b.parentId = parentId; b.parentCtx = `arg:${argIdx}` }
      this.refresh()
    },

    addArgSlot(parentId) {
      const p = this.blocks[parentId]
      if (p) {
        p.args.push(null)
        if (p.type === 'fromImportStmt') {
          if (!Array.isArray(p.importAliases)) p.importAliases = []
          p.importAliases.push('')
        }
        if (p.type === 'withStmt') {
          if (!Array.isArray(p.withAliases)) p.withAliases = []
          p.withAliases.push('')
        }
        this.refresh()
      }
    },

    removeArgSlot(parentId, argIdx) {
      const p = this.blocks[parentId]
      if (!p) return
      const existing = p.args[argIdx]
      if (existing) this.deleteBlock(existing)  // detach sets p.args[argIdx]=null internally
      p.args.splice(argIdx, 1)
      if (p.type === 'fromImportStmt' && Array.isArray(p.importAliases)) {
        p.importAliases.splice(argIdx, 1)
      }
      if (p.type === 'withStmt' && Array.isArray(p.withAliases)) {
        p.withAliases.splice(argIdx, 1)
      }
      this.refresh()
    },

    addParam(parentId) {
      const p = this.blocks[parentId]
      if (p) { p.params.push('param'); this.refresh() }
    },

    removeParam(parentId, idx) {
      const p = this.blocks[parentId]
      if (p) { p.params.splice(idx, 1); this.refresh() }
    },

    addExceptHandler(parentId) {
      const p = this.blocks[parentId]
      if (!p) return
      p.exceptHandlers.push({ type: '', alias: '', body: [] })
      this.refresh()
    },

    removeExceptHandler(parentId, idx) {
      const p = this.blocks[parentId]
      if (!p || !p.exceptHandlers?.[idx]) return
      const handler = p.exceptHandlers[idx]
      for (const existing of [...handler.body]) {
        if (existing) this.deleteBlock(existing)
      }
      p.exceptHandlers.splice(idx, 1)
      this.refresh()
    },

    addMatchCase(parentId) {
      const p = this.blocks[parentId]
      if (!p) return
      p.matchCases.push({ pattern: '_', guard: '', body: [] })
      this.refresh()
    },

    removeMatchCase(parentId, idx) {
      const p = this.blocks[parentId]
      if (!p || !p.matchCases?.[idx]) return
      const matchCase = p.matchCases[idx]
      for (const existing of [...matchCase.body]) {
        if (existing) this.deleteBlock(existing)
      }
      p.matchCases.splice(idx, 1)
      this.refresh()
    },

    setTryElseVisible(parentId, visible) {
      const p = this.blocks[parentId]
      if (!p) return
      p.showElse = visible
      if (!visible) {
        for (const existing of [...p.elseBody]) {
          if (existing) this.deleteBlock(existing)
        }
      }
      this.refresh()
    },

    setTryFinallyVisible(parentId, visible) {
      const p = this.blocks[parentId]
      if (!p) return
      p.showFinally = visible
      if (!visible) {
        for (const existing of [...p.finallyBody]) {
          if (existing) this.deleteBlock(existing)
        }
      }
      this.refresh()
    },

    createBlock(type) {
      const block = makeBlock(type)
      this.blocks[block.id] = block
      persistState(this.$state)
      return block.id
    },

    setSimpleMode(enabled) {
      this.simpleMode = Boolean(enabled)
      persistState(this.$state)
    },

    clearAll() {
      this.blocks = {}
      this.rootBody = []
      this.refresh()
    },

    importPythonCode(source) {
      const descriptors = parsePythonToBlocks(source)
      this.blocks = {}
      this.rootBody = []

      for (const descriptor of descriptors) {
        const rootId = instantiateImportedBlock(this, descriptor, null, 'root')
        this.rootBody.push(rootId)
      }

      this.refresh()
      return this.rootBody
    },
  },
})
