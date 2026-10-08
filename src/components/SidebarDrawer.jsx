import { useEffect, useRef } from 'react'
import { PRODUCT_CATEGORIES } from '../lib/categories'
import useSwipeNavigation from '../hooks/useSwipeNavigation'

const navigationItems = [
  { value: 'inventory', label: '库存' },
  { value: 'archive', label: '已归档' },
]

export default function SidebarDrawer({
  activeSection,
  categoryFilter,
  onCategoryNavigate,
  onClose,
  onNavigate,
  open,
  swipeClickGuard,
}) {
  const closeButtonRef = useRef(null)
  const previousFocusRef = useRef(null)
  const closeGesture = useSwipeNavigation({
    enabled: open,
    scope: 'sidebar',
    direction: 'left',
    onSwipe: onClose,
    clickGuard: swipeClickGuard,
    horizontalRatio: 1.5,
    maxVerticalDistance: 50,
    clickIntentDistance: 30,
  })

  useEffect(() => {
    if (!open || typeof document === 'undefined') return undefined

    previousFocusRef.current = document.activeElement
    closeButtonRef.current?.focus()

    function handleKeyDown(event) {
      if (event.key === 'Escape') onClose()
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      previousFocusRef.current?.focus?.()
      previousFocusRef.current = null
    }
  }, [onClose, open])

  if (!open) return null

  return (
    <div
      aria-label="侧边栏导航"
      className="fixed inset-0 z-30 overflow-x-hidden"
      role="dialog"
      aria-modal="true"
    >
      <button
        aria-label="关闭菜单"
        className="absolute inset-0 h-full w-full bg-slate-900/20"
        type="button"
        onClick={onClose}
      />
      <aside
        {...closeGesture}
        aria-labelledby="sidebar-title"
        className="relative z-10 flex h-[100dvh] w-[min(82vw,20rem)] max-w-[calc(100vw-2rem)] flex-col overflow-x-hidden overflow-y-auto overscroll-y-contain bg-cream px-5 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-[calc(1rem+env(safe-area-inset-top))] shadow-card"
      >
        <div className="flex shrink-0 items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold text-leaf">导航</p>
            <h2 id="sidebar-title" className="mt-1 text-xl font-bold text-ink">
              库存空间
            </h2>
          </div>
          <button
            ref={closeButtonRef}
            aria-label="关闭菜单"
            className="rounded-xl px-2 py-1 text-2xl leading-none text-slate-500 transition hover:bg-white hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-leaf"
            type="button"
            onClick={onClose}
          >
            ×
          </button>
        </div>

        <nav aria-label="库存导航" className="mt-8 shrink-0 space-y-2">
          {navigationItems.map((item) => {
            const isActive = activeSection === item.value
            return (
              <div key={item.value}>
                <button
                  data-swipe-start
                  aria-current={isActive ? 'page' : undefined}
                  className={`flex w-full items-center rounded-2xl px-4 py-3 text-left text-sm font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-leaf ${
                    isActive
                      ? 'bg-white text-ink shadow-card'
                      : 'text-slate-600 hover:bg-white/70 hover:text-ink'
                  }`}
                  type="button"
                  onClick={() => onNavigate(item.value)}
                >
                  {item.label}
                </button>
                {item.value === 'inventory' && (
                  <div aria-label="库存分类" className="ml-4 mt-2 space-y-1" role="group">
                    {['all', ...PRODUCT_CATEGORIES].map((category) => {
                      const isSelected =
                        activeSection === 'inventory' && categoryFilter === category
                      return (
                        <button
                          data-swipe-start
                          key={category}
                          aria-pressed={isSelected}
                          className={`block min-h-11 w-full rounded-xl px-4 py-2.5 text-left text-sm transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-leaf ${
                            isSelected
                              ? 'bg-mint font-semibold text-leaf'
                              : 'text-slate-600 hover:bg-white/70 hover:text-ink'
                          }`}
                          type="button"
                          onClick={() => onCategoryNavigate(category)}
                        >
                          {category === 'all' ? '全部' : category}
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </nav>
      </aside>
    </div>
  )
}
