import { useState } from 'react'
import { prepareInventoryOperationUpdate } from '../lib/inventory'

export default function ArchiveBatchActions({
  batch,
  busy,
  productDeleteGuard = { status: 'loading' },
  productDeleteBusy = false,
  onDeleteBatch = async () => true,
  onDeleteProduct = async () => ({ outcome: 'error' }),
}) {
  const [pendingDelete, setPendingDelete] = useState(false)
  const [operationSubmitting, setOperationSubmitting] = useState(false)
  const [operationError, setOperationError] = useState('')
  const [pendingDeleteProduct, setPendingDeleteProduct] = useState(false)
  const [productOperationSubmitting, setProductOperationSubmitting] = useState(false)
  const [productOperationError, setProductOperationError] = useState('')
  const product = batch?.product
  const productGuard =
    productDeleteGuard?.productId === product?.id
      ? productDeleteGuard
      : { status: 'loading' }

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

  async function confirmDeleteProduct() {
    setProductOperationError('')
    setProductOperationSubmitting(true)

    try {
      const result = await onDeleteProduct(product)
      const succeeded =
        result === true ||
        result?.outcome === 'deleted' ||
        result?.outcome === 'cleanup_pending'

      if (!succeeded) {
        if (result?.outcome === 'blocked_active') {
          setProductOperationError(
            '该商品仍有当前库存，请先处理当前库存后再删除整个商品。',
          )
          setPendingDeleteProduct(false)
        } else if (result?.outcome === 'not_found') {
          setProductOperationError('商品不存在或无权删除。')
        } else {
          setProductOperationError('删除整个商品失败，请稍后重试。')
        }
        return
      }

      setPendingDeleteProduct(false)
    } catch {
      setProductOperationError('删除整个商品失败，请稍后重试。')
    } finally {
      setProductOperationSubmitting(false)
    }
  }

  function productGuardMessage() {
    if (productGuard.status === 'active') {
      return '该商品仍有当前库存，不能删除整个商品。请先处理当前库存。'
    }
    if (productGuard.status === 'error') {
      return '当前库存状态确认失败，暂不能删除整个商品。请稍后重试。'
    }
    if (productGuard.status === 'loading') {
      return '正在确认当前库存状态…'
    }
    return '未发现 active 库存。删除后，该商品及其历史批次将无法恢复。'
  }

  const productDeleteDisabled =
    busy ||
    operationSubmitting ||
    productDeleteBusy ||
    productOperationSubmitting ||
    productGuard.status !== 'clear'

  return (
    <section className="space-y-5 rounded-3xl border border-slate-100 bg-white p-5 shadow-card">
      <div>
        <h3 className="font-bold text-ink">历史操作</h3>
      {!pendingDelete && (
        <button
          className="mt-3 w-full rounded-xl border border-danger px-4 py-3 font-semibold text-danger disabled:opacity-50"
          disabled={
            operationSubmitting ||
            productDeleteBusy ||
            productOperationSubmitting ||
            busy
          }
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
              disabled={operationSubmitting || productDeleteBusy || productOperationSubmitting}
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
              disabled={operationSubmitting || productDeleteBusy || productOperationSubmitting}
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
      </div>

      <div className="border-t border-slate-100 pt-5">
        <h3 className="font-bold text-danger">危险操作</h3>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          删除整个商品会同时删除它的所有历史批次。商品仍有 active 库存时不可执行。
        </p>
        <p
          className={`mt-3 rounded-xl px-4 py-3 text-sm leading-6 ${productGuard.status === 'active' || productGuard.status === 'error' ? 'bg-red-50 text-danger' : 'bg-cream text-slate-600'}`}
          role={productGuard.status === 'error' ? 'alert' : undefined}
        >
          {productGuardMessage()}
        </p>
        {!pendingDeleteProduct && (
          <button
            className="mt-3 w-full rounded-xl bg-danger px-4 py-3 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
            disabled={productDeleteDisabled}
            type="button"
            onClick={() => {
              setProductOperationError('')
              setPendingDeleteProduct(true)
            }}
          >
            删除整个商品
          </button>
        )}
        {pendingDeleteProduct && (
          <div className="mt-3 space-y-3 rounded-2xl bg-red-50 p-4">
            <h4 className="font-semibold text-danger">确认删除整个商品？</h4>
            <p className="text-sm leading-6 text-slate-600">
              商品及其所有历史批次都会被永久删除；用户上传图片也会尝试清理，外部图片链接不会被删除。
            </p>
            <p className="text-sm font-semibold text-danger">此操作不可恢复。</p>
            <div className="grid grid-cols-2 gap-2">
              <button
                className="rounded-xl border border-slate-200 bg-white px-4 py-3 font-semibold text-slate-700"
                disabled={productOperationSubmitting}
                type="button"
                onClick={() => {
                  setProductOperationError('')
                  setPendingDeleteProduct(false)
                }}
              >
                取消
              </button>
              <button
                className="rounded-xl bg-danger px-4 py-3 font-semibold text-white disabled:opacity-50"
                disabled={productOperationSubmitting}
                type="button"
                onClick={confirmDeleteProduct}
              >
                {productOperationSubmitting ? '删除中…' : '确认删除整个商品'}
              </button>
            </div>
          </div>
        )}
        {productOperationError && (
          <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-danger" role="alert">
            {productOperationError}
          </p>
        )}
      </div>
    </section>
  )
}
