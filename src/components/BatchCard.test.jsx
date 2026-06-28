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
  it('renders a compact inventory app card summary', () => {
    const html = renderBatchCard()

    expect(html).toContain('旧商品名')
    expect(html).toContain('旧分类')
    expect(html).toContain('剩余 6 件')
    expect(html).not.toContain('剩余 6 罐')
    expect(html).toContain('保质期至')
    expect(html).toContain('2026-12-01')
  })

  it('renders the expiry window in the expiry metadata row, not the title row', () => {
    const html = renderBatchCard({
      batch: {
        ...batch,
        expiry_date: dateFromToday(181),
      },
    })

    expect(html).toContain('1年')
    expect(html).toMatch(/<div class="mt-auto flex[^"]*">[\s\S]*保质期至[\s\S]*1年[\s\S]*<\/div>/)
    expect(html).not.toMatch(/<h2[^>]*>[\s\S]*1年[\s\S]*<\/h2>/)
  })

  it('keeps brand and barcode out of the home card', () => {
    const html = renderBatchCard()

    expect(html).not.toContain('旧品牌')
    expect(html).not.toContain('1234567890123')
  })

  it('renders a stable placeholder when the product image is missing', () => {
    const html = renderBatchCard({
      batch: {
        ...batch,
        product: {
          ...batch.product,
          image_url: '',
        },
      },
    })

    expect(html).toContain('无图')
    expect(html).toContain('库存图片占位')
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
