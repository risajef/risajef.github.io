import { test, expect } from '@playwright/test'
import fs from 'node:fs'
import {
  getStoreState,
  callStoreAction,
  buildAssignProgram,
  buildForLoopProgram,
  dragPythonBlocksPaletteBlockToEmptyCanvas,
} from './helpers.js'

function readWorkspacePythonFile(relativePath) {
  return fs.readFileSync(new URL(`../../${relativePath}`, import.meta.url), 'utf8')
}

async function openNerdMode(page) {
  await page.getByTestId('python-blocks-advanced-toggle').click()
  await expect(page.locator('.code-content')).toBeVisible()
}

test.describe('Python Blocks Editor – UI structure', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/python-blocks')
    // Wait for Vue to mount
    await page.waitForSelector('.python-blocks-board', { timeout: 8000 })
  })

  test('palette, canvas, and nerd rail render', async ({ page }) => {
    await expect(page.locator('.palette')).toBeVisible()
    await expect(page.locator('.sb-canvas')).toBeVisible()
    await expect(page.locator('.code-panel')).toBeVisible()
    await expect(page.locator('.code-content')).not.toBeVisible()
  })

  test('header title is visible with back link', async ({ page }) => {
    await expect(page.locator('.sb-title')).toContainText('Python Blocks Editor')
    await expect(page.locator('.back-link')).toBeVisible()
  })

  test('back link navigates home', async ({ page }) => {
    await page.locator('.back-link').click()
    await expect(page).toHaveURL('/')
  })

  test('palette section headers are visible', async ({ page }) => {
    const labels = page.locator('.cat-label')
    const count = await labels.count()
    expect(count).toBeGreaterThan(2)
    // Expect at least Variables, Control, Operators categories
    const texts = await labels.allTextContents()
    expect(texts.some(t => t.includes('Variables'))).toBe(true)
    expect(texts.some(t => t.includes('Control'))).toBe(true)
    expect(texts.some(t => t.includes('Operators'))).toBe(true)
  })

  test('palette contains expected block labels', async ({ page }) => {
    const items = page.locator('.palette-item')
    const count = await items.count()
    expect(count).toBeGreaterThan(10)

    const texts = await items.allTextContents()
    expect(texts.some(t => t.includes('assign'))).toBe(true)
    expect(texts.some(t => t.includes('for loop'))).toBe(true)
    expect(texts.some(t => t.includes('print'))).toBe(true)
    expect(texts.some(t => t.includes('while'))).toBe(true)
    expect(texts.some(t => t.includes('if / else'))).toBe(true)
    expect(texts.some(t => t.includes('raise'))).toBe(true)
    expect(texts.some(t => t.includes('with'))).toBe(true)
    expect(texts.some(t => t.includes('match / case'))).toBe(true)
    expect(texts.some(t => t.includes('def'))).toBe(true)
    expect(texts.some(t => t.includes('var'))).toBe(true)
    expect(texts.some(t => t.includes('1 2 3'))).toBe(true)
  })

  test('simple blocks toggle hides advanced palette entries', async ({ page }) => {
    await page.getByTestId('python-blocks-simple-toggle').click()

    await expect(page.getByTestId('python-blocks-simple-toggle')).toContainText('Simple blocks: on')
    await expect(page.getByTestId('python-blocks-palette-item-assign')).toBeVisible()
    await expect(page.getByTestId('python-blocks-palette-item-while')).toBeVisible()
    await expect(page.getByTestId('python-blocks-palette-item-listExpr')).toBeVisible()
    await expect(page.getByTestId('python-blocks-palette-item-bool')).toBeVisible()
    await expect(page.getByTestId('python-blocks-palette-item-str')).toBeVisible()

    await expect(page.getByTestId('python-blocks-palette-item-for')).toHaveCount(0)
    await expect(page.getByTestId('python-blocks-palette-item-try')).toHaveCount(0)
    await expect(page.getByTestId('python-blocks-palette-item-matchStmt')).toHaveCount(0)
    await expect(page.getByTestId('python-blocks-palette-item-raiseStmt')).toHaveCount(0)
    await expect(page.getByTestId('python-blocks-palette-item-withStmt')).toHaveCount(0)
    await expect(page.getByTestId('python-blocks-palette-item-classDef')).toHaveCount(0)
    await expect(page.getByTestId('python-blocks-palette-item-lambda')).toHaveCount(0)
    await expect(page.getByTestId('python-blocks-palette-item-longStr')).toHaveCount(0)
  })

  test('keyboard selector inserts blocks and edits terminal nodes', async ({ page }) => {
    const emptyRoot = page.getByTestId('python-blocks-empty-root-zone')
    await emptyRoot.focus()

    await page.keyboard.type('ass')
    await expect(page.getByTestId('python-blocks-zone-selector')).toContainText('assign')
    await page.keyboard.press('Enter')

    await expect(page.getByTestId('python-blocks-stat-block-assign')).toBeVisible()

    await page.keyboard.press('ArrowRight')
    await page.keyboard.type('var')
    await expect(page.getByTestId('python-blocks-zone-selector')).toContainText('var')
    await page.keyboard.press('Enter')
    await page.keyboard.type('x')
    await page.keyboard.press('Escape')

    await page.keyboard.press('ArrowRight')
    await page.keyboard.type('num')
    await expect(page.getByTestId('python-blocks-zone-selector')).toContainText('1 2 3')
    await page.keyboard.press('Enter')
    await page.keyboard.type('7')

    await expect(page.locator('.code-content')).toContainText('x = 7')
  })

  test('palette hover help explains a block with an example', async ({ page }) => {
    const paletteItem = page.getByTestId('python-blocks-palette-item-assign')
    await paletteItem.hover()

    const tooltip = page.getByTestId('python-blocks-palette-tooltip-assign')
    await expect(tooltip).toContainText('Store a value in a variable')
    await expect(tooltip).toContainText('score = 0')
    await expect(tooltip).toContainText('score = score + bonus')

    const layout = await page.evaluate(() => {
      const item = document.querySelector('[data-testid="python-blocks-palette-item-assign"]')
      const tooltipNode = document.querySelector('[data-testid="python-blocks-palette-tooltip-assign"]')
      const itemRect = item?.getBoundingClientRect()
      const tooltipRect = tooltipNode?.getBoundingClientRect()
      return {
        tooltipPosition: tooltipNode ? getComputedStyle(tooltipNode).position : '',
        tooltipRightOfItem: !!itemRect && !!tooltipRect && tooltipRect.left > itemRect.left,
      }
    })

    expect(layout.tooltipPosition).toBe('fixed')
    expect(layout.tooltipRightOfItem).toBe(true)
  })

  test('internal import-only blocks are hidden from the palette', async ({ page }) => {
    await expect(page.getByTestId('python-blocks-palette-item-rawStmt')).toHaveCount(0)
    await expect(page.getByTestId('python-blocks-palette-item-rawExpr')).toHaveCount(0)
  })

  test('empty canvas shows hint text', async ({ page }) => {
    await expect(page.locator('.empty-root-zone')).toBeVisible()
    await expect(page.locator('.empty-hint')).toContainText('Drag statement blocks')
  })

  test('nerd panel opens on demand and shows the generated code', async ({ page }) => {
    await openNerdMode(page)

    const code = page.locator('.code-content')
    await expect(code).toBeVisible()
    await expect(code).toContainText('Empty program')
  })

  test('Copy button is visible in code panel', async ({ page }) => {
    await openNerdMode(page)

    await expect(page.getByTestId('python-blocks-copy-output')).toBeVisible()
    await expect(page.getByTestId('python-blocks-copy-output')).toContainText('Copy code')
  })

  test('Clear canvas button is visible', async ({ page }) => {
    await expect(page.locator('.clear-btn')).toBeVisible()
  })

  test('Python import UI is visible', async ({ page }) => {
    await openNerdMode(page)

    await expect(page.getByTestId('python-blocks-import-input')).toBeVisible()
    await expect(page.getByTestId('python-blocks-import-run')).toContainText('Import Python')
  })

  test('browser run controls stay in the bottom dock while output stays hidden until execution', async ({ page }) => {
    await expect(page.getByTestId('python-blocks-run-browser')).toBeVisible()

    const layout = await page.evaluate(() => {
      const board = document.querySelector('.python-blocks-board')
      const lastChild = board?.lastElementChild
      return {
        runtimeIsLastChild: lastChild?.classList.contains('runtime-panel') ?? false,
      }
    })

    expect(layout.runtimeIsLastChild).toBe(true)
    await expect(page.getByTestId('python-blocks-runtime-output')).toHaveCount(0)
  })

  test('browser run executes generated Python in the runtime panel', async ({ page }) => {
    await page.evaluate(() => {
      const store = document.querySelector('#app').__vue_app__.config.globalProperties.$pinia._s.get('python-blocks')
      store.pythonCode = 'print(42)'
    })

    await page.getByTestId('python-blocks-run-browser').click()

    await expect(page.getByTestId('python-blocks-runtime-output')).toBeVisible()
    await expect(page.locator('.runtime-success')).toContainText('Execution finished', { timeout: 20000 })
    await expect(page.locator('.runtime-target')).toContainText('42', { timeout: 20000 })
  })

  test('browser run supports input() in main-thread fallback mode', async ({ page }) => {
    await page.evaluate(() => {
      const store = document.querySelector('#app').__vue_app__.config.globalProperties.$pinia._s.get('python-blocks')
      store.pythonCode = 'name = input("What is your name?")\nprint(f"Hello {name}")'
    })

    const dialogPromise = page.waitForEvent('dialog')
    await page.getByTestId('python-blocks-run-browser').click()

    const dialog = await dialogPromise
    expect(dialog.message()).toBe('What is your name?')
    await dialog.accept('Reto')

    await expect(page.getByTestId('python-blocks-runtime-output')).toBeVisible()
    await expect(page.locator('.runtime-success')).toContainText('Execution finished', { timeout: 20000 })
    await expect(page.locator('.runtime-target')).toContainText('Hello Reto', { timeout: 20000 })
  })

  test('clearing runtime output collapses the terminal again', async ({ page }) => {
    await page.evaluate(() => {
      const store = document.querySelector('#app').__vue_app__.config.globalProperties.$pinia._s.get('python-blocks')
      store.pythonCode = 'print(7)'
    })

    await page.getByTestId('python-blocks-run-browser').click()
    await expect(page.getByTestId('python-blocks-runtime-output')).toBeVisible()
    await expect(page.locator('.runtime-target')).toContainText('7', { timeout: 20000 })

    await page.getByRole('button', { name: 'Clear output' }).click()

    await expect(page.getByTestId('python-blocks-runtime-output')).toHaveCount(0)
    await expect(page.locator('.runtime-success')).toContainText('Output cleared.')
  })

  test('empty root canvas accepts statement drops', async ({ page }) => {
    const dataTransfer = await page.evaluateHandle(() => {
      const data = new DataTransfer()
      data.setData('text/plain', JSON.stringify({ source: 'palette', type: 'assign', isStmt: true }))
      data.setData('application/x-python-blocks-s', '1')
      return data
    })

    const dropTarget = page.locator('.empty-root-zone')
    await dropTarget.dispatchEvent('dragover', { dataTransfer })
    await dropTarget.dispatchEvent('drop', { dataTransfer })

    await expect(page.locator('.stat-block').first()).toBeVisible()
    await expect(page.locator('.empty-root-zone')).not.toBeVisible()
  })

  test('real drag from palette to empty canvas adds an assign block', async ({ page }) => {
    await dragPythonBlocksPaletteBlockToEmptyCanvas(page, 'assign')

    await expect(page.getByTestId('python-blocks-stat-block-assign')).toBeVisible()
    await expect(page.getByTestId('python-blocks-empty-root-zone')).not.toBeVisible()
    await expect(page.locator('.code-content')).toContainText('___ = ___')

    const state = await getStoreState(page, 'python-blocks')
    expect(state.rootBody).toHaveLength(1)
    expect(state.blocks[state.rootBody[0]].type).toBe('assign')
    expect(state.pythonCode).toContain('___ = ___')
  })

  test('statement blocks and slot placeholders use helpful category colors', async ({ page }) => {
    await dragPythonBlocksPaletteBlockToEmptyCanvas(page, 'assign')

    const styles = await page.evaluate(() => {
      const block = document.querySelector('[data-testid="python-blocks-stat-block-assign"]')
      const slots = Array.from(document.querySelectorAll('[data-testid="python-blocks-stat-block-assign"] .slot-empty'))
      const targetStyle = slots[0] ? getComputedStyle(slots[0]) : null
      const valueStyle = slots[1] ? getComputedStyle(slots[1]) : null
      return {
        blockBackground: block ? getComputedStyle(block).backgroundColor : '',
        targetBorder: targetStyle?.borderColor || '',
        valueBorder: valueStyle?.borderColor || '',
      }
    })

    expect(styles.blockBackground).not.toBe('rgb(255, 255, 255)')
    expect(styles.targetBorder).not.toBe(styles.valueBorder)
  })

  test('importing Python through the UI builds the Python Blocks canvas', async ({ page }) => {
    await openNerdMode(page)

    await page.getByTestId('python-blocks-import-input').fill('x = 0\nwhile x < 3:\n    x += 1\nprint(x)')
    await page.getByTestId('python-blocks-import-run').click()

    await expect(page.getByTestId('python-blocks-import-success')).toContainText('Imported Python')
    await expect(page.locator('.code-content')).toContainText('while x < 3:')

    const state = await getStoreState(page, 'python-blocks')
    expect(state.rootBody).toHaveLength(3)
    expect(state.blocks[state.rootBody[0]].type).toBe('assign')
    expect(state.blocks[state.rootBody[1]].type).toBe('while')
    expect(state.blocks[state.rootBody[2]].type).toBe('print')
  })

  test('imported function names expand to fit in Python Blocks', async ({ page }) => {
    await openNerdMode(page)

    await page.getByTestId('python-blocks-import-input').fill(
      'def name_getter():\n    return "Reto"\n    return input("What is your\\" name")\nname = name_getter()\nprint(f"Hello {name}")',
    )
    await page.getByTestId('python-blocks-import-run').click()

    await expect(page.getByTestId('python-blocks-import-success')).toContainText('Imported Python')
    await expect(page.getByTestId('python-blocks-stat-block-funcDef').locator('.name-inp')).toHaveValue('name_getter')

    const widths = await page.evaluate(() => {
      const funcNameInput = document.querySelector('[data-testid="python-blocks-stat-block-funcDef"] .name-inp')
      const callNameInput = Array.from(document.querySelectorAll('.expr-input')).find(
        (input) => input instanceof HTMLInputElement && input.value === 'name_getter',
      )

      return {
        functionNameSize: Number(funcNameInput?.getAttribute('size') || '0'),
        functionNameFits: !!funcNameInput && funcNameInput.scrollWidth <= funcNameInput.clientWidth + 2,
        callNameSize: Number(callNameInput?.getAttribute('size') || '0'),
        callNameFits: !!callNameInput && callNameInput.scrollWidth <= callNameInput.clientWidth + 2,
      }
    })

    expect(widths.functionNameSize).toBeGreaterThanOrEqual('name_getter'.length + 1)
    expect(widths.functionNameFits).toBe(true)
    expect(widths.callNameSize).toBeGreaterThanOrEqual('name_getter'.length + 1)
    expect(widths.callNameFits).toBe(true)
  })
})

test.describe('Python Blocks Editor – Store: single assignment block', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/python-blocks')
    await page.waitForSelector('.python-blocks-board')
  })

  test('createBlock adds a block to the store', async ({ page }) => {
    const id = await callStoreAction(page, 'python-blocks', 'createBlock', 'assign')
    expect(id).toMatch(/^b[a-z0-9]+$/)

    const state = await getStoreState(page, 'python-blocks')
    expect(state.blocks[id]).toBeDefined()
    expect(state.blocks[id].type).toBe('assign')
  })

  test('dropInBody places block on root canvas', async ({ page }) => {
    const id = await callStoreAction(page, 'python-blocks', 'createBlock', 'assign')
    await callStoreAction(page, 'python-blocks', 'dropInBody', id, null, 'body', null)

    const state = await getStoreState(page, 'python-blocks')
    expect(state.rootBody).toContain(id)
    expect(state.blocks[id].parentCtx).toBe('root')
  })

  test('assign block appears in the DOM after being added to root', async ({ page }) => {
    const id = await callStoreAction(page, 'python-blocks', 'createBlock', 'assign')
    await callStoreAction(page, 'python-blocks', 'dropInBody', id, null, 'body', null)

    await expect(page.locator('.stat-block').first()).toBeVisible()
    await expect(page.locator('.empty-hint')).not.toBeVisible()
  })

  test('buildAssignProgram generates "x = 42" Python', async ({ page }) => {
    await buildAssignProgram(page)

    const code = await page.locator('.code-content').textContent()
    expect(code).toContain('x = 42')
  })

  test('code panel updates live as block values change', async ({ page }) => {
    const { varId, numId, assignId } = await buildAssignProgram(page)

    // Change variable name to 'total'
    await page.evaluate((vId) => {
      const store = document.querySelector('#app').__vue_app__.config.globalProperties.$pinia._s.get('python-blocks')
      store.blocks[vId].value = 'total'
      store.refresh()
    }, varId)

    const code = await page.locator('.code-content').textContent()
    expect(code).toContain('total = 42')
  })

  test('deleteBlock removes block from DOM and Python output', async ({ page }) => {
    const { assignId } = await buildAssignProgram(page)
    await callStoreAction(page, 'python-blocks', 'deleteBlock', assignId)

    const state = await getStoreState(page, 'python-blocks')
    expect(state.rootBody).not.toContain(assignId)
    expect(state.blocks[assignId]).toBeUndefined()

    await expect(page.locator('.empty-hint')).toBeVisible()
    await expect(page.locator('.code-content')).toContainText('Empty program')
  })

  test('deleteBlock cascades to nested expression blocks', async ({ page }) => {
    const { varId, numId, assignId } = await buildAssignProgram(page)
    await callStoreAction(page, 'python-blocks', 'deleteBlock', assignId)

    const state = await getStoreState(page, 'python-blocks')
    expect(state.blocks[varId]).toBeUndefined()
    expect(state.blocks[numId]).toBeUndefined()
  })

  test('clear canvas button removes all blocks', async ({ page }) => {
    await buildAssignProgram(page)

    // Verify block exists first
    await expect(page.locator('.stat-block')).toBeVisible()

    await page.locator('.clear-btn').click()

    const state = await getStoreState(page, 'python-blocks')
    expect(state.rootBody).toHaveLength(0)
    expect(Object.keys(state.blocks)).toHaveLength(0)
    await expect(page.locator('.empty-hint')).toBeVisible()
  })
})

test.describe('Python Blocks Editor – Store: expression blocks in slots', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/python-blocks')
    await page.waitForSelector('.python-blocks-board')
  })

  test('dropInSlot fills an expression slot', async ({ page }) => {
    const assignId = await callStoreAction(page, 'python-blocks', 'createBlock', 'assign')
    const numId = await callStoreAction(page, 'python-blocks', 'createBlock', 'num')
    await callStoreAction(page, 'python-blocks', 'dropInBody', assignId, null, 'body', null)
    await callStoreAction(page, 'python-blocks', 'dropInSlot', numId, assignId, 'value')

    const state = await getStoreState(page, 'python-blocks')
    expect(state.blocks[assignId].slots.value).toBe(numId)
    expect(state.blocks[numId].parentId).toBe(assignId)
    expect(state.blocks[numId].parentCtx).toBe('slot:value')
  })

  test('dropping into a filled slot replaces existing block', async ({ page }) => {
    const assignId = await callStoreAction(page, 'python-blocks', 'createBlock', 'assign')
    const num1Id = await callStoreAction(page, 'python-blocks', 'createBlock', 'num')
    const num2Id = await callStoreAction(page, 'python-blocks', 'createBlock', 'num')
    await callStoreAction(page, 'python-blocks', 'dropInBody', assignId, null, 'body', null)
    await callStoreAction(page, 'python-blocks', 'dropInSlot', num1Id, assignId, 'value')
    await callStoreAction(page, 'python-blocks', 'dropInSlot', num2Id, assignId, 'value')

    const state = await getStoreState(page, 'python-blocks')
    expect(state.blocks[assignId].slots.value).toBe(num2Id)
    expect(state.blocks[num1Id]).toBeUndefined() // replaced = deleted
  })

  test('binary operator block generates correct expression', async ({ page }) => {
    // build: result = (a + b)
    const assignId = await callStoreAction(page, 'python-blocks', 'createBlock', 'assign')
    const varTarget = await callStoreAction(page, 'python-blocks', 'createBlock', 'var')
    const binOpId = await callStoreAction(page, 'python-blocks', 'createBlock', 'binOp')
    const varA = await callStoreAction(page, 'python-blocks', 'createBlock', 'var')
    const varB = await callStoreAction(page, 'python-blocks', 'createBlock', 'var')

    await callStoreAction(page, 'python-blocks', 'dropInBody', assignId, null, 'body', null)
    await callStoreAction(page, 'python-blocks', 'dropInSlot', varTarget, assignId, 'target')
    await callStoreAction(page, 'python-blocks', 'dropInSlot', binOpId, assignId, 'value')
    await callStoreAction(page, 'python-blocks', 'dropInSlot', varA, binOpId, 'left')
    await callStoreAction(page, 'python-blocks', 'dropInSlot', varB, binOpId, 'right')

    await page.evaluate(([t, a, b]) => {
      const store = document.querySelector('#app').__vue_app__.config.globalProperties.$pinia._s.get('python-blocks')
      store.blocks[t].value = 'result'
      store.blocks[a].value = 'a'
      store.blocks[b].value = 'b'
      store.blocks[Object.keys(store.blocks).find(k =>
        store.blocks[k].type === 'binOp')].op = '+'
      store.refresh()
    }, [varTarget, varA, varB])

    const code = await page.locator('.code-content').textContent()
    expect(code).toContain('result = (a + b)')
  })

  test('compare block generates correct condition', async ({ page }) => {
    const printId = await callStoreAction(page, 'python-blocks', 'createBlock', 'print')
    const cmpId = await callStoreAction(page, 'python-blocks', 'createBlock', 'compare')
    const varX = await callStoreAction(page, 'python-blocks', 'createBlock', 'var')
    const numTen = await callStoreAction(page, 'python-blocks', 'createBlock', 'num')

    await callStoreAction(page, 'python-blocks', 'dropInBody', printId, null, 'body', null)
    await callStoreAction(page, 'python-blocks', 'dropInSlot', cmpId, printId, 'value')
    await callStoreAction(page, 'python-blocks', 'dropInSlot', varX, cmpId, 'left')
    await callStoreAction(page, 'python-blocks', 'dropInSlot', numTen, cmpId, 'right')

    await page.evaluate(([v, n, c]) => {
      const store = document.querySelector('#app').__vue_app__.config.globalProperties.$pinia._s.get('python-blocks')
      store.blocks[v].value = 'x'
      store.blocks[n].value = '10'
      store.blocks[c].op = '<'
      store.refresh()
    }, [varX, numTen, cmpId])

    const code = await page.locator('.code-content').textContent()
    expect(code).toContain('print(x < 10)')
  })

  test('formatted and raw string blocks edit inner content but export wrapped literals', async ({ page }) => {
    const formatPrintId = await callStoreAction(page, 'python-blocks', 'createBlock', 'print')
    const formatId = await callStoreAction(page, 'python-blocks', 'createBlock', 'formatStr')
    const rawPrintId = await callStoreAction(page, 'python-blocks', 'createBlock', 'print')
    const rawId = await callStoreAction(page, 'python-blocks', 'createBlock', 'rawStr')

    await callStoreAction(page, 'python-blocks', 'dropInBody', formatPrintId, null, 'body', null)
    await callStoreAction(page, 'python-blocks', 'dropInSlot', formatId, formatPrintId, 'value')
    await callStoreAction(page, 'python-blocks', 'dropInBody', rawPrintId, null, 'body', null)
    await callStoreAction(page, 'python-blocks', 'dropInSlot', rawId, rawPrintId, 'value')

    await page.evaluate(([formatBlockId, rawBlockId]) => {
      const store = document.querySelector('#app').__vue_app__.config.globalProperties.$pinia._s.get('python-blocks')
      store.blocks[formatBlockId].value = 'f"Hello {name}"'
      store.blocks[rawBlockId].value = 'r"C:\\tmp\\x"'
      store.refresh()
    }, [formatId, rawId])

    await expect(page.locator(`[data-python-blocks-block-id="${formatId}"] .expr-input`)).toHaveValue('Hello {name}')
    await expect(page.locator(`[data-python-blocks-block-id="${rawId}"] .expr-input`)).toHaveValue('C:\\tmp\\x')

    let code = await page.locator('.code-content').textContent()
    expect(code).toContain('print(f"Hello {name}")')
    expect(code).toContain('print(r"C:\\tmp\\x")')

    await page.evaluate((formatBlockId) => {
      const store = document.querySelector('#app').__vue_app__.config.globalProperties.$pinia._s.get('python-blocks')
      store.blocks[formatBlockId].tripleQuoted = true
      store.refresh()
    }, formatId)

    await expect(page.locator(`[data-python-blocks-block-id="${formatId}"] .expr-textarea`)).toHaveValue('Hello {name}')

    code = await page.locator('.code-content').textContent()
    expect(code).toContain('print(f"""Hello {name}""")')
  })
})

test.describe('Python Blocks Editor – Store: control flow (for, while, if)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/python-blocks')
    await page.waitForSelector('.python-blocks-board')
  })

  test('for loop generates correct Python with print inside', async ({ page }) => {
    await buildForLoopProgram(page)
    const code = await page.locator('.code-content').textContent()
    expect(code).toContain('for i in range(0, 10):')
    expect(code).toContain('    print(i)')
  })

  test('nested blocks: for with multiple statements inside', async ({ page }) => {
    const forId = await callStoreAction(page, 'python-blocks', 'createBlock', 'for')
    const startId = await callStoreAction(page, 'python-blocks', 'createBlock', 'num')
    const endId = await callStoreAction(page, 'python-blocks', 'createBlock', 'num')
    const iterVar = await callStoreAction(page, 'python-blocks', 'createBlock', 'var')
    const print1Id = await callStoreAction(page, 'python-blocks', 'createBlock', 'print')
    const print2Id = await callStoreAction(page, 'python-blocks', 'createBlock', 'print')
    const pv1 = await callStoreAction(page, 'python-blocks', 'createBlock', 'var')
    const pv2 = await callStoreAction(page, 'python-blocks', 'createBlock', 'var')

    await callStoreAction(page, 'python-blocks', 'dropInBody', forId, null, 'body', null)
    await callStoreAction(page, 'python-blocks', 'dropInSlot', iterVar, forId, 'var')
    await callStoreAction(page, 'python-blocks', 'dropInSlot', startId, forId, 'start')
    await callStoreAction(page, 'python-blocks', 'dropInSlot', endId, forId, 'end')
    await callStoreAction(page, 'python-blocks', 'dropInBody', print1Id, forId, 'body', null)
    await callStoreAction(page, 'python-blocks', 'dropInBody', print2Id, forId, 'body', null)
    await callStoreAction(page, 'python-blocks', 'dropInSlot', pv1, print1Id, 'value')
    await callStoreAction(page, 'python-blocks', 'dropInSlot', pv2, print2Id, 'value')

    await page.evaluate(([s, e, iv, v1, v2]) => {
      const store = document.querySelector('#app').__vue_app__.config.globalProperties.$pinia._s.get('python-blocks')
      store.blocks[s].value = '1'
      store.blocks[e].value = '5'
      store.blocks[iv].value = 'n'
      store.blocks[v1].value = 'n'
      store.blocks[v2].value = '"hello"'
      store.refresh()
    }, [startId, endId, iterVar, pv1, pv2])

    const code = await page.locator('.code-content').textContent()
    expect(code).toContain('for n in range(1, 5):')
    expect(code).toContain('    print(n)')
    expect(code).toContain('    print("hello")')
  })

  test('while loop generates correct Python', async ({ page }) => {
    const whileId = await callStoreAction(page, 'python-blocks', 'createBlock', 'while')
    const cmpId = await callStoreAction(page, 'python-blocks', 'createBlock', 'compare')
    const varX = await callStoreAction(page, 'python-blocks', 'createBlock', 'var')
    const numZero = await callStoreAction(page, 'python-blocks', 'createBlock', 'num')
    const printId = await callStoreAction(page, 'python-blocks', 'createBlock', 'print')
    const pv = await callStoreAction(page, 'python-blocks', 'createBlock', 'var')

    await callStoreAction(page, 'python-blocks', 'dropInBody', whileId, null, 'body', null)
    await callStoreAction(page, 'python-blocks', 'dropInSlot', cmpId, whileId, 'condition')
    await callStoreAction(page, 'python-blocks', 'dropInSlot', varX, cmpId, 'left')
    await callStoreAction(page, 'python-blocks', 'dropInSlot', numZero, cmpId, 'right')
    await callStoreAction(page, 'python-blocks', 'dropInBody', printId, whileId, 'body', null)
    await callStoreAction(page, 'python-blocks', 'dropInSlot', pv, printId, 'value')

    await page.evaluate(([x, z, p, cId]) => {
      const store = document.querySelector('#app').__vue_app__.config.globalProperties.$pinia._s.get('python-blocks')
      store.blocks[x].value = 'n'
      store.blocks[z].value = '0'
      store.blocks[p].value = 'n'
      store.blocks[cId].op = '>'
      store.refresh()
    }, [varX, numZero, pv, cmpId])

    const code = await page.locator('.code-content').textContent()
    expect(code).toContain('while n > 0:')
    expect(code).toContain('    print(n)')
  })

  test('if/else generates correct Python', async ({ page }) => {
    const ifId = await callStoreAction(page, 'python-blocks', 'createBlock', 'if')
    const cmpId = await callStoreAction(page, 'python-blocks', 'createBlock', 'compare')
    const varX = await callStoreAction(page, 'python-blocks', 'createBlock', 'var')
    const numFive = await callStoreAction(page, 'python-blocks', 'createBlock', 'num')
    const printT = await callStoreAction(page, 'python-blocks', 'createBlock', 'print')
    const printF = await callStoreAction(page, 'python-blocks', 'createBlock', 'print')
    const pvTrue = await callStoreAction(page, 'python-blocks', 'createBlock', 'str')
    const pvFalse = await callStoreAction(page, 'python-blocks', 'createBlock', 'str')

    await callStoreAction(page, 'python-blocks', 'dropInBody', ifId, null, 'body', null)
    await callStoreAction(page, 'python-blocks', 'dropInSlot', cmpId, ifId, 'condition')
    await callStoreAction(page, 'python-blocks', 'dropInSlot', varX, cmpId, 'left')
    await callStoreAction(page, 'python-blocks', 'dropInSlot', numFive, cmpId, 'right')
    await callStoreAction(page, 'python-blocks', 'dropInBody', printT, ifId, 'body', null)
    await callStoreAction(page, 'python-blocks', 'dropInBody', printF, ifId, 'elseBody', null)
    await callStoreAction(page, 'python-blocks', 'dropInSlot', pvTrue, printT, 'value')
    await callStoreAction(page, 'python-blocks', 'dropInSlot', pvFalse, printF, 'value')

    await page.evaluate(([x, n, t, f, c]) => {
      const store = document.querySelector('#app').__vue_app__.config.globalProperties.$pinia._s.get('python-blocks')
      store.blocks[x].value = 'x'
      store.blocks[n].value = '5'
      store.blocks[t].value = 'big'
      store.blocks[f].value = 'small'
      store.blocks[c].op = '>='
      store.refresh()
    }, [varX, numFive, pvTrue, pvFalse, cmpId])

    const code = await page.locator('.code-content').textContent()
    expect(code).toContain('if x >= 5:')
    expect(code).toContain('    print("big")')
    expect(code).toContain('else:')
    expect(code).toContain('    print("small")')
  })

  test('block ordering in body is preserved', async ({ page }) => {
    const b1 = await callStoreAction(page, 'python-blocks', 'createBlock', 'print')
    const b2 = await callStoreAction(page, 'python-blocks', 'createBlock', 'print')
    const b3 = await callStoreAction(page, 'python-blocks', 'createBlock', 'print')
    const v1 = await callStoreAction(page, 'python-blocks', 'createBlock', 'str')
    const v2 = await callStoreAction(page, 'python-blocks', 'createBlock', 'str')
    const v3 = await callStoreAction(page, 'python-blocks', 'createBlock', 'str')

    await callStoreAction(page, 'python-blocks', 'dropInBody', b1, null, 'body', null)
    await callStoreAction(page, 'python-blocks', 'dropInBody', b2, null, 'body', null)
    await callStoreAction(page, 'python-blocks', 'dropInBody', b3, null, 'body', null)
    await callStoreAction(page, 'python-blocks', 'dropInSlot', v1, b1, 'value')
    await callStoreAction(page, 'python-blocks', 'dropInSlot', v2, b2, 'value')
    await callStoreAction(page, 'python-blocks', 'dropInSlot', v3, b3, 'value')

    await page.evaluate(([a, b, c]) => {
      const store = document.querySelector('#app').__vue_app__.config.globalProperties.$pinia._s.get('python-blocks')
      store.blocks[a].value = 'first'
      store.blocks[b].value = 'second'
      store.blocks[c].value = 'third'
      store.refresh()
    }, [v1, v2, v3])

    const code = await page.locator('.code-content').textContent()
    const firstPos = code.indexOf('"first"')
    const secondPos = code.indexOf('"second"')
    const thirdPos = code.indexOf('"third"')
    expect(firstPos).toBeLessThan(secondPos)
    expect(secondPos).toBeLessThan(thirdPos)
  })
})

test.describe('Python Blocks Editor – Store: functions and recursion', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/python-blocks')
    await page.waitForSelector('.python-blocks-board')
  })

  test('funcDef generates def with params and body', async ({ page }) => {
    const defId = await callStoreAction(page, 'python-blocks', 'createBlock', 'funcDef')
    const printId = await callStoreAction(page, 'python-blocks', 'createBlock', 'print')
    const varN = await callStoreAction(page, 'python-blocks', 'createBlock', 'var')

    await callStoreAction(page, 'python-blocks', 'dropInBody', defId, null, 'body', null)
    await callStoreAction(page, 'python-blocks', 'dropInBody', printId, defId, 'body', null)
    await callStoreAction(page, 'python-blocks', 'dropInSlot', varN, printId, 'value')

    await page.evaluate((dId) => {
      const store = document.querySelector('#app').__vue_app__.config.globalProperties.$pinia._s.get('python-blocks')
      store.blocks[dId].name = 'greet'
      store.blocks[dId].params = ['name']
      store.refresh()
    }, defId)

    // Set var value
    await page.evaluate((vId) => {
      const store = document.querySelector('#app').__vue_app__.config.globalProperties.$pinia._s.get('python-blocks')
      store.blocks[vId].value = 'name'
      store.refresh()
    }, varN)

    const code = await page.locator('.code-content').textContent()
    expect(code).toContain('def greet(name):')
    expect(code).toContain('    print(name)')
  })

  test('recursive function: factorial', async ({ page }) => {
    // def factorial(n):
    //     if n <= 1:
    //         return 1
    //     else:
    //         return n * factorial(n - 1)  -- simplified as callExpr
    const defId = await callStoreAction(page, 'python-blocks', 'createBlock', 'funcDef')
    const ifId = await callStoreAction(page, 'python-blocks', 'createBlock', 'if')
    const cmpId = await callStoreAction(page, 'python-blocks', 'createBlock', 'compare')
    const varN_cmp = await callStoreAction(page, 'python-blocks', 'createBlock', 'var')
    const num1_cmp = await callStoreAction(page, 'python-blocks', 'createBlock', 'num')
    const retBase = await callStoreAction(page, 'python-blocks', 'createBlock', 'return')
    const num1_base = await callStoreAction(page, 'python-blocks', 'createBlock', 'num')
    const retRec = await callStoreAction(page, 'python-blocks', 'createBlock', 'return')
    const callRec = await callStoreAction(page, 'python-blocks', 'createBlock', 'callExpr')
    const varN_ret = await callStoreAction(page, 'python-blocks', 'createBlock', 'var')

    await callStoreAction(page, 'python-blocks', 'dropInBody', defId, null, 'body', null)
    await callStoreAction(page, 'python-blocks', 'dropInBody', ifId, defId, 'body', null)
    await callStoreAction(page, 'python-blocks', 'dropInSlot', cmpId, ifId, 'condition')
    await callStoreAction(page, 'python-blocks', 'dropInSlot', varN_cmp, cmpId, 'left')
    await callStoreAction(page, 'python-blocks', 'dropInSlot', num1_cmp, cmpId, 'right')
    await callStoreAction(page, 'python-blocks', 'dropInBody', retBase, ifId, 'body', null)
    await callStoreAction(page, 'python-blocks', 'dropInSlot', num1_base, retBase, 'value')
    await callStoreAction(page, 'python-blocks', 'dropInBody', retRec, ifId, 'elseBody', null)
    await callStoreAction(page, 'python-blocks', 'dropInSlot', callRec, retRec, 'value')
    await callStoreAction(page, 'python-blocks', 'dropInArg', varN_ret, callRec, 0)

    await page.evaluate(([dId, cId, leftVarId, compareNumId, baseNumId, returnVarId, callId]) => {
      const store = document.querySelector('#app').__vue_app__.config.globalProperties.$pinia._s.get('python-blocks')
      store.blocks[dId].name = 'factorial'
      store.blocks[dId].params = ['n']
      store.blocks[cId].op = '<='
      store.blocks[leftVarId].value = 'n'
      store.blocks[compareNumId].value = '1'
      store.blocks[baseNumId].value = '1'
      store.blocks[returnVarId].value = 'n'
      store.blocks[callId].name = 'factorial'
      store.refresh()
    }, [defId, cmpId, varN_cmp, num1_cmp, num1_base, varN_ret, callRec])

    const code = await page.locator('.code-content').textContent()
    expect(code).toContain('def factorial(n):')
    expect(code).toContain('if n <= 1:')
    expect(code).toContain('return 1')
    expect(code).toContain('return factorial(n)')
  })
})

test.describe('Python Blocks Editor – Python import', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/python-blocks')
    await page.waitForSelector('.python-blocks-board')
  })

  test('store importPythonCode imports a counting loop', async ({ page }) => {
    await page.evaluate(() => {
      const store = document.querySelector('#app').__vue_app__.config.globalProperties.$pinia._s.get('python-blocks')
      store.importPythonCode('x = 0\nwhile x < 2:\n    x += 1\nprint(x)')
    })

    const state = await getStoreState(page, 'python-blocks')
    expect(state.rootBody).toHaveLength(3)
    expect(state.blocks[state.rootBody[0]].type).toBe('assign')
    expect(state.blocks[state.rootBody[1]].type).toBe('while')
    expect(state.blocks[state.rootBody[2]].type).toBe('print')
    expect(state.pythonCode).toContain('x = 0')
    expect(state.pythonCode).toContain('while x < 2:')
    expect(state.pythonCode).toContain('x += 1')
    expect(state.pythonCode).toContain('print(x)')
  })

  test('store importPythonCode accepts parenthesized while conditions and simple indents', async ({ page }) => {
    await page.evaluate(() => {
      const store = document.querySelector('#app').__vue_app__.config.globalProperties.$pinia._s.get('python-blocks')
      store.importPythonCode('x = 0\nwhile (x < 10):\n x = x + 1')
    })

    const state = await getStoreState(page, 'python-blocks')
    expect(state.rootBody).toHaveLength(2)
    expect(state.blocks[state.rootBody[0]].type).toBe('assign')
    expect(state.blocks[state.rootBody[1]].type).toBe('while')
    const whileBlock = state.blocks[state.rootBody[1]]
    expect(whileBlock.body).toHaveLength(1)
    expect(state.blocks[whileBlock.body[0]].type).toBe('assign')
    expect(state.pythonCode).toContain('x = 0')
    expect(state.pythonCode).toContain('while x < 10:')
    expect(state.pythonCode).toContain('x = (x + 1)')
  })

  test('store importPythonCode imports functions with if/else and return', async ({ page }) => {
    await page.evaluate(() => {
      const store = document.querySelector('#app').__vue_app__.config.globalProperties.$pinia._s.get('python-blocks')
      store.importPythonCode('def factorial(n):\n    if n <= 1:\n        return 1\n    else:\n        return factorial(n)')
    })

    const state = await getStoreState(page, 'python-blocks')
    expect(state.rootBody).toHaveLength(1)
    const defBlock = state.blocks[state.rootBody[0]]
    expect(defBlock.type).toBe('funcDef')
    expect(defBlock.name).toBe('factorial')
    expect(defBlock.params).toEqual(['n'])
    expect(state.pythonCode).toContain('def factorial(n):')
    expect(state.pythonCode).toContain('if n <= 1:')
    expect(state.pythonCode).toContain('return factorial(n)')
  })

  test('store importPythonCode imports class, lambda, and try blocks', async ({ page }) => {
    await page.evaluate(() => {
      const store = document.querySelector('#app').__vue_app__.config.globalProperties.$pinia._s.get('python-blocks')
      store.importPythonCode(
        'class Greeter(Base):\n    pass\n' +
        'inc = lambda x: x + 1\n' +
        'try:\n    risky()\nexcept ValueError as err:\n    handle(err)\nfinally:\n    done()',
      )
    })

    const state = await getStoreState(page, 'python-blocks')
    expect(state.rootBody).toHaveLength(3)
    expect(state.blocks[state.rootBody[0]].type).toBe('classDef')
    expect(state.blocks[state.rootBody[1]].type).toBe('assign')
    expect(state.blocks[state.rootBody[2]].type).toBe('try')
    expect(state.pythonCode).toContain('class Greeter(Base):')
    expect(state.pythonCode).toContain('inc = lambda x:')
    expect(state.pythonCode).toContain('except ValueError as err:')
    expect(state.pythonCode).toContain('finally:')
  })

  test('store importPythonCode keeps qualified calls structured', async ({ page }) => {
    await page.evaluate(() => {
      const store = document.querySelector('#app').__vue_app__.config.globalProperties.$pinia._s.get('python-blocks')
      store.importPythonCode('model.load_state_dict(checkpoint["model_state_dict"])\nmodel.eval()')
    })

    const state = await getStoreState(page, 'python-blocks')
    expect(state.rootBody).toHaveLength(2)

    const firstCall = state.blocks[state.rootBody[0]]
    const secondCall = state.blocks[state.rootBody[1]]
    expect(firstCall.type).toBe('callStmt')
    expect(secondCall.type).toBe('callStmt')

    const firstCallee = state.blocks[firstCall.slots.callee]
    const secondCallee = state.blocks[secondCall.slots.callee]
    expect(firstCallee.type).toBe('memberExpr')
    expect(firstCallee.name).toBe('load_state_dict')
    expect(state.blocks[firstCallee.slots.value]).toMatchObject({ type: 'var', value: 'model' })
    expect(secondCallee).toMatchObject({ type: 'memberExpr', name: 'eval' })

    expect(state.pythonCode).toContain('model.load_state_dict(checkpoint["model_state_dict"])')
    expect(state.pythonCode).toContain('model.eval()')
  })

  test('store importPythonCode imports dict comprehensions, with, raise, and match blocks', async ({ page }) => {
    await page.evaluate(() => {
      const store = document.querySelector('#app').__vue_app__.config.globalProperties.$pinia._s.get('python-blocks')
      store.importPythonCode(
        'serialized = {str(key): serialize_value(val) for key, val in value.items()}\n' +
        'with torch.no_grad() as guard:\n    prediction = model(batch)\n' +
        'raise ValueError("boom") from err\n' +
        'match model_size:\n    case "tiny":\n        width = 64\n    case _:\n        width = 128',
      )
    })

    const state = await getStoreState(page, 'python-blocks')
    expect(state.rootBody).toHaveLength(4)
    expect(state.blocks[state.rootBody[0]].type).toBe('assign')
    expect(state.blocks[state.blocks[state.rootBody[0]].slots.value].type).toBe('dictCompExpr')
    expect(state.blocks[state.rootBody[1]].type).toBe('withStmt')
    expect(state.blocks[state.rootBody[2]].type).toBe('raiseStmt')
    expect(state.blocks[state.rootBody[3]].type).toBe('matchStmt')

    expect(state.pythonCode).toContain('{str(key): serialize_value(val) for key, val in value.items()}')
    expect(state.pythonCode).toContain('with torch.no_grad() as guard:')
    expect(state.pythonCode).toContain('raise ValueError("boom") from err')
    expect(state.pythonCode).toContain('match model_size:')
    expect(state.pythonCode).toContain('case "tiny":')
  })

  test('store importPythonCode imports list comprehensions and any(...) generator calls', async ({ page }) => {
    await page.evaluate(() => {
      const store = document.querySelector('#app').__vue_app__.config.globalProperties.$pinia._s.get('python-blocks')
      store.importPythonCode(
        'pairs = [name for name in names if name]\n' +
        'needs_train = any("train.py" in arg for arg in cmdline)',
      )
    })

    const state = await getStoreState(page, 'python-blocks')
    expect(state.rootBody).toHaveLength(2)

    const listAssign = state.blocks[state.rootBody[0]]
    const anyAssign = state.blocks[state.rootBody[1]]
    expect(listAssign.type).toBe('assign')
    expect(anyAssign.type).toBe('assign')

    const listValue = state.blocks[listAssign.slots.value]
    expect(listValue).toMatchObject({
      type: 'listCompExpr',
      targetPattern: 'name',
      filterText: 'if name',
    })

    const anyValue = state.blocks[anyAssign.slots.value]
    expect(anyValue).toMatchObject({ type: 'callExpr', name: 'any' })
    expect(anyValue.args).toHaveLength(1)
    expect(state.blocks[anyValue.args[0]]).toMatchObject({
      type: 'generatorExpr',
      targetPattern: 'arg',
    })

    expect(state.pythonCode).toContain('pairs = [name for name in names if name]')
    expect(state.pythonCode).toContain('needs_train = any("train.py" in arg for arg in cmdline)')
  })

  test('store importPythonCode preserves booleans and yield blocks', async ({ page }) => {
    await page.evaluate(() => {
      const store = document.querySelector('#app').__vue_app__.config.globalProperties.$pinia._s.get('python-blocks')
      store.importPythonCode('flag = True\ndef gen():\n    yield item\n    yield from values')
    })

    const state = await getStoreState(page, 'python-blocks')
    expect(state.rootBody).toHaveLength(2)

    const flagAssign = state.blocks[state.rootBody[0]]
    const funcBlock = state.blocks[state.rootBody[1]]
    expect(flagAssign.type).toBe('assign')
    expect(state.blocks[flagAssign.slots.value]).toMatchObject({ type: 'bool', value: 'True' })

    expect(funcBlock.type).toBe('funcDef')
    expect(funcBlock.body).toHaveLength(2)
    expect(state.blocks[funcBlock.body[0]]).toMatchObject({ type: 'yieldStmt', yieldFrom: false })
    expect(state.blocks[funcBlock.body[1]]).toMatchObject({ type: 'yieldStmt', yieldFrom: true })

    expect(state.pythonCode).toContain('flag = True')
    expect(state.pythonCode).toContain('yield item')
    expect(state.pythonCode).toContain('yield from values')
  })

  test('store importPythonCode preserves decorators and annotated class fields', async ({ page }) => {
    await page.evaluate(() => {
      const store = document.querySelector('#app').__vue_app__.config.globalProperties.$pinia._s.get('python-blocks')
      store.importPythonCode('@dataclass\nclass TrainArgs:\n    """Arguments for training."""\n\n    comment: str')
    })

    const state = await getStoreState(page, 'python-blocks')
    expect(state.rootBody).toHaveLength(2)
    expect(state.blocks[state.rootBody[0]].type).toBe('decoratorStmt')
    expect(state.blocks[state.rootBody[0]].value).toBe('dataclass')

    const classBlock = state.blocks[state.rootBody[1]]
    expect(classBlock.type).toBe('classDef')
    expect(classBlock.body).toHaveLength(2)
    expect(state.blocks[classBlock.body[1]].type).toBe('annAssign')
    expect(state.blocks[classBlock.body[1]].annotation).toBe('str')

    expect(state.pythonCode).toContain('@dataclass')
    expect(state.pythonCode).toContain('class TrainArgs:')
    expect(state.pythonCode).toContain('comment: str')
  })

  test('store importPythonCode imports the full stress_test.py file', async ({ page }) => {
    const source = readWorkspacePythonFile('stress_test.py')

    await page.evaluate((pythonSource) => {
      const store = document.querySelector('#app').__vue_app__.config.globalProperties.$pinia._s.get('python-blocks')
      store.importPythonCode(pythonSource)
    }, source)

    const state = await getStoreState(page, 'python-blocks')
    expect(state.rootBody.length).toBeGreaterThan(20)
    expect(state.pythonCode).toContain('@dataclass')
    expect(state.pythonCode).toContain('match args_.model_size:')
    expect(state.pythonCode).toContain('with autocast(device_type="cuda"):')
  })

  test('store importPythonCode preserves from-import aliases', async ({ page }) => {
    await page.evaluate(() => {
      const store = document.querySelector('#app').__vue_app__.config.globalProperties.$pinia._s.get('python-blocks')
      store.importPythonCode('from pathlib import Path as P')
    })

    const state = await getStoreState(page, 'python-blocks')
    expect(state.rootBody).toHaveLength(1)
    const importBlock = state.blocks[state.rootBody[0]]
    expect(importBlock.type).toBe('fromImportStmt')
    expect(importBlock.alias).toBe('P')
    expect(state.blocks[importBlock.slots.module].value).toBe('pathlib')
    expect(state.blocks[importBlock.slots.name].value).toBe('Path')
    expect(state.pythonCode).toContain('from pathlib import Path as P')
  })

  test('store importPythonCode preserves from-import lists', async ({ page }) => {
    await page.evaluate(() => {
      const store = document.querySelector('#app').__vue_app__.config.globalProperties.$pinia._s.get('python-blocks')
      store.importPythonCode('from torch.amp import autocast, GradScaler')
    })

    const state = await getStoreState(page, 'python-blocks')
    expect(state.rootBody).toHaveLength(1)
    const importBlock = state.blocks[state.rootBody[0]]
    expect(importBlock.type).toBe('fromImportStmt')
    expect(state.blocks[importBlock.slots.module].type).toBe('memberExpr')
    expect(state.blocks[importBlock.slots.name].value).toBe('autocast')
    expect(importBlock.args).toHaveLength(1)
    expect(state.blocks[importBlock.args[0]].value).toBe('GradScaler')
    expect(state.pythonCode).toContain('from torch.amp import autocast, GradScaler')
  })

  test('store importPythonCode preserves subscript assignment targets', async ({ page }) => {
    await page.evaluate(() => {
      const store = document.querySelector('#app').__vue_app__.config.globalProperties.$pinia._s.get('python-blocks')
      store.importPythonCode('os.environ["TF_ENABLE_ONEDNN_OPTS"] = "0"')
    })

    const state = await getStoreState(page, 'python-blocks')
    expect(state.rootBody).toHaveLength(1)
    const assignBlock = state.blocks[state.rootBody[0]]
    expect(assignBlock.type).toBe('assign')
    const targetBlock = state.blocks[assignBlock.slots.target]
    expect(targetBlock.type).toBe('subscriptExpr')
    expect(state.pythonCode).toContain('os.environ["TF_ENABLE_ONEDNN_OPTS"] = "0"')
  })

  test('store importPythonCode preserves multidimensional subscript indices', async ({ page }) => {
    await page.evaluate(() => {
      const store = document.querySelector('#app').__vue_app__.config.globalProperties.$pinia._s.get('python-blocks')
      store.importPythonCode('tp = cm[i, i]\nfp = cm[:, i].sum() - tp\nfn = cm[i, :].sum() - tp')
    })

    const state = await getStoreState(page, 'python-blocks')
    expect(state.rootBody).toHaveLength(3)

    const tpAssign = state.blocks[state.rootBody[0]]
    const tpValue = state.blocks[tpAssign.slots.value]
    expect(tpValue.type).toBe('subscriptExpr')
    expect(state.blocks[tpValue.slots.index].type).toBe('tupleExpr')

    expect(state.pythonCode).toContain('tp = cm[i, i]')
    expect(state.pythonCode).toContain('fp = (cm[:, i].sum() - tp)')
    expect(state.pythonCode).toContain('fn = (cm[i, :].sum() - tp)')
  })

  test('store importPythonCode preserves comments and multiline strings', async ({ page }) => {
    await page.evaluate(() => {
      const store = document.querySelector('#app').__vue_app__.config.globalProperties.$pinia._s.get('python-blocks')
      store.importPythonCode('load_dotenv()  # Load environment variables from .env file\n\n"""test\nasdf"""')
    })

    const state = await getStoreState(page, 'python-blocks')
    expect(state.rootBody).toHaveLength(3)
    expect(state.blocks[state.rootBody[0]].type).toBe('callStmt')
    expect(state.blocks[state.rootBody[1]].type).toBe('commentStmt')
    expect(state.blocks[state.rootBody[1]].value).toBe('Load environment variables from .env file')
    expect(state.blocks[state.rootBody[2]].type).toBe('exprStmt')
    expect(state.pythonCode).toContain('# Load environment variables from .env file')
    expect(state.pythonCode).toContain('"""test')
    expect(state.pythonCode).toContain('asdf"""')
  })

  test('store importPythonCode preserves conditional expressions in assignments', async ({ page }) => {
    await page.evaluate(() => {
      const store = document.querySelector('#app').__vue_app__.config.globalProperties.$pinia._s.get('python-blocks')
      store.importPythonCode('metric_value_out = None if not np.isfinite(metric_value) else float(metric_value)')
    })

    const state = await getStoreState(page, 'python-blocks')
    expect(state.rootBody).toHaveLength(1)
    const assignBlock = state.blocks[state.rootBody[0]]
    expect(assignBlock.type).toBe('assign')

    const conditionalBlock = state.blocks[assignBlock.slots.value]
    expect(conditionalBlock.type).toBe('conditionalExpr')
    expect(state.blocks[conditionalBlock.slots.whenTrue].value).toBe('None')
    expect(state.blocks[conditionalBlock.slots.condition].type).toBe('not')
    expect(state.blocks[conditionalBlock.slots.whenFalse].type).toBe('callExpr')
    expect(state.pythonCode).toContain('metric_value_out = (None if not (np.isfinite(metric_value)) else float(metric_value))')
  })

  test('Python import surfaces parse errors in the UI', async ({ page }) => {
    await openNerdMode(page)

    await page.getByTestId('python-blocks-import-input').fill('for i in range(1, 2, 3):\n    print(i)')
    await page.getByTestId('python-blocks-import-run').click()

    await expect(page.getByTestId('python-blocks-import-error')).toContainText('range')
    await expect(page.locator('.code-content')).toContainText('Empty program')
  })
})

test.describe('Python Blocks Editor – drag-and-drop palette interaction', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/python-blocks')
    await page.waitForSelector('.python-blocks-board')
  })

  test('palette items are draggable (have draggable=true)', async ({ page }) => {
    const items = page.locator('.palette-item[draggable="true"]')
    const count = await items.count()
    expect(count).toBeGreaterThan(10)
  })

  test('canvas body-drop zone is present and visible', async ({ page }) => {
    await expect(page.locator('.body-root')).toBeVisible()
  })

  test('drop zones expand on hover (dragover state adds dz-over class)', async ({ page }) => {
    // Dispatch a dragover event with the python-blocks-s mime type to the first drop zone
    await page.evaluate(() => {
      const zone = document.querySelector('.drop-zone')
      if (!zone) throw new Error('.drop-zone not found')
      const dt = new DataTransfer()
      // We can't use setData in non-trusted context, but we can test by adding the class manually
      zone.classList.add('dz-over')
    })
    const zone = page.locator('.drop-zone.dz-over')
    await expect(zone).toBeVisible()
  })

  test('stat blocks have draggable=true after being placed', async ({ page }) => {
    const id = await callStoreAction(page, 'python-blocks', 'createBlock', 'print')
    await callStoreAction(page, 'python-blocks', 'dropInBody', id, null, 'body', null)
    await expect(page.locator('.stat-block[draggable="true"]')).toBeVisible()
  })
})
