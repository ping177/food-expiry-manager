import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import SidebarDrawer from './SidebarDrawer'

function renderDrawer(activeSection = 'archive') {
  return renderToStaticMarkup(
    <SidebarDrawer
      activeSection={activeSection}
      onClose={vi.fn()}
      onNavigate={vi.fn()}
      open
    />,
  )
}

describe('SidebarDrawer', () => {
  it('renders the two navigation entries with a selected state', () => {
    const html = renderDrawer()

    expect(html).toContain('侧边栏导航')
    expect(html).toContain('库存')
    expect(html).toContain('已归档')
    expect(html).toContain('aria-current="page"')
    expect(html).toContain('aria-label="关闭菜单"')
    expect(html).not.toContain('我的')
  })

  it('keeps the drawer within the viewport and the safe areas', () => {
    const html = renderDrawer('inventory')

    expect(html).toContain('max-w-[calc(100vw-2rem)]')
    expect(html).toContain('env(safe-area-inset-top)')
    expect(html).toContain('env(safe-area-inset-bottom)')
    expect(html).toContain('overflow-x-hidden')
  })
})
