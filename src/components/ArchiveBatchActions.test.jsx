import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const source = fs.readFileSync(
  path.join(process.cwd(), 'src/components/ArchiveBatchActions.jsx'),
  'utf8',
)

describe('ArchiveBatchActions', () => {
  it('keeps historical deletion behind confirmation and preserves related data', () => {
    expect(source).toContain("setPendingDelete(true)")
    expect(source).toContain('确认删除历史批次')
    expect(source).toContain('商品信息、商品图片和其他库存批次都会保留')
    expect(source).toContain('await onDeleteBatch(batch.id)')
    expect(source).toContain('取消')
    expect(source).not.toContain("from('products')")
    expect(source).not.toContain('storage')
  })
})
