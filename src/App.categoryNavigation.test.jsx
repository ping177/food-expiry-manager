import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, describe, expect, it, vi } from 'vitest'
import App from './App'
import SidebarDrawer from './components/SidebarDrawer'
import ArchivePage from './components/ArchivePage'
import BatchCard from './components/BatchCard'
import BottomTabNav from './components/BottomTabNav'
import { PRODUCT_CATEGORIES } from './lib/categories'

// The project runs in Node without a DOM renderer. Keep hook state across shallow
// renders and invoke real JSX callbacks; do not duplicate navigation/filter logic.
const hooks = vi.hoisted(() => ({ current: null }))
vi.mock('react', async (importOriginal) => ({
  ...await importOriginal(),
  useState(initial) {
    const runtime = hooks.current
    const index = runtime.stateIndex++
    if (!(index in runtime.states)) {
      runtime.states[index] = typeof initial === 'function' ? initial() : initial
    }
    return [runtime.states[index], (next) => {
      runtime.states[index] = typeof next === 'function'
        ? next(runtime.states[index]) : next
    }]
  },
  useRef(initial) {
    const runtime = hooks.current
    const index = runtime.refIndex++
    runtime.refs[index] ??= { current: initial }
    return runtime.refs[index]
  },
  useCallback: (callback) => callback,
  useEffect: (effect) => hooks.current.effects.push(effect),
}))
vi.mock('./lib/supabase', () => ({
  supabase: null,
  missingSupabaseVariables: [],
}))

function createRenderer(Component, states = {}) {
  const runtime = { states, refs: [], effects: [] }
  return (props = {}) => {
    hooks.current = runtime
    runtime.stateIndex = 0
    runtime.refIndex = 0
    runtime.effects = []
    const tree = Component(props)
    return { tree, effects: runtime.effects }
  }
}

function findAll(tree, predicate) {
  if (!tree || typeof tree !== 'object') return []
  if (Array.isArray(tree)) return tree.flatMap((child) => findAll(child, predicate))
  return [
    ...(predicate(tree) ? [tree] : []),
    ...findAll(tree.props?.children, predicate),
  ]
}
function find(tree, type) {
  const nodes = findAll(tree, (node) => node.type === type)
  expect(nodes).toHaveLength(1)
  return nodes[0]
}
function button(tree, label) {
  return findAll(tree, (node) => node.type === 'button' && node.props.children === label)[0]
}
function makeBatch(id, category, name = '目标商品', expiry = '2026-10-20', status = 'active') {
  return { id, status, quantity: 1, unit: '件', expiry_date: expiry,
    product: { id: `product-${id}`, name, brand: '测试品牌', category } }
}
const inventory = [
  makeBatch('cat', '猫罐头'),
  makeBatch('food', '食品'),
  makeBatch('other-name', '猫罐头', '不同商品'),
  makeBatch('later', '猫罐头', '目标商品', '2027-10-20'),
  makeBatch('empty', ''),
  makeBatch('legacy', '历史分类'),
  makeBatch('consumed', '猫罐头', '目标商品', '2026-10-20', 'consumed'),
]
function setupApp(batches = inventory) {
  // Only seed the authenticated data boundary, using App's existing state order:
  // session, sessionUserId, batches, archivedBatches, ... authLoading.
  const render = createRenderer(App, {
    0: { user: { id: 'test-user', email: 'test@example.com' } },
    1: 'test-user', 2: batches,
    3: [makeBatch('archived', '饮品', '历史饮品', '2026-10-20', 'discarded')],
    13: false,
  })
  const tree = () => render().tree
  const drawer = () => find(tree(), SidebarDrawer)
  const select = (category) => {
    open() // Invoke the actual Sidebar button before checking the next App render.
    const rendered = createRenderer(SidebarDrawer)(drawer().props).tree
    button(rendered, category).props.onClick()
  }
  const open = () => findAll(tree(), (node) => node.props?.['aria-label'] === '打开菜单')[0].props.onClick()
  const ids = () => findAll(tree(), (node) => node.type === BatchCard).map((node) => node.props.batch.id)
  return { tree, drawer, select, open, ids }
}

afterEach(() => {
  hooks.current = null
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('Category Navigation behavior', () => {
  it('renders 全部 and every canonical category in order, with the Active category selected', () => {
    const render = createRenderer(SidebarDrawer)
    const { tree } = render({ open: true, activeSection: 'inventory', categoryFilter: '猫罐头' })
    const categoryButtons = findAll(tree, (node) => node.type === 'button' && node.props['aria-pressed'] !== undefined)
    expect(categoryButtons.map((node) => node.props.children)).toEqual(['全部', ...PRODUCT_CATEGORIES])
    expect(categoryButtons.filter((node) => node.props['aria-pressed']).map((node) => node.props.children)).toEqual(['猫罐头'])
    const archiveTree = render({ open: true, activeSection: 'archive', categoryFilter: '猫罐头' }).tree
    expect(findAll(archiveTree, (node) => node.props?.['aria-pressed'] === true)).toHaveLength(0)
  })

  it('applies a category, filters Active inventory and closes the Drawer', () => {
    const app = setupApp()
    app.open()
    expect(app.drawer().props.open).toBe(true)
    app.select('猫罐头')
    expect(app.drawer().props.categoryFilter).toBe('猫罐头')
    expect(app.ids()).toEqual(['cat', 'other-name', 'later'])
    expect(app.drawer().props.open).toBe(false)
    expect(find(app.tree(), BottomTabNav).props.activeTab).toBe('inventory')
    app.open()
    const selectedDrawer = createRenderer(SidebarDrawer)(app.drawer().props).tree
    expect(button(selectedDrawer, '猫罐头').props['aria-pressed']).toBe(true)
  })

  it.each([['食品', ['food']], ['全部', ['cat', 'food', 'other-name', 'later', 'empty', 'legacy']]])(
    'keeps Archive filters independent when selecting %s from Archive', (category, expectedIds) => {
    const app = setupApp()
    app.select('猫罐头')
    app.drawer().props.onNavigate('archive')
    find(app.tree(), ArchivePage).props.onCategoryChange('饮品')
    find(app.tree(), ArchivePage).props.onSearchChange('历史')
    app.open()
    app.select(category)
    expect(app.ids()).toEqual(expectedIds)
    expect(app.drawer().props.open).toBe(false)
    expect(find(app.tree(), BottomTabNav).props.activeTab).toBe('inventory')
    app.drawer().props.onNavigate('archive')
    const archive = find(app.tree(), ArchivePage)
    expect(archive.props.categoryFilter).toBe('饮品')
    expect(archive.props.searchQuery).toBe('历史')
    const archiveTree = ArchivePage(archive.props)
    expect(find(archiveTree, 'select').props.value).toBe('饮品')
    expect(find(archiveTree, 'input').props.value).toBe('历史')
    app.drawer().props.onNavigate('inventory')
    expect(app.drawer().props.categoryFilter).toBe(category === '全部' ? 'all' : category)
    expect(app.ids()).toEqual(expectedIds)
  })

  it('combines category, search, expiry and status; 全部 preserves search and expiry', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-10-07T12:00:00'))
    const app = setupApp()
    find(app.tree(), 'input').props.onChange({ target: { value: '目标' } })
    const selects = findAll(app.tree(), (node) => node.type === 'select')
    const expiry = selects.find((node) => node.props.value === 'all')
    expiry.props.onChange({ target: { value: 'within30' } })
    app.select('猫罐头')
    expect(app.ids()).toEqual(['cat'])
    app.open()
    app.select('全部')
    expect(app.drawer().props.categoryFilter).toBe('all')
    expect(find(app.tree(), 'input').props.value).toBe('目标')
    expect(find(app.tree(), 'select').props.value).toBe('within30')
    expect(app.ids()).toEqual(['cat', 'food', 'empty', 'legacy'])
    expect(app.drawer().props.open).toBe(false)
  })

  it('preserves Active category, search and expiry through top-level and bottom inventory navigation', () => {
    const app = setupApp()
    app.select('猫罐头')
    find(app.tree(), 'input').props.onChange({ target: { value: '目标' } })
    find(app.tree(), 'select').props.onChange({ target: { value: 'within30' } })
    app.drawer().props.onNavigate('archive')
    app.drawer().props.onNavigate('inventory')
    expect(app.drawer().props.categoryFilter).toBe('猫罐头')
    expect(find(app.tree(), 'input').props.value).toBe('目标')
    expect(find(app.tree(), 'select').props.value).toBe('within30')
    find(app.tree(), BottomTabNav).props.onChange('account')
    find(app.tree(), BottomTabNav).props.onChange('inventory')
    expect(app.drawer().props.categoryFilter).toBe('猫罐头')
  })

  it('removes the Active category select while retaining search, expiry and clear-all behavior', () => {
    const app = setupApp()
    expect(find(app.tree(), 'input').props.type).toBe('search')
    expect(findAll(app.tree(), (node) => node.type === 'select')).toHaveLength(1)
    app.select('猫罐头')
    find(app.tree(), 'input').props.onChange({ target: { value: '不存在' } })
    find(app.tree(), 'select').props.onChange({ target: { value: 'expired' } })
    expect(app.ids()).toEqual([])
    button(app.tree(), '清除筛选').props.onClick()
    expect(app.drawer().props.categoryFilter).toBe('all')
    expect(find(app.tree(), 'input').props.value).toBe('')
    expect(find(app.tree(), 'select').props.value).toBe('all')
    expect(app.ids()).toEqual(inventory.filter((batch) => batch.status === 'active').map((batch) => batch.id))
  })

  it('keeps empty and unknown categories under all with their existing card labels', () => {
    const app = setupApp()
    expect(app.ids()).toContain('empty')
    expect(app.ids()).toContain('legacy')
    expect(renderToStaticMarkup(<BatchCard batch={inventory[4]} />)).toContain('未分类')
    expect(renderToStaticMarkup(<BatchCard batch={inventory[5]} />)).toContain('历史分类')
    app.select('其他')
    expect(app.ids()).toEqual([])
    app.select('全部')
    expect(app.ids()).toContain('legacy')
  })

  it('shows all categories even when Active inventory is empty', () => {
    const app = setupApp([])
    app.open()
    app.select('食品')
    expect(app.drawer().props.categoryFilter).toBe('食品')
    expect(app.ids()).toEqual([])
  })
})

describe('Drawer lifecycle behavior', () => {
  it.each(['Escape', 'overlay', 'close button'])('closes through %s and restores focus on cleanup', (action) => {
    const previousFocus = { focus: vi.fn() }
    const listeners = new Map()
    const document = {
      activeElement: previousFocus,
      addEventListener: (name, handler) => listeners.set(name, handler),
      removeEventListener: (name, handler) => {
        if (listeners.get(name) === handler) listeners.delete(name)
      },
    }
    vi.stubGlobal('document', document)
    const onClose = vi.fn()
    const render = createRenderer(SidebarDrawer)
    const { tree, effects } = render({ open: true, activeSection: 'inventory', categoryFilter: 'all', onClose })
    const closes = findAll(tree, (node) => node.type === 'button' && node.props['aria-label'] === '关闭菜单')
    const closeFocus = { focus: vi.fn() }
    closes[1].props.ref.current = closeFocus
    const cleanups = effects.map((effect) => effect())
    expect(closeFocus.focus).toHaveBeenCalledOnce()
    listeners.get('keydown')({ key: 'Enter' })
    expect(onClose).not.toHaveBeenCalled()
    if (action === 'Escape') listeners.get('keydown')({ key: 'Escape' })
    else closes[action === 'overlay' ? 0 : 1].props.onClick()
    expect(onClose).toHaveBeenCalledOnce()
    cleanups.forEach((cleanup) => cleanup?.())
    expect(previousFocus.focus).toHaveBeenCalledOnce()
    expect(listeners.size).toBe(0)
    expect(render({ open: false, onClose }).tree).toBeNull()
  })
})
