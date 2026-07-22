import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import BottomTabNav from './BottomTabNav'

function renderBottomTabNav(activeTab = 'inventory') {
  return renderToStaticMarkup(
    <BottomTabNav activeTab={activeTab} onChange={vi.fn()} />,
  )
}

describe('BottomTabNav', () => {
  it('renders exactly two top-level tabs', () => {
    const html = renderBottomTabNav()

    expect(html.match(/role="tab"/g)).toHaveLength(2)
    expect(html).toContain('库存')
    expect(html).toContain('我的')
    expect(html).toContain('fixed')
  })

  it('marks the current tab as selected', () => {
    const html = renderBottomTabNav('account')

    expect(html).toContain('aria-selected="true"')
    expect(html).toContain('aria-label="我的"')
  })
})
