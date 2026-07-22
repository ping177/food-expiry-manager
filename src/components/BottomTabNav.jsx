const tabs = [
  { value: 'inventory', label: '库存', Icon: InventoryIcon },
  { value: 'account', label: '我的', Icon: AccountIcon },
]

function InventoryIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.8"
      viewBox="0 0 24 24"
    >
      <path d="m3 7.5 9-4 9 4-9 4-9-4Z" />
      <path d="M3 7.5v9l9 4 9-4v-9" />
      <path d="M12 11.5v9" />
    </svg>
  )
}

function PlusIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-6 w-6"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeWidth="2"
      viewBox="0 0 24 24"
    >
      <path d="M12 5v14M5 12h14" />
    </svg>
  )
}

function AccountIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.8"
      viewBox="0 0 24 24"
    >
      <circle cx="12" cy="8" r="3.5" />
      <path d="M4.5 20c.9-3.5 3.6-5.5 7.5-5.5s6.6 2 7.5 5.5" />
    </svg>
  )
}

function TabButton({ activeTab, className, onChange, tab }) {
  const isActive = activeTab === tab.value
  const Icon = tab.Icon

  return (
    <button
      aria-label={tab.label}
      aria-selected={isActive}
      className={`${className} flex min-h-14 flex-col items-center justify-center gap-0.5 border-b-2 px-4 py-1 text-xs font-semibold transition active:scale-[0.98] ${
        isActive
          ? 'border-leaf text-leaf'
          : 'border-transparent text-slate-500'
      }`}
      role="tab"
      type="button"
      onClick={() => onChange(tab.value)}
    >
      <Icon />
      {tab.label}
    </button>
  )
}

export default function BottomTabNav({ activeTab, onAdd, onChange }) {
  return (
    <nav
      aria-label="主导航"
      className="fixed inset-x-0 bottom-0 z-20 border-t border-slate-200/80 bg-cream px-4 pt-1"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="relative mx-auto max-w-xl">
        <div className="grid grid-cols-2" role="tablist">
          <TabButton
            activeTab={activeTab}
            className="w-full"
            onChange={onChange}
            tab={tabs[0]}
          />
          <TabButton
            activeTab={activeTab}
            className="w-full"
            onChange={onChange}
            tab={tabs[1]}
          />
        </div>
        <button
          aria-label="添加商品"
          className="absolute left-1/2 top-1/2 flex h-11 w-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center text-slate-500 transition active:scale-[0.9] active:text-leaf"
          type="button"
          onClick={onAdd}
        >
          <PlusIcon />
        </button>
      </div>
    </nav>
  )
}
