import { useState } from 'react'

export function hasFormChanges(form, initialForm) {
  return Object.keys(initialForm).some(
    (key) => String(form[key] ?? '') !== String(initialForm[key] ?? ''),
  )
}

export default function useProtectedExit({ dirty, busy, onExit }) {
  const [confirming, setConfirming] = useState(false)
  function requestExit() {
    if (busy || confirming) return
    if (dirty) setConfirming(true)
    else onExit()
  }
  function discard() {
    if (busy || !confirming) return
    setConfirming(false)
    onExit()
  }
  return { confirming, requestExit, discard, cancel: () => setConfirming(false) }
}
