import { useEffect, useRef } from 'react'

const navigationItems = [
  { value: 'inventory', label: '库存' },
  { value: 'archive', label: '已归档' },
]

export default function SidebarDrawer({
  activeSection,
  onClose,
  onNavigate,
  open,
}) {
  const closeButtonRef = useRef(null)
  const previousFocusRef = useRef(null)

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
        aria-labelledby="sidebar-title"
        className="relative z-10 flex min-h-[100dvh] w-[min(82vw,20rem)] max-w-[calc(100vw-2rem)] flex-col overflow-x-hidden bg-cream px-5 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-[calc(1rem+env(safe-area-inset-top))] shadow-card"
      >
        <div className="flex items-start justify-between gap-4">
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

        <nav aria-label="库存导航" className="mt-8 space-y-2">
          {navigationItems.map((item) => {
            const isActive = activeSection === item.value
            return (
              <button
                key={item.value}
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
            )
          })}
        </nav>
      </aside>
    </div>
  )
}
