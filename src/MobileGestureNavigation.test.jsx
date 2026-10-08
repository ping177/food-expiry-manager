import { afterEach, describe, expect, it, vi } from 'vitest'
import App from './App'
import SidebarDrawer from './components/SidebarDrawer'
import BatchCard from './components/BatchCard'
import ArchiveBatchCard from './components/ArchiveBatchCard'
import ArchivePage from './components/ArchivePage'
import BatchDetail from './components/BatchDetail'
import AddBatchForm from './components/AddBatchForm'
import AddInventoryForm from './components/AddInventoryForm'
import InventoryOperationPanel from './components/InventoryOperationPanel'
import ArchiveBatchActions from './components/ArchiveBatchActions'
import ProductImagePicker from './components/ProductImagePicker'
import BarcodeScanner from './components/BarcodeScanner'
import DateInput from './components/DateInput'
import DiscardChangesConfirmation from './components/DiscardChangesConfirmation'
import useProtectedExit, { hasFormChanges } from './hooks/useProtectedExit'

// Same Node shallow-hook approach as Category Navigation; callbacks remain real.
const hooks = vi.hoisted(() => ({ current: null }))
vi.mock('react', async (importOriginal) => ({
  ...await importOriginal(),
  useState(initial) {
    const runtime = hooks.current
    const index = runtime.stateIndex++
    if (!(index in runtime.states)) runtime.states[index] = typeof initial === 'function' ? initial() : initial
    return [runtime.states[index], (next) => {
      runtime.states[index] = typeof next === 'function' ? next(runtime.states[index]) : next
    }]
  },
  useRef(initial) {
    const runtime = hooks.current
    const index = runtime.refIndex++
    runtime.refs[index] ??= { current: initial }
    return runtime.refs[index]
  },
  useMemo: (calculate) => calculate(),
  useCallback: (callback) => callback,
  useEffect(effect, deps) {
    const runtime = hooks.current
    const index = runtime.effectIndex++
    const previous = runtime.effects[index]
    if (!previous || !deps || deps.some((value, i) => value !== previous.deps[i])) {
      runtime.pending.push(() => {
        previous?.cleanup?.()
        runtime.effects[index] = { deps, cleanup: effect() }
      })
    }
  },
}))
vi.mock('./lib/supabase', () => ({ supabase: null, missingSupabaseVariables: [] }))

function renderer(Component, states = {}) {
  const runtime = { states, refs: [], effects: [], pending: [] }
  const render = (props = {}) => {
    hooks.current = runtime
    runtime.stateIndex = runtime.refIndex = runtime.effectIndex = 0
    runtime.pending = []
    const tree = Component(props)
    runtime.pending.forEach((effect) => effect())
    return tree
  }
  render.unmount = () => runtime.effects.forEach((effect) => effect?.cleanup?.())
  return render
}
function all(tree, predicate) {
  if (!tree || typeof tree !== 'object') return []
  if (Array.isArray(tree)) return tree.flatMap((child) => all(child, predicate))
  return [...(predicate(tree) ? [tree] : []), ...all(tree.props?.children, predicate)]
}
function find(tree, type) {
  const nodes = all(tree, (node) => node.type === type)
  expect(nodes).toHaveLength(1)
  return nodes[0]
}
const button = (tree, text) => all(tree, (node) => node.type === 'button' && node.props.children === text)[0]
const gesture = (tree) => all(tree, (node) => node.props?.onPointerDown)[0]
function swipe(tree, direction = 'right', target = { closest: () => null }) {
  const props = gesture(tree)?.props
  expect(props).toBeDefined()
  const event = { pointerType: 'touch', pointerId: 1, clientX: 100, clientY: 0, timeStamp: 0, target }
  props.onPointerDown(event)
  props.onPointerUp({ ...event, clientX: direction === 'right' ? 170 : 30, timeStamp: 300 })
}
const batch = { id: 'batch-1', quantity: 4, unit: '罐', expiry_date: '2027-01-01', status: 'active',
  product: { id: 'product-1', name: '猫罐头', brand: '', size_value: 170, size_unit: 'g', category: '猫罐头', image_url: '' } }
const appRenderer = () => renderer(App, { 0: { user: { id: 'test-user' } }, 1: 'test-user', 2: [batch],
  3: [{ ...batch, id: 'archived-1', status: 'consumed' }], 13: false })
afterEach(() => { hooks.current = null; vi.unstubAllGlobals() })

describe('gesture ownership and navigation', () => {
  it.each(['home', 'archive'])('%s allows x=0 without an App edge guard', (view) => {
    const render = appRenderer()
    if (view === 'archive') find(render(), SidebarDrawer).props.onNavigate('archive')
    const props = gesture(render()).props
    const event = { pointerType: 'touch', pointerId: 1, clientX: 0, clientY: 100, timeStamp: 0, target: { closest: () => null } }
    props.onPointerDown(event)
    props.onPointerUp({ ...event, clientX: 80, timeStamp: 300 })
    expect(find(render(), SidebarDrawer).props.open).toBe(true)
  })
  it.each(['home', 'archive'])('opens Sidebar from %s and keeps menu click', (view) => {
    const render = appRenderer()
    if (view === 'archive') find(render(), SidebarDrawer).props.onNavigate('archive')
    swipe(render())
    expect(find(render(), SidebarDrawer).props.open).toBe(true)
    find(render(), SidebarDrawer).props.onClose()
    all(render(), (node) => node.props?.['aria-label'] === '打开菜单')[0].props.onClick()
    expect(find(render(), SidebarDrawer).props.open).toBe(true)
  })
  it('does not open on a left swipe or while already open', () => {
    const render = appRenderer()
    swipe(render(), 'left')
    expect(find(render(), SidebarDrawer).props.open).toBe(false)
    find(render(), SidebarDrawer).props.onNavigate('inventory')
    swipe(render())
    const onClose = find(render(), SidebarDrawer).props.onClose
    const pending = gesture(render()).props
    const event = { pointerType: 'touch', pointerId: 1, clientX: 100, clientY: 0, timeStamp: 0 }
    pending.onPointerDown(event)
    onClose()
    render()
    pending.onPointerUp({ ...event, clientX: 170, timeStamp: 300 })
    expect(find(render(), SidebarDrawer).props.open).toBe(false)
  })
  it('closes Sidebar by panel left swipe only', () => {
    const render = renderer(SidebarDrawer)
    const onClose = vi.fn()
    const tree = render({ open: true, activeSection: 'inventory', categoryFilter: 'all', onClose })
    expect(gesture(tree).type).toBe('aside')
    swipe(tree, 'right')
    expect(onClose).not.toHaveBeenCalled()
    swipe(tree, 'left')
    expect(onClose).toHaveBeenCalledOnce()
  })
  it('Active detail uses its existing App Back', () => {
    const render = appRenderer()
    const card = all(render(), (node) => node.props?.onSelect && node.props?.batch?.id === batch.id)[0]
    card.props.onSelect(batch.id)
    const detail = find(render(), BatchDetail)
    const detailRender = renderer(BatchDetail)
    detailRender(detail.props)
    swipe(render())
    detailRender.unmount()
    expect(find(render(), SidebarDrawer).props.activeSection).toBe('inventory')
  })
  it('Archive Back preserves its request invalidation and guard cleanup', () => {
    const render = renderer(App, { 0: { user: { id: 'test-user' } }, 1: 'test-user', 2: [batch],
      3: [{ ...batch, id: 'archived-1', status: 'consumed' }], 4: 'archive-detail', 7: 'archived-1', 13: false,
      20: { productId: batch.product.id, status: 'clear' } })
    const detail = find(render(), BatchDetail)
    const detailRender = renderer(BatchDetail)
    detailRender(detail.props)
    swipe(render())
    detailRender.unmount()
    expect(find(render(), SidebarDrawer).props.activeSection).toBe('archive')
    expect(all(render(), (node) => node.type === BatchDetail)).toHaveLength(0)
  })
  it('account has no swipe action', () => {
    const render = renderer(App, { 0: { user: { id: 'test-user' } }, 1: 'test-user', 4: 'account', 13: false })
    swipe(render())
    expect(button(render(), '退出登录')).toBeDefined()
    expect(all(render(), (node) => node.type === SidebarDrawer)).toHaveLength(0)
  })
})

describe('task page outer gesture surface', () => {
  const taskApp = (view, extra = {}) => renderer(App, {
    0: { user: { id: 'test-user' } }, 1: 'test-user', 2: [batch],
    3: [{ ...batch, id: 'archived-1', status: 'consumed' }], 4: view,
    6: batch.id, 7: 'archived-1', 13: false, ...extra,
  })
  it.each(['detail', 'archive-detail'])('%s top/bottom main blanks reach its original Back exactly once', (view) => {
    const app = taskApp(view)
    const child = renderer(BatchDetail)
    const content = child(find(app(), BatchDetail).props)
    const main = find(app(), 'main')
    expect(main.props.className).toContain('min-h-screen')
    expect(main.props.style.touchAction).toBe('pan-y pinch-zoom')
    expect(gesture(content)).toBeUndefined()
    // The same main owns both padding above the header and its bottom safe-area padding.
    swipe(main)
    expect(find(app(), SidebarDrawer).props.activeSection).toBe(view === 'detail' ? 'inventory' : 'archive')
    expect(find(app(), SidebarDrawer).props.open).toBe(false)
    child.unmount()
  })
  it('main forwarding cannot bypass Product Edit dirty guard or jump its internal mode', () => {
    const app = taskApp('detail')
    const child = renderer(BatchDetail)
    const props = find(app(), BatchDetail).props
    button(child(props), '编辑商品').props.onClick()
    all(child(props), (node) => node.type === 'input')[0].props.onChange({ target: { value: 'dirty' } })
    child(props)
    swipe(app())
    find(child(props), DiscardChangesConfirmation).props.onCancel()
    expect(all(child(props), (node) => node.type === 'input')[0].props.value).toBe('dirty')
    child(props)
    swipe(app())
    find(child(props), DiscardChangesConfirmation).props.onDiscard()
    expect(button(child(props), '编辑商品')).toBeDefined()
    expect(find(app(), BatchDetail)).toBeDefined()
    child.unmount()
  })
  it.each(['add', 'add-inventory'])('%s top/form/bottom non-editor surface retains dirty and busy guards', (view) => {
    const Component = view === 'add' ? AddBatchForm : AddInventoryForm
    const app = taskApp(view)
    const child = renderer(Component)
    const props = find(app(), Component).props
    const content = child(props)
    expect(gesture(content)).toBeUndefined()
    const labelText = { closest: (selector) => selector.split(',').includes('label') ? {} : null }
    all(content, (node) => node.type === 'input')[0].props.onChange({ target: { value: 'dirty' } })
    child(props)
    swipe(app(), 'right', labelText)
    find(child(props), DiscardChangesConfirmation).props.onCancel()
    child({ ...props, busy: true })
    swipe(app())
    expect(all(child({ ...props, busy: true }), (node) => node.type === DiscardChangesConfirmation)).toHaveLength(0)
    expect(find(app(), Component)).toBeDefined()
    child.unmount()
  })
  it('unmount clears the forwarded controller; later gestures cannot call a stale exit', () => {
    const app = taskApp('add')
    const child = renderer(AddBatchForm)
    const props = find(app(), AddBatchForm).props
    const onCancel = vi.fn()
    child({ ...props, onCancel })
    expect(props.gestureSurfaceRef.current).not.toBeNull()
    child.unmount()
    expect(props.gestureSurfaceRef.current).toBeNull()
    swipe(app())
    expect(onCancel).not.toHaveBeenCalled()
  })
  it('Inventory Operation main swipe exits its mode, while confirmation blocks the same surface', () => {
    const app = taskApp('detail')
    const child = renderer(BatchDetail)
    const props = find(app(), BatchDetail).props
    const childProps = { ...props, defaultMode: 'inventory-operation' }
    const panel = renderer(InventoryOperationPanel)
    const panelProps = find(child(childProps), InventoryOperationPanel).props
    button(panel(panelProps), '消耗库存').props.onClick()
    panel(panelProps)
    child(childProps)
    swipe(app())
    expect(find(child(childProps), InventoryOperationPanel)).toBeDefined()
    button(panel(panelProps), '取消').props.onClick()
    panel(panelProps)
    child(childProps)
    swipe(app())
    expect(button(child(childProps), '库存操作')).toBeDefined()
    expect(find(app(), BatchDetail)).toBeDefined()
    panel.unmount()
    child.unmount()
  })
  it('Add editor/scanner/picker/save starts remain excluded, label swipe suppresses its forwarded click', () => {
    const app = taskApp('add')
    const child = renderer(AddBatchForm)
    const props = find(app(), AddBatchForm).props
    const content = child(props)
    const protectedNodes = [
      all(content, (node) => node.type === 'input')[0],
      all(content, (node) => node.type === 'textarea')[0],
      all(content, (node) => node.type === 'select')[0],
      button(content, '扫码添加'),
      all(content, (node) => node.type === 'button' && node.props.type === 'submit')[0],
    ]
    for (const node of protectedNodes) {
      swipe(app(), 'right', targetFor(node))
      expect(find(app(), AddBatchForm)).toBeDefined()
    }
    swipe(app(), 'right', { closest: (selector) => selector.includes('[data-no-swipe]') ? {} : null })
    expect(find(app(), AddBatchForm)).toBeDefined()
    const label = { closest: (selector) => selector.split(',').includes('label') ? {} : null }
    const normalTap = capturedClick(app(), { props: {} }, { timeStamp: 250 })
    expect(normalTap.preventDefault).not.toHaveBeenCalled()
    all(content, (node) => node.type === 'input')[0].props.onChange({ target: { value: 'dirty' } })
    child(props)
    swipe(app(), 'right', label)
    const generatedLabelClick = capturedClick(app(), { props: {} })
    expect(generatedLabelClick.preventDefault).toHaveBeenCalledOnce()
    expect(find(child(props), DiscardChangesConfirmation)).toBeDefined()
    child.unmount()
  })
})

// Models the capture-before-target contract only; not browser click synthesis/DOM.
function targetFor(node) {
  const target = {
    closest: (selector) => selector === '[data-swipe-start]'
      ? node.props['data-swipe-start'] ? target : null
      : selector.split(',').includes(node.type) ? target : null,
  }
  return target
}
function capturedClick(appTree, node, overrides = {}) {
  const event = {
    detail: 1, timeStamp: 350, clientX: 170, clientY: 0,
    nativeEvent: { pointerId: 1, pointerType: 'touch', isTrusted: true },
    preventDefault: vi.fn(), stopPropagation: vi.fn(), ...overrides,
  }
  find(appTree, 'main').props.onClickCapture(event)
  if (!event.stopPropagation.mock.calls.length) node.props.onClick?.(event)
  return event
}

describe('approved swipe regions and trailing click wiring', () => {
  it.each([[-80, 40, true], [-40, 15, false], [40, 15, false]])(
    'Sidebar category motion (%s,%s) closes=%s without selecting; next tap works', (dx, dy, closes) => {
      const render = appRenderer()
      swipe(render())
      const drawerRender = renderer(SidebarDrawer)
      const drawerProps = find(render(), SidebarDrawer).props
      const onCategoryNavigate = vi.fn(drawerProps.onCategoryNavigate)
      const drawer = drawerRender({ ...drawerProps, onCategoryNavigate })
      const category = button(drawer, '猫罐头')
      const main = find(render(), 'main').props
      const handlers = gesture(drawer).props
      const start = { pointerType: 'touch', pointerId: 1, clientX: 150, clientY: 0, timeStamp: 0, target: targetFor(category) }
      const end = { ...start, clientX: 150 + dx, clientY: dy, timeStamp: 300 }
      main.onPointerDownCapture(start)
      handlers.onPointerDown(start)
      main.onPointerDown(start) // Model the actual bubble to disabled main open.
      handlers.onPointerMove({ ...end, timeStamp: 150 })
      main.onPointerMove({ ...end, timeStamp: 150 })
      handlers.onPointerUp(end)
      main.onPointerUp(end)
      expect(find(render(), SidebarDrawer).props.open).toBe(!closes)
      const trailing = capturedClick(render(), category, { clientX: end.clientX, clientY: dy })
      expect(trailing.stopPropagation).toHaveBeenCalledOnce()
      expect(onCategoryNavigate).not.toHaveBeenCalled()
      if (closes) swipe(render())
      const reopened = drawerRender({ ...find(render(), SidebarDrawer).props, onCategoryNavigate })
      find(render(), 'main').props.onPointerDownCapture({ ...start, timeStamp: 500 })
      capturedClick(render(), button(reopened, '猫罐头'), { timeStamp: 600 })
      expect(onCategoryNavigate).toHaveBeenCalledWith('猫罐头')
    },
  )
  it('a category tiny-motion tap is still ordinary click navigation', () => {
    const render = appRenderer()
    swipe(render())
    const onCategoryNavigate = vi.fn(find(render(), SidebarDrawer).props.onCategoryNavigate)
    const drawer = renderer(SidebarDrawer)({ ...find(render(), SidebarDrawer).props, onCategoryNavigate })
    const category = button(drawer, '猫罐头')
    const handlers = gesture(drawer).props
    const start = { pointerType: 'touch', pointerId: 1, clientX: 150, clientY: 0, timeStamp: 0, target: targetFor(category) }
    find(render(), 'main').props.onPointerDownCapture(start)
    handlers.onPointerDown(start)
    handlers.onPointerUp({ ...start, clientX: 153, clientY: 1, timeStamp: 150 })
    const tap = capturedClick(render(), category)
    expect(tap.stopPropagation).not.toHaveBeenCalled()
    expect(onCategoryNavigate).toHaveBeenCalledWith('猫罐头')
  })
  it.each([['home', BatchCard], ['archive', ArchiveBatchCard]])('%s card tap opens detail; swipe opens only Sidebar; next tap works', (view, Card) => {
    const render = appRenderer()
    if (view === 'archive') find(render(), SidebarDrawer).props.onNavigate('archive')
    const list = view === 'archive' ? renderer(ArchivePage)(find(render(), ArchivePage).props) : render()
    const cardNode = all(list, (node) => node.type === Card)[0]
    const cardButton = find(renderer(Card)(cardNode.props), 'button')
    const root = find(render(), 'main')
    root.props.onPointerDownCapture({ pointerType: 'touch' })
    swipe(render(), 'right', targetFor(cardButton))
    expect(find(render(), SidebarDrawer).props.open).toBe(true)
    const click = capturedClick(render(), cardButton)
    expect(click.stopPropagation).toHaveBeenCalledOnce()
    expect(all(render(), (node) => node.type === BatchDetail)).toHaveLength(0)
    find(render(), SidebarDrawer).props.onClose()
    find(render(), 'main').props.onPointerDownCapture({ pointerType: 'touch' })
    const tap = capturedClick(render(), cardButton, { timeStamp: 600 })
    expect(tap.stopPropagation).not.toHaveBeenCalled()
    expect(find(render(), BatchDetail).props.archiveMode ?? false).toBe(view === 'archive')
  })
  it('category swipe closes without navigation after Drawer unmount; next category tap works', () => {
    const render = appRenderer()
    swipe(render())
    const drawerRender = renderer(SidebarDrawer)
    const drawerProps = find(render(), SidebarDrawer).props
    const onCategoryNavigate = vi.fn(drawerProps.onCategoryNavigate)
    const drawer = drawerRender({ ...drawerProps, onCategoryNavigate })
    const category = button(drawer, '猫罐头')
    find(render(), 'main').props.onPointerDownCapture({ pointerType: 'touch' })
    swipe(drawer, 'left', targetFor(category))
    expect(find(render(), SidebarDrawer).props.open).toBe(false)
    capturedClick(render(), category, { clientX: 30 })
    expect(onCategoryNavigate).not.toHaveBeenCalled()
    swipe(render())
    const reopened = drawerRender({ ...find(render(), SidebarDrawer).props, onCategoryNavigate })
    find(render(), 'main').props.onPointerDownCapture({ pointerType: 'touch' })
    capturedClick(render(), button(reopened, '猫罐头'), { timeStamp: 600 })
    expect(onCategoryNavigate).toHaveBeenCalledWith('猫罐头')
    expect(find(render(), SidebarDrawer).props.categoryFilter).toBe('猫罐头')
  })
  it('allows Sidebar top-level navigation content too', () => {
    const onClose = vi.fn()
    const tree = renderer(SidebarDrawer)({ open: true, onClose })
    swipe(tree, 'left', targetFor(button(tree, '已归档')))
    expect(onClose).toHaveBeenCalledOnce()
  })
  it.each([false, true])('detail display image Back reaches original target (archive=%s)', (archiveMode) => {
    const render = appRenderer()
    const onBack = vi.fn()
    const props = { batch: { ...batch, product: { ...batch.product, image_url: 'https://example.invalid/display.jpg' } },
      onBack, archiveMode, swipeClickGuard: find(render(), SidebarDrawer).props.swipeClickGuard }
    const tree = renderer(BatchDetail)(props)
    const image = all(tree, (node) => node.type === 'img')[0]
    swipe(tree, 'right', targetFor(image))
    expect(onBack).toHaveBeenCalledOnce()
    const underneath = { props: { onClick: vi.fn() } }
    capturedClick(render(), underneath)
    expect(underneath.props.onClick).not.toHaveBeenCalled()
  })
  it.each([['Add', AddBatchForm, '返回首页'], ['Add Inventory', AddInventoryForm, '返回库存操作'],
    ['Product Edit', BatchDetail, '取消']])('%s safe exit button swipe retains dirty confirmation', (_name, Component, text) => {
    const app = appRenderer()
    const render = renderer(Component)
    const onExit = vi.fn()
    const props = { batch, product: batch.product, defaultMode: 'product-edit', onBack: onExit, onCancel: onExit,
      swipeClickGuard: find(app(), SidebarDrawer).props.swipeClickGuard }
    all(render(props), (node) => node.type === 'input')[0].props.onChange({ target: { value: 'dirty' } })
    const control = button(render(props), text)
    swipe(render(props), 'right', targetFor(control))
    expect(find(render(props), DiscardChangesConfirmation)).toBeDefined()
    const click = capturedClick(app(), control)
    expect(click.stopPropagation).toHaveBeenCalledOnce()
    find(render(props), DiscardChangesConfirmation).props.onCancel()
    expect(all(render(props), (node) => node.type === 'input')[0].props.value).toBe('dirty')
    expect(onExit).not.toHaveBeenCalled()
  })
})

describe('protected form exits', () => {
  it('treats restored field values and number/string display equivalence as pristine', () => {
    expect(hasFormChanges({ quantity: '1' }, { quantity: 1 })).toBe(false)
    expect(hasFormChanges({ quantity: '2' }, { quantity: '1' })).toBe(true)
  })
  it.each([['Add', AddBatchForm], ['Add Inventory', AddInventoryForm]])('%s returns pristine immediately; dirty refusal preserves fields', (_name, Component) => {
    const render = renderer(Component)
    const onCancel = vi.fn()
    const props = { onCancel, onSave: vi.fn(), onLookupBarcode: vi.fn(), product: batch.product, unit: '罐' }
    swipe(render(props))
    expect(onCancel).toHaveBeenCalledOnce()
    const input = all(render(props), (node) => node.type === 'input')[0]
    input.props.onChange({ target: { value: '123' } })
    const back = Component === AddBatchForm ? '返回首页' : '返回库存操作'
    button(render(props), back).props.onClick()
    find(render(props), DiscardChangesConfirmation).props.onCancel()
    expect(all(render(props), (node) => node.type === 'input')[0].props.value).toBe('123')
    expect(onCancel).toHaveBeenCalledOnce()
    swipe(render(props))
    find(render(props), DiscardChangesConfirmation).props.onDiscard()
    expect(onCancel).toHaveBeenCalledTimes(2)
  })
  it('Add → home and Add Inventory → existing detail target', () => {
    const render = appRenderer()
    const add = all(render(), (node) => node.props?.onAdd)[0]
    add.props.onAdd()
    const addRender = renderer(AddBatchForm)
    addRender(find(render(), AddBatchForm).props)
    swipe(render())
    addRender.unmount()
    expect(find(render(), SidebarDrawer)).toBeDefined()
    const card = all(render(), (node) => node.props?.onSelect && node.props?.batch?.id === batch.id)[0]
    card.props.onSelect(batch.id)
    find(render(), BatchDetail).props.onAddInventory(batch)
    const inventoryRender = renderer(AddInventoryForm)
    inventoryRender(find(render(), AddInventoryForm).props)
    swipe(render())
    inventoryRender.unmount()
    expect(find(render(), BatchDetail).props.batch.id).toBe(batch.id)
  })
  it('Product edit shares protected top Back and Cancel, returning detail rather than home', () => {
    const render = renderer(BatchDetail)
    const onBack = vi.fn()
    const props = { batch, onBack, defaultMode: 'product-edit' }
    find(render(props), ProductImagePicker).props.onChange({ name: 'pending.jpg' })
    button(render(props), '返回详情').props.onClick()
    find(render(props), DiscardChangesConfirmation).props.onCancel()
    swipe(render(props))
    expect(find(render(props), DiscardChangesConfirmation)).toBeDefined()
    find(render(props), DiscardChangesConfirmation).props.onCancel()
    button(render(props), '取消').props.onClick()
    find(render(props), DiscardChangesConfirmation).props.onDiscard()
    expect(button(render(props), '编辑商品')).toBeDefined()
    expect(onBack).not.toHaveBeenCalled()
  })
  it('Add pending image is dirty and refusal keeps the picker mounted with its key', () => {
    const render = renderer(AddBatchForm)
    const onCancel = vi.fn()
    const props = { onCancel }
    const picker = find(render(props), ProductImagePicker)
    picker.props.onChange({ name: 'pending.jpg' })
    swipe(render(props))
    find(render(props), DiscardChangesConfirmation).props.onCancel()
    expect(find(render(props), ProductImagePicker).key).toBe(picker.key)
    swipe(render(props))
    expect(find(render(props), DiscardChangesConfirmation)).toBeDefined()
    expect(onCancel).not.toHaveBeenCalled()
  })
  it.each([['Add', AddBatchForm], ['Add Inventory', AddInventoryForm], ['Detail', BatchDetail]])('%s blocks swipe during busy', (_name, Component) => {
    const onExit = vi.fn()
    const tree = renderer(Component)({ batch, product: batch.product, busy: true, onCancel: onExit, onBack: onExit })
    swipe(tree)
    expect(onExit).not.toHaveBeenCalled()
  })
  it('Add scanner and lookup block swipe; lookup-prefilled values are dirty', async () => {
    const render = renderer(AddBatchForm)
    const onCancel = vi.fn()
    let finish
    const props = { onCancel, onLookupBarcode: () => new Promise((resolve) => { finish = resolve }) }
    button(render(props), '扫码添加').props.onClick()
    swipe(render(props))
    expect(onCancel).not.toHaveBeenCalled()
    const lookup = find(render(props), BarcodeScanner).props.onDetected('123')
    swipe(render(props))
    expect(onCancel).not.toHaveBeenCalled()
    finish({ ok: true, origin: 'local', status: 'found', product: { barcode: '123', name: '查到的商品', brand: '', category: '', source: 'local' } })
    await lookup
    swipe(render(props))
    expect(find(render(props), DiscardChangesConfirmation)).toBeDefined()
  })
  it.each(['消耗库存', '标记为已消耗', '删除当前库存批次'])('pending %s blocks detail swipe until cancellation', (operation) => {
    const render = renderer(BatchDetail)
    const props = { batch: operation === '标记为已消耗' ? { ...batch, quantity: 0 } : batch, defaultMode: 'inventory-operation' }
    const panelRender = renderer(InventoryOperationPanel)
    let panel = find(render(props), InventoryOperationPanel)
    button(panelRender(panel.props), operation).props.onClick()
    panelRender(panel.props)
    swipe(render(props))
    expect(find(render(props), InventoryOperationPanel)).toBeDefined()
    button(panelRender(panel.props), '取消').props.onClick()
    panelRender(panel.props)
    swipe(render(props))
    expect(button(render(props), '编辑商品')).toBeDefined()
  })
  it.each(['删除历史批次', '删除整个商品'])('Archive %s confirmation blocks swipe Back', (operation) => {
    const onBack = vi.fn()
    const render = renderer(BatchDetail)
    const props = { batch: { ...batch, status: 'consumed' }, archiveMode: true, onBack,
      productDeleteGuard: { productId: batch.product.id, status: 'clear' } }
    const actions = find(render(props), ArchiveBatchActions)
    const renderActions = renderer(ArchiveBatchActions)
    button(renderActions(actions.props), operation).props.onClick()
    renderActions(actions.props)
    swipe(render(props))
    expect(onBack).not.toHaveBeenCalled()
  })
  it('protected exit cannot discard while busy', () => {
    const onExit = vi.fn()
    const render = renderer(useProtectedExit)
    render({ dirty: true, busy: false, onExit }).requestExit()
    render({ dirty: true, busy: true, onExit }).discard()
    expect(onExit).not.toHaveBeenCalled()
    expect(render({ dirty: true, busy: true, onExit }).confirming).toBe(true)
  })
  it('Product pristine Back and edited-then-restored values do not confirm', () => {
    const render = renderer(BatchDetail)
    const props = { batch, defaultMode: 'product-edit', onBack: vi.fn() }
    const input = all(render(props), (node) => node.type === 'input')[0]
    input.props.onChange({ target: { value: '修改名' } })
    all(render(props), (node) => node.type === 'input')[0].props.onChange({ target: { value: batch.product.name } })
    swipe(render(props))
    expect(button(render(props), '编辑商品')).toBeDefined()
    expect(props.onBack).not.toHaveBeenCalled()
    expect(all(render(props), (node) => node.type === DiscardChangesConfirmation)).toHaveLength(0)
  })
  it('dirty Product refusal preserves fields and pending image; acceptance clears both', () => {
    const render = renderer(BatchDetail)
    const props = { batch, defaultMode: 'product-edit' }
    all(render(props), (node) => node.type === 'input')[0].props.onChange({ target: { value: '修改名' } })
    const picker = find(render(props), ProductImagePicker)
    picker.props.onChange({ name: 'pending.jpg' })
    swipe(render(props))
    find(render(props), DiscardChangesConfirmation).props.onCancel()
    expect(all(render(props), (node) => node.type === 'input')[0].props.value).toBe('修改名')
    expect(find(render(props), ProductImagePicker).key).toBe(picker.key)
    swipe(render(props))
    find(render(props), DiscardChangesConfirmation).props.onDiscard()
    button(render(props), '编辑商品').props.onClick()
    expect(all(render(props), (node) => node.type === 'input')[0].props.value).toBe(batch.product.name)
    swipe(render(props))
    expect(button(render(props), '编辑商品')).toBeDefined()
  })
  it('Add Inventory compares expiry independently and restoring both values removes dirty', () => {
    const render = renderer(AddInventoryForm)
    const props = { product: batch.product, onCancel: vi.fn() }
    find(render(props), DateInput).props.onChange('2027-01-01')
    swipe(render(props))
    find(render(props), DiscardChangesConfirmation).props.onCancel()
    expect(find(render(props), DateInput).props.value).toBe('2027-01-01')
    find(render(props), DateInput).props.onChange('')
    swipe(render(props))
    expect(props.onCancel).toHaveBeenCalledOnce()
  })
  it('Product saving stays blocked across the text-save → image-upload boundary', async () => {
    const render = renderer(BatchDetail)
    let finishProduct
    let finishImage
    const image = { name: 'pending.jpg' }
    const props = { batch, defaultMode: 'product-edit', onBack: vi.fn(),
      onUpdateProduct: () => new Promise((resolve) => { finishProduct = resolve }),
      onUpdateProductImage: vi.fn(() => new Promise((resolve) => { finishImage = resolve })) }
    find(render(props), ProductImagePicker).props.onChange(image)
    const saving = find(render(props), 'form').props.onSubmit({ preventDefault() {} })
    swipe(render(props))
    expect(button(render(props), '返回详情').props.disabled).toBe(true)
    finishProduct(true)
    await Promise.resolve()
    swipe(render(props))
    expect(button(render(props), '返回详情').props.disabled).toBe(true)
    expect(props.onUpdateProductImage).toHaveBeenCalledWith(batch.id, batch.product, image)
    finishImage({ ok: false })
    await saving
    swipe(render(props))
    expect(find(render(props), DiscardChangesConfirmation)).toBeDefined()
  })
  it.each([['Add', AddBatchForm], ['Add Inventory', AddInventoryForm]])('%s local submission blocks Back even before parent busy arrives', async (_name, Component) => {
    const render = renderer(Component)
    let finish
    const props = { product: batch.product, onCancel: vi.fn(), onSave: () => new Promise((resolve) => { finish = resolve }) }
    if (Component === AddBatchForm) {
      all(render(props), (node) => node.type === 'input')[0].props.onChange({ target: { value: '123' } })
      button(render(props), '直接填写').props.onClick()
    }
    find(render(props), DateInput).props.onChange('2027-01-01')
    const saving = find(render(props), 'form').props.onSubmit({ preventDefault() {} })
    swipe(render(props))
    expect(props.onCancel).not.toHaveBeenCalled()
    finish(false)
    await saving
    swipe(render(props))
    expect(find(render(props), DiscardChangesConfirmation)).toBeDefined()
  })
  it('Product delete busy blocks Archive Back button and swipe', () => {
    const props = { batch, archiveMode: true, productDeleteBusy: true, onBack: vi.fn() }
    const tree = renderer(BatchDetail)(props)
    swipe(tree)
    button(tree, '返回已归档').props.onClick()
    expect(props.onBack).not.toHaveBeenCalled()
  })
})
