import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import ArchiveBatchCard from './ArchiveBatchCard'

const batch = {
  id: 'consumed-batch-1',
  quantity: 0,
  unit: '罐',
  expiry_date: '2026-04-01',
  status: 'consumed',
  product: {
    name: '已消耗鸡肉猫罐头',
    brand: 'MjAMjAM',
    size_value: 170,
    size_unit: 'g',
    category: '猫罐头',
    image_url: 'https://example.com/cat.jpg',
  },
}

describe('ArchiveBatchCard', () => {
  it('uses history semantics instead of active inventory labels', () => {
    const html = renderToStaticMarkup(
      <ArchiveBatchCard batch={batch} onSelect={vi.fn()} />,
    )

    expect(html).toContain('已消耗')
    expect(html).toContain('已消耗鸡肉猫罐头')
    expect(html).toContain('MjAMjAM')
    expect(html).toContain('170g')
    expect(html).toContain('原到期日')
    expect(html).not.toContain('剩余 0 件')
    expect(html).not.toContain('已过期')
  })
})
