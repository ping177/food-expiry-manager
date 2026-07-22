import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const panelSource = fs.readFileSync(
  path.join(process.cwd(), 'src/components/InventoryOperationPanel.jsx'),
  'utf8',
)

describe('InventoryOperationPanel delete batch contract', () => {
  it('keeps deletion behind an explicit confirmation state', () => {
    expect(panelSource).toContain("setPendingOperation('delete-batch')")
    expect(panelSource).toContain("pendingOperation === 'delete-batch'")
    expect(panelSource).toContain('确认删除当前库存批次')
  })

  it('only invokes the delete callback from the confirmation flow', () => {
    const cancelHandler = panelSource.slice(
      panelSource.indexOf('function cancelPendingOperation'),
      panelSource.indexOf('async function confirmConsumption'),
    )

    expect(panelSource).toContain('onDeleteBatch = async () => true')
    expect(panelSource).toContain('await onDeleteBatch(deletion.id)')
    expect(cancelHandler).not.toContain('onDeleteBatch')
  })
})
