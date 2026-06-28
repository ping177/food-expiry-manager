import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import BatchCard from './BatchCard'

const batch = {
  id: 'batch-1',
  quantity: 6,
  unit: '罐',
  expiry_date: '2026-12-01',
  storage_location: '厨房柜子',
  product: {
    id: 'product-1',
    barcode: '1234567890123',
    name: '旧商品名',
    brand: '旧品牌',
    category: '旧分类',
    image_url: 'https://example.com/old.jpg',
  },
}

function dateFromToday(daysToAdd) {
  const date = new Date()
  date.setDate(date.getDate() + daysToAdd)
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-')
}

function renderBatchCard(props = {}) {
  return renderToStaticMarkup(
    <BatchCard batch={batch} onSelect={vi.fn()} {...props} />,
  )
}

describe('BatchCard summary UI', () => {
  it('renders a lightweight inventory summary card', () => {
    const html = renderBatchCard()

    expect(html).toContain('旧商品名')
    expect(html).toContain('旧品牌')
    expect(html).toContain('旧分类')
    expect(html).toContain('6')
    expect(html).toContain('罐')
    expect(html).toContain('2026-12-01')
  })

  it('shows the shared expiry window badge instead of the old normal status', () => {
    const html = renderBatchCard({
      batch: {
        ...batch,
        expiry_date: dateFromToday(181),
      },
    })

    expect(html).toContain('1年')
    expect(html).not.toContain('正常')
    expect(html).not.toContain('临期')
  })

  it('does not expose edit actions on the home card', () => {
    const html = renderBatchCard()

    expect(html).not.toContain('编辑商品信息')
    expect(html).not.toContain('编辑数量')
    expect(html).not.toContain('商品信息')
    expect(html).not.toContain('更新')
  })
})
