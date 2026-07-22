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
      onUpdateProduct={vi.fn()}
      onUpdateProductImage={vi.fn()}
      onDeleteProductImage={vi.fn()}
      {...props}
    />,
  )
}

describe('BatchDetail', () => {
  it('shows read-only product, expiry, and inventory information in view mode', () => {
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
    expect(html).toContain('编辑商品')
    expect(html).toContain('库存操作')
    expect(html).not.toContain('保存修改')
    expect(html).not.toContain('消耗 1')
    expect(html).not.toContain('标记为已消耗')
    expect(html).not.toContain('删除当前库存批次')
    expect(html).not.toContain('<input')
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

  it('shows only product fields in product-edit mode', () => {
    const html = renderBatchDetail({ defaultMode: 'product-edit' })

    expect(html).toContain('商品信息')
    expect(html).toContain('条形码：1234567890123')
    expect(html).toContain('商品名 *')
    expect(html).toContain('品牌')
    expect(html).toContain('分类')
    expect(html).toContain('外部兜底图片链接（可选）')
    expect(html).toContain('保存修改')
    expect(html).not.toContain('当前批次')
    expect(html).not.toContain('value="6"')
    expect(html).not.toContain('type="number"')
    expect(html).not.toContain('消耗 1')
  })

  it('uses the shared built-in category list in the edit form', () => {
    const html = renderBatchDetail({ defaultMode: 'product-edit' })

    expect(html).toContain('<option value="">未选择分类</option>')
    for (const category of PRODUCT_CATEGORIES) {
      expect(html).toContain(`<option value="${category}">${category}</option>`)
    }
  })

  it('keeps barcode read-only in the product edit form', () => {
    const html = renderBatchDetail({ defaultMode: 'product-edit' })

    expect(html).toContain('条形码：1234567890123')
    expect(html).not.toContain('value="1234567890123"')
  })

  it('offers camera and album controls in product edit', () => {
    const html = renderBatchDetail({ defaultMode: 'product-edit' })
    expect(html).toContain('拍照')
    expect(html).toContain('从相册选择')
    expect(html).toContain('capture="environment"')
  })

  it('shows current stock, current expiry, and inventory operation entries', () => {
    const html = renderBatchDetail({ defaultMode: 'inventory-operation' })

    expect(html).toContain('库存操作')
    expect(html).toContain('当前库存')
    expect(html).toContain('当前批次保质期')
    expect(html).toContain('2026-12-01')
    expect(html).toContain('新增库存')
    expect(html).toContain('消耗库存')
    expect(html).toContain('删除当前库存批次')
    expect(html).not.toContain('将在后续版本加入确认流程')
    expect(html).not.toContain('商品名 *')
    expect(html).not.toContain('保存修改')
    expect(html).not.toContain('type="number"')
  })

  it('shows the explicit consumed entry only after the quantity reaches zero', () => {
    const html = renderBatchDetail({
      defaultMode: 'inventory-operation',
      batch: { ...batch, quantity: 0, status: 'active' },
    })

    expect(html).toContain('标记为已消耗')
    expect(html).not.toContain('确认标记为已消耗')
  })
})
