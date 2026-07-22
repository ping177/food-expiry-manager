import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import BottomTabNav from './BottomTabNav'

function renderBottomTabNav(activeTab = 'inventory') {
  return renderToStaticMarkup(
    <BottomTabNav
      activeTab={activeTab}
      onAdd={vi.fn()}
      onChange={vi.fn()}
    />,
  )
}

describe('BottomTabNav', () => {
  it('renders three SVG icons while keeping two tabs and a separate add action', () => {
    const html = renderBottomTabNav()

    expect(html.match(/role="tab"/g)).toHaveLength(2)
    expect(html.match(/<svg/g)).toHaveLength(3)
    expect(html).toContain('库存')
    expect(html).toContain('我的')
    expect(html).toContain('aria-label="添加商品"')
    expect(html).toContain('viewBox="0 0 24 24"')
    expect(html).toContain('fixed')
  })

  it('marks the current tab as selected', () => {
    const html = renderBottomTabNav('account')

    expect(html).toContain('aria-selected="true"')
    expect(html).toContain('aria-label="我的"')
  })

  it('uses a lightweight navigation surface without card styling', () => {
    const html = renderBottomTabNav()

    expect(html).not.toContain('shadow-card')
    expect(html).not.toContain('rounded-xl')
    expect(html).toContain('text-slate-500')
    expect(html).toContain('border-leaf text-leaf')
    expect(html).toContain('safe-area-inset-bottom')
  })
})
