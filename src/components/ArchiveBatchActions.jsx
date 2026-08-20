import { useState } from 'react'
import { prepareInventoryOperationUpdate } from '../lib/inventory'

export default function ArchiveBatchActions({
  batch,
  busy,
  onDeleteBatch = async () => true,
}) {
  const [pendingDelete, setPendingDelete] = useState(false)
  const [operationSubmitting, setOperationSubmitting] = useState(false)
  const [operationError, setOperationError] = useState('')

  async function confirmDelete() {
    setOperationError('')

    try {
      prepareInventoryOperationUpdate(batch, 'delete-batch')
    } catch (deleteError) {
      setOperationError(deleteError.message)
      return
    }

    setOperationSubmitting(true)
    try {
      const saved = await onDeleteBatch(batch.id)
      if (!saved) {
        setOperationError('删除历史批次失败，请稍后重试。')
        return
      }
      setPendingDelete(false)
    } catch {
      setOperationError('删除历史批次失败，请稍后重试。')
    } finally {
      setOperationSubmitting(false)
    }
  }

  return (
    <section className="rounded-3xl border border-slate-100 bg-white p-5 shadow-card">
      <h3 className="font-bold text-ink">历史操作</h3>
      {!pendingDelete && (
        <button
          className="mt-3 w-full rounded-xl border border-danger px-4 py-3 font-semibold text-danger disabled:opacity-50"
          disabled={operationSubmitting || busy}
          type="button"
          onClick={() => {
            setOperationError('')
            setPendingDelete(true)
          }}
        >
          删除历史批次
        </button>
      )}
      {pendingDelete && (
        <div className="mt-3 space-y-3 rounded-2xl bg-red-50 p-4">
          <h4 className="font-semibold text-danger">确认删除历史批次？</h4>
          <p className="text-sm leading-6 text-slate-600">
            仅删除这条已归档批次；商品信息、商品图片和其他库存批次都会保留。
          </p>
          <p className="text-sm font-semibold text-danger">此操作不可恢复。</p>
          <div className="grid grid-cols-2 gap-2">
            <button
              className="rounded-xl border border-slate-200 bg-white px-4 py-3 font-semibold text-slate-700"
              disabled={operationSubmitting}
              type="button"
              onClick={() => {
                setOperationError('')
                setPendingDelete(false)
              }}
            >
              取消
            </button>
            <button
              className="rounded-xl bg-danger px-4 py-3 font-semibold text-white disabled:opacity-50"
              disabled={operationSubmitting}
              type="button"
              onClick={confirmDelete}
            >
              {operationSubmitting ? '删除中…' : '确认删除历史批次'}
            </button>
          </div>
        </div>
      )}
      {operationError && (
        <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-danger" role="alert">
          {operationError}
        </p>
      )}
    </section>
  )
}
