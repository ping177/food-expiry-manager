import { afterEach, describe, expect, it, vi } from 'vitest'
import App from './App'
import SidebarDrawer from './components/SidebarDrawer'
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
  return (props = {}) => {
    hooks.current = runtime
    runtime.stateIndex = runtime.refIndex = runtime.effectIndex = 0
    runtime.pending = []
    const tree = Component(props)
    runtime.pending.forEach((effect) => effect())
    return tree
  }
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
function swipe(tree, direction = 'right') {
  const props = gesture(tree)?.props
  expect(props).toBeDefined()
  const event = { pointerType: 'touch', pointerId: 1, clientX: 100, clientY: 0, timeStamp: 0, target: { closest: () => null } }
  props.onPointerDown(event)
  props.onPointerUp({ ...event, clientX: direction === 'right' ? 170 : 30, timeStamp: 300 })
}
const batch = { id: 'batch-1', quantity: 4, unit: '罐', expiry_date: '2027-01-01', status: 'active',
  product: { id: 'product-1', name: '猫罐头', brand: '', size_value: 170, size_unit: 'g', category: '猫罐头', image_url: '' } }
const appRenderer = () => renderer(App, { 0: { user: { id: 'test-user' } }, 1: 'test-user', 2: [batch],
  3: [{ ...batch, id: 'archived-1', status: 'consumed' }], 13: false })
afterEach(() => { hooks.current = null; vi.unstubAllGlobals() })

describe('gesture ownership and navigation', () => {
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
    swipe(renderer(BatchDetail)(detail.props))
    expect(find(render(), SidebarDrawer).props.activeSection).toBe('inventory')
  })
  it('Archive Back preserves its request invalidation and guard cleanup', () => {
    const render = renderer(App, { 0: { user: { id: 'test-user' } }, 1: 'test-user', 2: [batch],
      3: [{ ...batch, id: 'archived-1', status: 'consumed' }], 4: 'archive-detail', 7: 'archived-1', 13: false,
      20: { productId: batch.product.id, status: 'clear' } })
    const detail = find(render(), BatchDetail)
    swipe(renderer(BatchDetail)(detail.props))
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
    swipe(renderer(AddBatchForm)(find(render(), AddBatchForm).props))
    expect(find(render(), SidebarDrawer)).toBeDefined()
    const card = all(render(), (node) => node.props?.onSelect && node.props?.batch?.id === batch.id)[0]
    card.props.onSelect(batch.id)
    find(render(), BatchDetail).props.onAddInventory(batch)
    swipe(renderer(AddInventoryForm)(find(render(), AddInventoryForm).props))
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
