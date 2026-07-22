const tabs = [
  { value: 'inventory', label: '库存' },
  { value: 'account', label: '我的' },
]

export default function BottomTabNav({ activeTab, onChange }) {
  return (
    <nav
      aria-label="主导航"
      className="fixed inset-x-0 bottom-0 z-20 border-t border-white/80 bg-cream/95 px-4 pt-2 backdrop-blur"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div
        className="mx-auto grid max-w-xl grid-cols-2 gap-2"
        role="tablist"
      >
        {tabs.map((tab) => {
          const isActive = activeTab === tab.value

          return (
            <button
              key={tab.value}
              aria-label={tab.label}
              aria-selected={isActive}
              className={`rounded-xl px-4 py-2.5 text-sm font-bold transition active:scale-[0.98] ${
                isActive ? 'bg-white text-leaf shadow-card' : 'text-slate-500'
              }`}
              role="tab"
              type="button"
              onClick={() => onChange(tab.value)}
            >
              {tab.label}
            </button>
          )
        })}
      </div>
    </nav>
  )
}
