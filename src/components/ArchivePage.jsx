import { PRODUCT_CATEGORIES } from '../lib/categories'
import { filterInventoryBatches } from '../lib/inventoryFilters'
import ArchiveBatchCard from './ArchiveBatchCard'

export default function ArchivePage({
  batches,
  categoryFilter,
  error,
  loading,
  onCategoryChange,
  onRetry,
  onSearchChange,
  onSelect,
  searchQuery,
}) {
  const archivedBatches = filterInventoryBatches(batches, {
    status: 'consumed',
    expiryWindow: 'all',
    category: categoryFilter,
    search: searchQuery,
  })
  const hasBatches = batches.length > 0
  const hasFilters = categoryFilter !== 'all' || searchQuery.trim() !== ''

  return (
    <section className="space-y-4">
      {hasBatches && (
        <div className="space-y-3 rounded-3xl border border-white/70 bg-white p-4 shadow-card">
          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold text-slate-700">
              搜索
            </span>
            <input
              aria-label="搜索已归档商品"
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-ink placeholder:text-slate-400"
              placeholder="商品名或品牌"
              type="search"
              value={searchQuery}
              onChange={(event) => onSearchChange(event.target.value)}
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold text-slate-700">
              分类
            </span>
            <select
              aria-label="筛选已归档分类"
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-ink"
              value={categoryFilter}
              onChange={(event) => onCategoryChange(event.target.value)}
            >
              <option value="all">全部分类</option>
              {PRODUCT_CATEGORIES.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </label>
        </div>
      )}

      {error && (
        <div
          aria-live="polite"
          className="rounded-3xl bg-red-50 px-5 py-4 text-sm leading-6 text-danger"
          role="alert"
        >
          <p>{error}</p>
          <button
            className="mt-3 rounded-xl border border-red-200 bg-white px-4 py-2.5 text-sm font-semibold text-danger"
            type="button"
            onClick={onRetry}
          >
            重试
          </button>
        </div>
      )}

      {loading && !hasBatches ? (
        <p className="py-12 text-center text-sm text-slate-500" role="status">
          正在读取已归档…
        </p>
      ) : !error && !hasBatches ? (
        <div className="rounded-3xl border border-dashed border-slate-300 bg-white/60 px-6 py-12 text-center">
          <p className="text-lg font-bold text-ink">还没有已归档批次</p>
          <p className="mt-2 text-sm text-slate-500">
            明确标记为已消耗的库存会出现在这里。
          </p>
        </div>
      ) : !error && archivedBatches.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-300 bg-white/60 px-6 py-10 text-center">
          <p className="text-lg font-bold text-ink">没有符合筛选的已归档批次</p>
          <p className="mt-2 text-sm text-slate-500">
            调整分类或搜索关键词后再试。
          </p>
          {hasFilters && (
            <button
              className="mt-4 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700"
              type="button"
              onClick={() => {
                onCategoryChange('all')
                onSearchChange('')
              }}
            >
              清除筛选
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {archivedBatches.map((batch) => (
            <ArchiveBatchCard key={batch.id} batch={batch} onSelect={onSelect} />
          ))}
        </div>
      )}
    </section>
  )
}
