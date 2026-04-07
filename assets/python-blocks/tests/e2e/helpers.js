/**
 * Shared helpers for E2E tests.
 *
 * Store helpers use the Vue 3 / Pinia internal APIs that are available
 * in development builds (the `__vue_app__` property on the #app element
 * and the `$pinia` global property set by Pinia).
 */

/**
 * Read the full reactive state of a Pinia store as a plain JSON snapshot.
 * @param {import('@playwright/test').Page} page
 * @param {string} storeId  – the id passed to defineStore(), e.g. 'python-blocks'
 */
export async function getStoreState(page, storeId) {
  return page.evaluate((id) => {
    const app = document.querySelector('#app')?.__vue_app__
    if (!app) throw new Error('#app.__vue_app__ not found – is Vue mounted?')
    const pinia = app.config.globalProperties.$pinia
    if (!pinia) throw new Error('$pinia not found on global properties')
    const store = pinia._s.get(id)
    if (!store) throw new Error(`Store "${id}" not registered in Pinia`)
    return JSON.parse(JSON.stringify(store.$state))
  }, storeId)
}

/**
 * Call an action on a Pinia store and return the serialised result.
 * @param {import('@playwright/test').Page} page
 * @param {string} storeId
 * @param {string} action
 * @param {...any} args   – must be JSON-serialisable
 */
export async function callStoreAction(page, storeId, action, ...args) {
  return page.evaluate(([id, method, callArgs]) => {
    const app = document.querySelector('#app').__vue_app__
    const store = app.config.globalProperties.$pinia._s.get(id)
    return store[method](...callArgs)
  }, [storeId, action, args])
}

/**
 * Build a minimal Python-generating block program via the store:
 *   x = 42
 * Returns the created block ids.
 */
export async function buildAssignProgram(page) {
  // create blocks
  const varId = await callStoreAction(page, 'python-blocks', 'createBlock', 'var')
  const numId = await callStoreAction(page, 'python-blocks', 'createBlock', 'num')
  const assignId = await callStoreAction(page, 'python-blocks', 'createBlock', 'assign')

  // put assign on canvas root
  await callStoreAction(page, 'python-blocks', 'dropInBody', assignId, null, 'body', null)
  // fill slot target = var block named 'x'
  await callStoreAction(page, 'python-blocks', 'dropInSlot', varId, assignId, 'target')
  // fill slot value = num block 42
  await callStoreAction(page, 'python-blocks', 'dropInSlot', numId, assignId, 'value')

  // set values
  await page.evaluate(([vId, nId]) => {
    const app = document.querySelector('#app').__vue_app__
    const store = app.config.globalProperties.$pinia._s.get('python-blocks')
    store.blocks[vId].value = 'x'
    store.blocks[nId].value = '42'
    store.refresh()
  }, [varId, numId])

  return { varId, numId, assignId }
}

/**
 * Build a for-loop with a print inside:
 *   for i in range(0, 10):
 *       print(i)
 */
export async function buildForLoopProgram(page) {
  const startId = await callStoreAction(page, 'python-blocks', 'createBlock', 'num')
  const endId = await callStoreAction(page, 'python-blocks', 'createBlock', 'num')
  const iterVar = await callStoreAction(page, 'python-blocks', 'createBlock', 'var')
  const forId = await callStoreAction(page, 'python-blocks', 'createBlock', 'for')

  await callStoreAction(page, 'python-blocks', 'dropInBody', forId, null, 'body', null)
  await callStoreAction(page, 'python-blocks', 'dropInSlot', iterVar, forId, 'var')
  await callStoreAction(page, 'python-blocks', 'dropInSlot', startId, forId, 'start')
  await callStoreAction(page, 'python-blocks', 'dropInSlot', endId, forId, 'end')

  // print(i) inside the loop
  const printVarId = await callStoreAction(page, 'python-blocks', 'createBlock', 'var')
  const printId = await callStoreAction(page, 'python-blocks', 'createBlock', 'print')
  await callStoreAction(page, 'python-blocks', 'dropInBody', printId, forId, 'body', null)
  await callStoreAction(page, 'python-blocks', 'dropInSlot', printVarId, printId, 'value')

  await page.evaluate(([s, e, iv, pv]) => {
    const store = document.querySelector('#app').__vue_app__.config.globalProperties.$pinia._s.get('python-blocks')
    store.blocks[s].value = '0'
    store.blocks[e].value = '10'
    store.blocks[iv].value = 'i'
    store.blocks[pv].value = 'i'
    store.refresh()
  }, [startId, endId, iterVar, printVarId])

  return { forId, printId, startId, endId }
}

/**
 * Simulate HTML5 drag-and-drop using JS DragEvent dispatch.
 * This bypasses the DataTransfer read restriction by intercepting
 * at the Vue component level – we call the store directly.
 *
 * For sidebar → Drawflow canvas drag, we use Playwright's mouse API
 * combined with CDP drag events (supported in Chromium).
 */
export async function dragSidebarNodeToCanvas(page, nodeName, canvasX, canvasY) {
  // Locate the sidebar item with matching data-node attribute
  const item = page.locator(`[data-node="${nodeName}"]`)
  // Get canvas centre as fallback drop target
  const canvas = page.locator('#drawflow')
  const canvasBox = await canvas.boundingBox()
  const dropX = canvasBox.x + (canvasX ?? canvasBox.width * 0.5)
  const dropY = canvasBox.y + (canvasY ?? canvasBox.height * 0.3)

  await item.dragTo(canvas, {
    targetPosition: {
      x: canvasX ?? canvasBox.width * 0.5,
      y: canvasY ?? canvasBox.height * 0.3,
    },
  })
  return { dropX, dropY }
}

/**
 * Perform a real browser-level drag from a Python Blocks palette item onto the
 * empty root canvas drop zone.
 * @param {import('@playwright/test').Page} page
 * @param {string} blockType
 */
export async function dragPythonBlocksPaletteBlockToEmptyCanvas(page, blockType) {
  const source = page.getByTestId(`python-blocks-palette-item-${blockType}`)
  const target = page.getByTestId('python-blocks-empty-root-zone')

  await source.scrollIntoViewIfNeeded()
  await target.scrollIntoViewIfNeeded()

  await source.dragTo(target, {
    targetPosition: { x: 40, y: 40 },
  })
}
