import { getExpiryStatus } from '../lib/expiry'

const statusStyles = {
  expired: 'bg-red-100 text-danger',
  within7: 'bg-orange-100 text-orange-800',
  within30: 'bg-amber-100 text-amber-800',
  normal: 'bg-mint text-leaf',
}

export default function BatchCard({ batch, onSelect }) {
  const expiryStatus = getExpiryStatus(batch.expiry_date)
  const product = batch.product

  return (
    <article className="rounded-2xl border border-white/70 bg-white shadow-card">
      <button
        className="block w-full p-4 text-left"
        type="button"
        onClick={() => onSelect(batch.id)}
      >
        <div className="flex items-start gap-3">
          {product?.image_url && (
            <img
              alt=""
              className="h-16 w-16 shrink-0 rounded-2xl border border-slate-100 object-cover"
              src={product.image_url}
            />
          )}
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                  {product?.category || '未分类'}
                </p>
                <h2 className="mt-1 line-clamp-2 text-base font-bold leading-snug text-ink">
                  {product?.name}
                </h2>
              </div>
              <span
                className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ${statusStyles[expiryStatus.key]}`}
              >
                {expiryStatus.label}
              </span>
            </div>

            {product?.brand && (
              <p className="mt-1 text-xs text-slate-500">{product.brand}</p>
            )}

            <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
              <div className="rounded-xl bg-cream px-3 py-2">
                <p className="text-xs text-slate-500">当前库存</p>
                <p className="mt-0.5 font-bold text-ink">
                  {batch.quantity}
                  <span className="ml-1 font-medium text-slate-500">
                    {batch.unit}
                  </span>
                </p>
              </div>
              <div className="rounded-xl bg-cream px-3 py-2">
                <p className="text-xs text-slate-500">保质期至</p>
                <p className="mt-0.5 font-semibold text-ink">
                  {batch.expiry_date}
                </p>
              </div>
            </div>
          </div>
        </div>
      </button>
    </article>
  )
}
