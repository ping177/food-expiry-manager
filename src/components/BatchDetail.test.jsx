import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { PRODUCT_CATEGORIES } from '../lib/categories'
import BatchDetail from './BatchDetail'

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

function renderBatchDetail(props = {}) {
  return renderToStaticMarkup(
    <BatchDetail
      batch={batch}
      busy={false}
      onBack={vi.fn()}
      onConsume={vi.fn()}
      onDecrement={vi.fn()}
      onUpdateProduct={vi.fn()}
      onUpdateQuantity={vi.fn()}
      {...props}
    />,
  )
}

describe('BatchDetail', () => {
  it('shows complete product, expiry, and inventory information', () => {
    const html = renderBatchDetail()

    expect(html).toContain('返回首页')
    expect(html).toContain('旧商品名')
    expect(html).toContain('旧品牌')
    expect(html).toContain('旧分类')
    expect(html).toContain('条形码：1234567890123')
    expect(html).toContain('保质期至')
    expect(html).toContain('2026-12-01')
    expect(html).toContain('当前库存')
    expect(html).toContain('6')
    expect(html).toContain('罐')
    expect(html).toContain('消耗 1')
    expect(html).not.toContain('更新')
  })

  it('shows the shared expiry window badge in the detail view', () => {
    const html = renderBatchDetail({
      batch: {
        ...batch,
        expiry_date: dateFromToday(366),
      },
    })

    expect(html).toContain('2年')
    expect(html).not.toContain('正常')
    expect(html).not.toContain('临期')
  })

  it('shows product fields and current batch quantity in the edit form', () => {
    const html = renderBatchDetail({ defaultProductEditing: true })

    expect(html).toContain('商品信息')
    expect(html).toContain('条形码：1234567890123')
    expect(html).toContain('商品名 *')
    expect(html).toContain('品牌')
    expect(html).toContain('分类')
    expect(html).toContain('图片链接')
    expect(html).toContain('当前批次')
    expect(html).toContain('当前库存')
    expect(html).toContain('value="6"')
  })

  it('uses the shared built-in category list in the edit form', () => {
    const html = renderBatchDetail({ defaultProductEditing: true })

    expect(html).toContain('<option value="">未选择分类</option>')
    for (const category of PRODUCT_CATEGORIES) {
      expect(html).toContain(`<option value="${category}">${category}</option>`)
    }
  })

  it('keeps barcode read-only in the product edit form', () => {
    const html = renderBatchDetail({ defaultProductEditing: true })

    expect(html).toContain('条形码：1234567890123')
    expect(html).not.toContain('value="1234567890123"')
  })
})
