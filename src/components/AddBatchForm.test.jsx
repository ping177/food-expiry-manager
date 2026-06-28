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
  it('uses the shared built-in category list and allows an empty category', () => {
    const html = renderAddBatchForm()

    expect(html).toContain('分类')
    expect(html).toMatch(/<option value=""[^>]*>未选择分类<\/option>/)
    for (const category of PRODUCT_CATEGORIES) {
      expect(html).toContain(`<option value="${category}">${category}</option>`)
    }
  })
})
