import { formatProductSize } from '../lib/productSize'
import { getProductImageUrl } from '../lib/productImage'
import { getArchiveStatusLabel } from '../lib/inventory'

export default function ArchiveBatchCard({ batch, onSelect }) {
  const product = batch.product
  const category = product?.category || '未分类'
  const size = formatProductSize(product)
  const imageUrl = getProductImageUrl(product)
  const statusLabel = getArchiveStatusLabel(batch.status)

  return (
    <article className="rounded-2xl border border-white/70 bg-white shadow-card">
      <button
        aria-label={`查看已归档批次：${product?.name || '商品'}`}
        className="block w-full p-3 text-left transition active:scale-[0.99] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-leaf"
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
                aria-label="已归档商品图片占位"
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
              {product?.brand && (
                <p className="mt-1 text-sm text-slate-500">{product.brand}</p>
              )}
              <div className="mt-2 flex flex-wrap gap-1.5">
                <span className="rounded-full bg-cream px-2.5 py-1 text-xs font-semibold text-leaf">
                  {category}
                </span>
                {size && (
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                    {size}
                  </span>
                )}
              </div>
            </div>

            <div className="mt-auto flex items-center justify-between gap-2 pt-3">
              <p className="min-w-0 text-sm font-semibold text-slate-500">
                原到期日
                <span className="ml-2 text-ink">{batch.expiry_date}</span>
              </p>
              <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600">
                {statusLabel}
              </span>
            </div>
          </div>
        </div>
      </button>
    </article>
  )
}
