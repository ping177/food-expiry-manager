import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import AddInventoryForm from './AddInventoryForm'

const product = {
  name: '猫罐头 A',
  brand: '示例品牌',
  size_value: 170,
  size_unit: 'g',
}

function renderAddInventoryForm(props = {}) {
  return renderToStaticMarkup(
    <AddInventoryForm
      busy={false}
      onCancel={vi.fn()}
      onSave={vi.fn()}
      product={product}
      unit="罐"
      {...props}
    />,
  )
}

describe('AddInventoryForm', () => {
  it('carries the current product into a focused inventory form', () => {
    const html = renderAddInventoryForm()

    expect(html).toContain('新增库存')
    expect(html).toContain('猫罐头 A')
    expect(html).toContain('示例品牌')
    expect(html).toContain('170g')
    expect(html).toContain('数量 *')
    expect(html).toContain('保质期至 *')
    expect(html).toContain('返回库存操作')
    expect(html).not.toContain('扫码添加')
    expect(html).not.toContain('商品名 *')
    expect(html).not.toContain('条形码')
  })

  it('does not expose product editing fields or a second unit field', () => {
    const html = renderAddInventoryForm()

    expect(html).not.toContain('商品与批次')
    expect(html).not.toContain('分类')
    expect(html).not.toContain('>品牌</p>')
    expect(html).not.toContain('图片')
    expect(html.match(/type="number"/g)).toHaveLength(1)
  })

  it('does not render an empty capacity value', () => {
    const html = renderAddInventoryForm({
      product: { ...product, size_value: null, size_unit: null },
    })

    expect(html).not.toContain('170g')
  })
})
