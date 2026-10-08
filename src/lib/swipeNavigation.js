const excludedTargets = [
  'input', 'textarea', 'select', 'summary', 'video', 'audio',
  'canvas', 'iframe', 'object', 'embed',
  '[contenteditable]:not([contenteditable="false"])', '[data-no-swipe]',
  ...['textbox', 'combobox', 'listbox', 'option', 'checkbox', 'radio', 'switch',
    'slider', 'spinbutton', 'menuitemcheckbox', 'menuitemradio', 'searchbox',
    'scrollbar'].map((role) => `[role="${role}"]`),
].join(',')
const optInTargets = ['button', 'a', 'img',
  ...['button', 'link', 'tab', 'menuitem', 'treeitem'].map((role) => `[role="${role}"]`),
].join(',')

export function isGestureTargetExcluded(target) {
  if (target?.closest?.(excludedTargets)) return true
  const interactive = target?.closest?.(optInTargets)
  return Boolean(interactive && !interactive.closest?.('[data-swipe-start]'))
}

// Kept by the stable App main, so navigation/unmount cannot lose the trailing click.
export function createSwipeClickGuard() {
  let pending = null
  return {
    markSwipe(event) {
      pending = { pointerId: event.pointerId, x: event.clientX, y: event.clientY, time: event.timeStamp }
    },
    onPointerDownCapture() {
      pending = null
    },
    onClickCapture(event) {
      const native = event.nativeEvent ?? event
      if (!pending || event.detail === 0 || native.isTrusted === false) return
      const elapsed = event.timeStamp - pending.time
      // A synthesized click normally follows immediately; never keep a stale token.
      if (elapsed < 0 || elapsed > 1000) {
        pending = null
        return
      }
      if (native.pointerType && native.pointerType !== 'touch') return
      const matches = native.pointerId > 0
        ? native.pointerId === pending.pointerId
        : Math.abs(event.clientX - pending.x) <= 2 && Math.abs(event.clientY - pending.y) <= 2
      if (!matches) return
      pending = null
      event.preventDefault()
      event.stopPropagation()
    },
  }
}

// No React or DOM dependency: the hook supplies current ownership and callbacks.
export function createSwipeNavigation(getOptions) {
  const pointers = new Set()
  let start = null

  function reset() {
    start = null
    pointers.clear()
  }

  function update(event) {
    if (!start || event.pointerId !== start.pointerId) return
    const options = getOptions()
    const dx = event.clientX - start.x
    const dy = Math.abs(event.clientY - start.y)
    start.maxY = Math.max(start.maxY, dy)
    if (!options.enabled || options.scope !== start.scope ||
      start.maxY > (options.maxVerticalDistance ?? 30) || (dy >= 12 && dy > Math.abs(dx))) {
      start = null
      return
    }
    const elapsed = event.timeStamp - start.time
    if (options.clickIntentDistance && Math.abs(dx) >= options.clickIntentDistance &&
      Math.abs(dx) >= (options.horizontalRatio ?? 2) * start.maxY && elapsed >= 0) {
      start.clickIntent = true
    }
  }

  return {
    reset,
    onPointerDown(event) {
      if (event.pointerType !== 'touch') return
      pointers.add(event.pointerId)
      if (pointers.size !== 1) {
        start = null
        return
      }
      const options = getOptions()
      if (!options.enabled || event.isPrimary === false || isGestureTargetExcluded(event.target)) return
      start = {
        pointerId: event.pointerId, x: event.clientX, y: event.clientY,
        time: event.timeStamp, maxY: 0, scope: options.scope,
      }
    },
    onPointerMove: update,
    onPointerUp(event) {
      if (event.pointerType !== 'touch') return
      update(event)
      const gesture = start
      pointers.delete(event.pointerId)
      if (!gesture || event.pointerId !== gesture.pointerId) return
      start = null
      const options = getOptions()
      const dx = event.clientX - gesture.x
      const duration = event.timeStamp - gesture.time
      const distance = options.direction === 'left' ? -dx : dx
      const navigates = distance >= 60 && Math.abs(dx) >= (options.horizontalRatio ?? 2) * gesture.maxY &&
        duration >= 0 && duration <= 800
      // Sidebar-only intent survives a short/reversed/timed-out finish, not invalidation.
      if (navigates || gesture.clickIntent) options.clickGuard?.markSwipe(event)
      if (navigates) options.onSwipe()
    },
    onPointerCancel(event) {
      start = null
      pointers.delete(event.pointerId)
    },
  }
}
