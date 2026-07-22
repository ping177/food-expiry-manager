import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { PRODUCT_CATEGORIES } from '../lib/categories'
import AddBatchForm from './AddBatchForm'

function renderAddBatchForm() {
  return renderToStaticMarkup(
    <AddBatchForm
      busy={false}
      onCancel={vi.fn()}
      onLookupBarcode={vi.fn()}
      onSave={vi.fn()}
    />,
  )
}

describe('AddBatchForm category field', () => {
  it('offers an optional capacity field in the product section', () => {
    const html = renderAddBatchForm()

    expect(html).toContain('容量/规格（可选）')
    expect(html).toContain('aria-label="容量数值"')
    expect(html).toContain('aria-label="容量单位"')
    expect(html).toContain('flex-1')
    expect(html).toContain('w-auto shrink-0')
    expect(html).toContain('grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]')
    expect(html).toMatch(/<option value="g" selected="">g<\/option>/)
    expect(html).not.toContain('选择单位')
  })

  it('uses the shared built-in category list and allows an empty category', () => {
    const html = renderAddBatchForm()

    expect(html).toContain('分类')
    expect(html).toMatch(/<option value=""[^>]*>未选择分类<\/option>/)
    for (const category of PRODUCT_CATEGORIES) {
      expect(html).toContain(`<option value="${category}">${category}</option>`)
    }
  })

  it('offers camera, album and local-image removal controls', () => {
    const html = renderAddBatchForm()
    expect(html).toContain('拍照')
    expect(html).toContain('从相册选择')
    expect(html).toContain('capture="environment"')
  })
})
