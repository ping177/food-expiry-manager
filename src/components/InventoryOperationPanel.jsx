import { useState } from 'react'
import { prepareInventoryOperationUpdate } from '../lib/inventory'

export default function InventoryOperationPanel({
  batch,
  busy,
  onAddInventory = () => {},
  onConsume = async () => true,
  onMarkConsumed = async () => true,
  onDeleteBatch = async () => true,
}) {
  const [pendingOperation, setPendingOperation] = useState(null)
  const [consumptionAmount, setConsumptionAmount] = useState('1')
  const [operationSubmitting, setOperationSubmitting] = useState(false)
  const [operationError, setOperationError] = useState('')

  function cancelPendingOperation() {
    setOperationError('')
    setPendingOperation(null)
    setConsumptionAmount('1')
  }

  async function confirmConsumption() {
    setOperationError('')

    let quantityUpdate
    try {
      quantityUpdate = prepareInventoryOperationUpdate(
        batch,
        'consume',
        consumptionAmount,
      )
    } catch (consumeError) {
      setOperationError(consumeError.message)
      return
    }

    setOperationSubmitting(true)
    try {
      const saved = await onConsume(batch.id, quantityUpdate.quantity)
      if (!saved) {
        setOperationError('消耗库存失败，请稍后重试。')
        return
      }
      setPendingOperation(null)
      setConsumptionAmount('1')
    } catch {
      setOperationError('消耗库存失败，请稍后重试。')
    } finally {
      setOperationSubmitting(false)
    }
  }

  async function confirmMarkConsumed() {
    setOperationError('')

    try {
      prepareInventoryOperationUpdate(batch, 'mark-consumed')
    } catch (consumeError) {
      setOperationError(consumeError.message)
      return
    }

    setOperationSubmitting(true)
    try {
      const saved = await onMarkConsumed(batch.id)
      if (!saved) {
        setOperationError('标记已消耗失败，请稍后重试。')
        return
      }
      setPendingOperation(null)
    } catch {
      setOperationError('标记已消耗失败，请稍后重试。')
    } finally {
      setOperationSubmitting(false)
    }
  }

  async function confirmDeleteBatch() {
    setOperationError('')

    let deletion
    try {
      deletion = prepareInventoryOperationUpdate(batch, 'delete-batch')
    } catch (deleteError) {
      setOperationError(deleteError.message)
      return
    }

    setOperationSubmitting(true)
    try {
      const saved = await onDeleteBatch(deletion.id)
      if (!saved) {
        setOperationError('删除库存批次失败，请稍后重试。')
        return
      }
      setPendingOperation(null)
    } catch {
      setOperationError('删除库存批次失败，请稍后重试。')
    } finally {
      setOperationSubmitting(false)
    }
  }

  return (
    <section className="rounded-3xl border border-slate-100 bg-white p-5 shadow-card">
      <h3 className="font-bold text-ink">库存操作</h3>
      <div className="mt-3 grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-cream p-3">
          <p className="text-xs text-slate-500">当前库存</p>
          <p className="mt-1 text-xl font-bold text-ink">
            {batch.quantity}
            <span className="ml-1 text-sm font-medium text-slate-500">
              {batch.unit}
            </span>
          </p>
        </div>
        <div className="rounded-2xl bg-cream p-3">
          <p className="text-xs text-slate-500">当前批次保质期</p>
          <p className="mt-1 font-bold text-ink">{batch.expiry_date}</p>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3">
        <button
          className="rounded-2xl border border-slate-200 bg-white px-4 py-3 font-semibold text-slate-700 disabled:opacity-50"
          disabled={operationSubmitting || busy || pendingOperation !== null}
          type="button"
          onClick={() => onAddInventory(batch)}
        >
          新增库存
        </button>
        <button
          className="rounded-2xl bg-leaf px-4 py-3 font-semibold text-white disabled:opacity-50"
          disabled={
            operationSubmitting ||
            busy ||
            pendingOperation !== null ||
            batch.quantity <= 0
          }
          type="button"
          onClick={() => {
            setOperationError('')
            setConsumptionAmount('1')
            setPendingOperation('consume')
          }}
        >
          消耗库存
        </button>
      </div>

      {pendingOperation === 'consume' && (
        <div className="mt-5 space-y-3 rounded-2xl border border-amber-100 bg-amber-50 p-4">
          <h4 className="font-semibold text-ink">确认消耗库存</h4>
          <p className="text-sm text-slate-600">
            当前数量：{batch.quantity} {batch.unit}
          </p>
          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold text-slate-700">
              消耗数量：
            </span>
            <input
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-ink"
              max={batch.quantity}
              min="1"
              step="1"
              type="number"
              value={consumptionAmount}
              onChange={(event) => setConsumptionAmount(event.target.value)}
            />
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              className="rounded-xl border border-slate-200 bg-white px-4 py-3 font-semibold text-slate-700"
              disabled={operationSubmitting}
              type="button"
              onClick={cancelPendingOperation}
            >
              取消
            </button>
            <button
              className="rounded-xl bg-leaf px-4 py-3 font-semibold text-white disabled:opacity-50"
              disabled={operationSubmitting}
              type="button"
              onClick={confirmConsumption}
            >
              {operationSubmitting ? '保存中…' : '确认消耗'}
            </button>
          </div>
        </div>
      )}

      {batch.quantity <= 0 && batch.status === 'active' && (
        <div className="mt-5 border-t border-slate-100 pt-4">
          <h4 className="font-semibold text-ink">库存已归零</h4>
          <p className="mt-1 text-sm leading-6 text-slate-500">
            数量为 0，批次仍保持 active；确认后才会标记为已消耗。
          </p>
          {pendingOperation !== 'mark-consumed' && (
            <button
              className="mt-3 w-full rounded-xl border border-danger px-4 py-3 font-semibold text-danger disabled:opacity-50"
              disabled={operationSubmitting || busy || pendingOperation !== null}
              type="button"
              onClick={() => {
                setOperationError('')
                setPendingOperation('mark-consumed')
              }}
            >
              标记为已消耗
            </button>
          )}
          {pendingOperation === 'mark-consumed' && (
            <div className="mt-3 space-y-3 rounded-2xl bg-red-50 p-4">
              <p className="text-sm font-semibold text-danger">
                确认将这个批次标记为已消耗？
              </p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  className="rounded-xl border border-slate-200 bg-white px-4 py-3 font-semibold text-slate-700"
                  disabled={operationSubmitting}
                  type="button"
                  onClick={cancelPendingOperation}
                >
                  取消
                </button>
                <button
                  className="rounded-xl bg-danger px-4 py-3 font-semibold text-white disabled:opacity-50"
                  disabled={operationSubmitting}
                  type="button"
                  onClick={confirmMarkConsumed}
                >
                  {operationSubmitting ? '保存中…' : '确认标记为已消耗'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {batch.quantity <= 0 && (
        <p className="mt-4 text-xs text-slate-500">当前库存为 0，不能继续消耗。</p>
      )}

      <div className="mt-5 border-t border-slate-100 pt-4">
        <h4 className="font-semibold text-ink">危险操作</h4>
        {pendingOperation !== 'delete-batch' && (
          <button
            className="mt-3 w-full rounded-xl border border-danger px-4 py-3 font-semibold text-danger disabled:opacity-50"
            disabled={operationSubmitting || busy || pendingOperation !== null}
            type="button"
            onClick={() => {
              setOperationError('')
              setPendingOperation('delete-batch')
            }}
          >
            删除当前库存批次
          </button>
        )}
        {pendingOperation === 'delete-batch' && (
          <div className="mt-3 space-y-3 rounded-2xl bg-red-50 p-4">
            <h5 className="font-semibold text-danger">确认删除当前库存批次？</h5>
            <p className="text-sm leading-6 text-slate-600">
              将删除当前库存批次；商品信息、商品图片和其他库存批次都会保留。
            </p>
            <p className="text-sm font-semibold text-danger">此操作不可恢复。</p>
            <div className="grid grid-cols-2 gap-2">
              <button
                className="rounded-xl border border-slate-200 bg-white px-4 py-3 font-semibold text-slate-700"
                disabled={operationSubmitting}
                type="button"
                onClick={cancelPendingOperation}
              >
                取消
              </button>
              <button
                className="rounded-xl bg-danger px-4 py-3 font-semibold text-white disabled:opacity-50"
                disabled={operationSubmitting}
                type="button"
                onClick={confirmDeleteBatch}
              >
                {operationSubmitting ? '删除中…' : '确认删除当前库存批次'}
              </button>
            </div>
          </div>
        )}
      </div>

      {operationError && (
        <p
          role="alert"
          className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-danger"
        >
          {operationError}
        </p>
      )}
    </section>
  )
}
