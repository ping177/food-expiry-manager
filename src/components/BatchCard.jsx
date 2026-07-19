import { getExpiryWindow } from '../lib/expiryWindows'
import { getProductImageUrl } from '../lib/productImage'

const expiryWindowStyles = {
  expired: 'bg-red-100 text-danger ring-red-200',
  within30: 'bg-amber-100 text-amber-800 ring-amber-200',
  within180: 'bg-mint text-leaf ring-leaf/10',
  within365: 'bg-mint text-leaf ring-leaf/10',
  within730: 'bg-mint text-leaf ring-leaf/10',
  over730: 'bg-mint text-leaf ring-leaf/10',
}

export default function BatchCard({ batch, onSelect }) {
  const expiryWindow = getExpiryWindow(batch.expiry_date)
  const product = batch.product
  const category = product?.category || '未分类'
  const quantityLabel = `剩余 ${batch.quantity} 件`
  const imageUrl = getProductImageUrl(product)

  return (
    <article className="rounded-2xl border border-white/70 bg-white shadow-card">
      <button
        className="block w-full p-3 text-left transition active:scale-[0.99]"
        type="button"
        onClick={() => onSelect(batch.id)}
      >
        <div className="flex min-h-24 items-stretch gap-3">
          <div className="h-24 w-24 shrink-0 overflow-hidden rounded-2xl border border-slate-100 bg-cream">
            {imageUrl ? (
              <img
                alt=""
                className="h-full w-full object-cover"
                src={imageUrl}
              />
            ) : (
              <div
                aria-label="库存图片占位"
                className="flex h-full w-full items-center justify-center px-2 text-center text-xs font-semibold text-slate-400"
                role="img"
              >
                无图
              </div>
            )}
          </div>

          <div className="flex min-w-0 flex-1 flex-col">
            <div className="min-w-0">
              <h2 className="line-clamp-2 text-lg font-bold leading-snug text-ink">
                {product?.name}
              </h2>
              <div className="mt-2 flex flex-wrap gap-1.5">
                <span className="rounded-full bg-cream px-2.5 py-1 text-xs font-semibold text-leaf">
                  {category}
                </span>
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                  {quantityLabel}
                </span>
              </div>
            </div>

            <div className="mt-auto flex items-center justify-between gap-2 pt-3">
              <p className="min-w-0 text-sm font-semibold text-slate-500">
                保质期至
                <span className="ml-2 text-ink">{batch.expiry_date}</span>
              </p>
              <span
                className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ring-1 ${expiryWindowStyles[expiryWindow.value]}`}
              >
                {expiryWindow.label}
              </span>
            </div>
          </div>
        </div>
      </button>
    </article>
  )
}
