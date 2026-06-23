import { useState } from 'react'
import { getExpiryStatus } from '../lib/expiry'

const statusStyles = {
  expired: 'bg-red-100 text-danger',
  within7: 'bg-orange-100 text-orange-800',
  within30: 'bg-amber-100 text-amber-800',
  normal: 'bg-mint text-leaf',
}

export default function BatchCard({
  batch,
  busy,
  onDecrement,
  onUpdateQuantity,
  onConsume,
}) {
  const [isEditing, setIsEditing] = useState(false)
  const [quantity, setQuantity] = useState(String(batch.quantity))
  const expiryStatus = getExpiryStatus(batch.expiry_date)
  const product = batch.product

  async function handleQuantitySubmit(event) {
    event.preventDefault()
    const saved = await onUpdateQuantity(batch.id, quantity)
    if (saved) {
      setIsEditing(false)
    }
  }

  return (
    <article className="rounded-3xl border border-white/70 bg-white p-5 shadow-card">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 gap-3">
          {product?.image_url && (
            <img
              alt=""
              className="h-16 w-16 shrink-0 rounded-2xl border border-slate-100 object-cover"
              src={product.image_url}
            />
          )}
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
              {product?.category || '未分类'}
            </p>
            <h2 className="mt-1 text-xl font-bold text-ink">{product?.name}</h2>
            {product?.brand && (
              <p className="mt-1 text-sm text-slate-500">{product.brand}</p>
            )}
          </div>
        </div>
        <span
          className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold ${statusStyles[expiryStatus.key]}`}
        >
          {expiryStatus.label}
        </span>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-cream p-3">
          <p className="text-xs text-slate-500">当前库存</p>
          <p className="mt-1 text-2xl font-bold">
            {batch.quantity}
            <span className="ml-1 text-sm font-medium text-slate-500">
              {batch.unit}
            </span>
          </p>
        </div>
        <div className="rounded-2xl bg-cream p-3">
          <p className="text-xs text-slate-500">保质期至</p>
          <p className="mt-2 font-semibold">{batch.expiry_date}</p>
        </div>
      </div>

      {batch.storage_location && (
        <p className="mt-3 text-sm text-slate-500">
          存放位置：{batch.storage_location}
        </p>
      )}

      {isEditing ? (
        <form className="mt-4 flex gap-2" onSubmit={handleQuantitySubmit}>
          <input
            aria-label="新的库存数量"
            className="min-w-0 flex-1 rounded-xl border border-slate-200 px-3 py-2"
            min="0"
            step="1"
            type="number"
            value={quantity}
            onChange={(event) => setQuantity(event.target.value)}
          />
          <button
            className="rounded-xl bg-leaf px-4 py-2 font-semibold text-white disabled:opacity-50"
            disabled={busy}
            type="submit"
          >
            保存
          </button>
          <button
            className="rounded-xl px-3 py-2 text-slate-500"
            type="button"
            onClick={() => {
              setQuantity(String(batch.quantity))
              setIsEditing(false)
            }}
          >
            取消
          </button>
        </form>
      ) : (
        <div className="mt-4 grid grid-cols-2 gap-2">
          <button
            className="rounded-xl bg-leaf px-4 py-3 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"
            disabled={busy || Number(batch.quantity) === 0}
            type="button"
            onClick={() => onDecrement(batch)}
          >
            减少 1
          </button>
          <button
            className="rounded-xl border border-slate-200 px-4 py-3 font-semibold text-slate-700 disabled:opacity-50"
            disabled={busy}
            type="button"
            onClick={() => setIsEditing(true)}
          >
            编辑数量
          </button>
        </div>
      )}

      {Number(batch.quantity) === 0 && (
        <button
          className="mt-2 w-full rounded-xl bg-slate-800 px-4 py-3 font-semibold text-white disabled:opacity-50"
          disabled={busy}
          type="button"
          onClick={() => onConsume(batch.id)}
        >
          标记为已消耗
        </button>
      )}
    </article>
  )
}
