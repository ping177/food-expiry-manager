import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import ArchivePage from './ArchivePage'

const batch = {
  id: 'consumed-batch-1',
  quantity: 0,
  expiry_date: '2026-04-01',
  status: 'consumed',
  updated_at: '2026-08-19T10:00:00Z',
  product: {
    name: '鸡肉猫罐头',
    brand: 'MjAMjAM',
    category: '猫罐头',
  },
}

const discardedBatch = {
  ...batch,
  id: 'discarded-batch-1',
  status: 'discarded',
  product: {
    ...batch.product,
    name: '被删除的鸡肉猫罐头',
  },
}

function renderPage(overrides = {}) {
  return renderToStaticMarkup(
    <ArchivePage
      batches={[]}
      categoryFilter="all"
      error=""
      loading={false}
      onCategoryChange={vi.fn()}
      onRetry={vi.fn()}
      onSearchChange={vi.fn()}
      onSelect={vi.fn()}
      searchQuery=""
      {...overrides}
    />,
  )
}

describe('ArchivePage', () => {
  it('renders loading, error, and empty states', () => {
    expect(renderPage({ loading: true })).toContain('正在读取已归档…')
    expect(renderPage({ error: '读取已归档失败' })).toContain('读取已归档失败')
    expect(renderPage()).toContain('还没有已归档批次')
  })

  it('renders consumed batches with archive filters and no active expiry filter', () => {
    const html = renderPage({ batches: [batch] })

    expect(html).toContain('搜索已归档商品')
    expect(html).toContain('筛选已归档分类')
    expect(html).toContain('鸡肉猫罐头')
    expect(html).toContain('已消耗')
    expect(html).not.toContain('到期时间')
  })

  it('does not show active batches in the archive list', () => {
    const html = renderPage({
      batches: [
        batch,
        {
          ...batch,
          id: 'active-batch-1',
          status: 'active',
          product: { ...batch.product, name: '仍在库存的商品' },
        },
      ],
    })

    expect(html).toContain('鸡肉猫罐头')
    expect(html).not.toContain('仍在库存的商品')
  })

  it('shows consumed and discarded batches together with distinct status labels', () => {
    const html = renderPage({ batches: [batch, discardedBatch] })

    expect(html).toContain('已消耗')
    expect(html).toContain('已删除')
    expect(html).toContain('被删除的鸡肉猫罐头')
  })
})
