export default function DiscardChangesConfirmation({ busy, onCancel, onDiscard }) {
  return (
    <div className="space-y-3 rounded-2xl border border-amber-100 bg-amber-50 p-4" role="group" aria-label="放弃未保存修改确认" data-no-swipe>
      <p className="font-semibold text-ink">放弃未保存修改？</p>
      <p className="text-sm text-slate-600">返回后，本次未保存的内容将被清除。</p>
      <div className="grid grid-cols-2 gap-2">
        <button className="rounded-xl border border-slate-200 bg-white px-4 py-3 font-semibold text-slate-700 disabled:opacity-50" autoFocus disabled={busy} type="button" onClick={onCancel}>继续编辑</button>
        <button className="rounded-xl bg-danger px-4 py-3 font-semibold text-white disabled:opacity-50" disabled={busy} type="button" onClick={onDiscard}>放弃修改并返回</button>
      </div>
    </div>
  )
}
