const excludedTargets = [
  'input', 'textarea', 'select', 'button', 'a', 'label', 'summary', 'video', 'audio',
  'img', 'canvas', 'iframe', 'object', 'embed',
  '[contenteditable]:not([contenteditable="false"])', '[data-no-swipe]',
  ...['button', 'link', 'textbox', 'combobox', 'listbox', 'option', 'checkbox',
    'radio', 'switch', 'slider', 'spinbutton', 'tab', 'menuitem', 'menuitemcheckbox',
    'menuitemradio', 'treeitem', 'searchbox', 'scrollbar'].map((role) => `[role="${role}"]`),
].join(',')

export function isGestureTargetExcluded(target) {
  return Boolean(target?.closest?.(excludedTargets))
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
      start.maxY > 30 || (dy >= 12 && dy > Math.abs(dx))) start = null
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
      if (!options.enabled || event.isPrimary === false || isGestureTargetExcluded(event.target) ||
        event.clientX < (options.minStartX ?? 0)) return
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
      if (distance >= 60 && Math.abs(dx) >= 2 * gesture.maxY &&
        duration >= 0 && duration <= 800) options.onSwipe()
    },
    onPointerCancel(event) {
      start = null
      pointers.delete(event.pointerId)
    },
  }
}
