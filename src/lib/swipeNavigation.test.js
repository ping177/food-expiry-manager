import { describe, expect, it, vi } from 'vitest'
import { createSwipeNavigation, isGestureTargetExcluded } from './swipeNavigation'

const event = (x, y = 0, time = 0, pointerId = 1) => ({
  clientX: x, clientY: y, timeStamp: time, pointerId, pointerType: 'touch',
  target: { closest: () => null },
})
function setup(overrides = {}) {
  const onSwipe = vi.fn()
  const options = { enabled: true, scope: 'home', direction: 'right', onSwipe, ...overrides }
  return { onSwipe, options, handlers: createSwipeNavigation(() => options) }
}
function swipe(handlers, endX = 160, endY = 0, duration = 300) {
  handlers.onPointerDown(event(100))
  handlers.onPointerMove(event(endX, endY, duration / 2))
  handlers.onPointerUp(event(endX, endY, duration))
}

describe('touch swipe navigation', () => {
  it.each([[159, 0, 300], [170, 31, 300], [160, 31, 300], [160, 0, 801]])(
    'rejects insufficient distance, vertical drift, diagonal or timeout (%s, %s, %s)', (x, y, time) => {
      const { handlers, onSwipe } = setup()
      swipe(handlers, x, y, time)
      expect(onSwipe).not.toHaveBeenCalled()
    },
  )
  it.each([['right', 160], ['left', 40]])('recognizes %s once', (direction, x) => {
    const { handlers, onSwipe } = setup({ direction })
    swipe(handlers, x)
    handlers.onPointerUp(event(x, 0, 350))
    expect(onSwipe).toHaveBeenCalledOnce()
  })
  it('keeps a vertical start cancelled even after a horizontal finish', () => {
    const { handlers, onSwipe } = setup()
    handlers.onPointerDown(event(100))
    handlers.onPointerMove(event(103, 12, 50))
    handlers.onPointerUp(event(180, 0, 300))
    expect(onSwipe).not.toHaveBeenCalled()
  })
  it('remembers maximum vertical drift even if the finger comes back', () => {
    const { handlers, onSwipe } = setup()
    handlers.onPointerDown(event(100))
    handlers.onPointerMove(event(180, 31, 100))
    handlers.onPointerUp(event(190, 0, 300))
    expect(onSwipe).not.toHaveBeenCalled()
  })
  it('cancels the complete gesture when another finger joins', () => {
    const { handlers, onSwipe } = setup()
    handlers.onPointerDown(event(100))
    handlers.onPointerDown(event(110, 0, 50, 2))
    handlers.onPointerUp(event(110, 0, 100, 2))
    handlers.onPointerUp(event(180, 0, 300))
    expect(onSwipe).not.toHaveBeenCalled()
    swipe(handlers)
    expect(onSwipe).toHaveBeenCalledOnce()
  })
  it('never completes on pointercancel', () => {
    const { handlers, onSwipe } = setup()
    handlers.onPointerDown(event(100))
    handlers.onPointerCancel(event(180, 0, 100))
    handlers.onPointerUp(event(180, 0, 300))
    expect(onSwipe).not.toHaveBeenCalled()
  })
  it('ignores mouse drag and the wrong swipe direction', () => {
    const { handlers, onSwipe } = setup()
    handlers.onPointerDown({ ...event(100), pointerType: 'mouse' })
    handlers.onPointerUp({ ...event(180, 0, 300), pointerType: 'mouse' })
    swipe(handlers, 40)
    expect(onSwipe).not.toHaveBeenCalled()
  })
  it('excludes interactive descendants at the start', () => {
    const { handlers, onSwipe } = setup()
    handlers.onPointerDown({ ...event(100), target: { closest: () => ({}) } })
    handlers.onPointerUp(event(180, 0, 300))
    expect(onSwipe).not.toHaveBeenCalled()
  })
  it('excludes the left edge for opening only', () => {
    const { handlers, onSwipe } = setup({ minStartX: 24 })
    handlers.onPointerDown(event(23))
    handlers.onPointerUp(event(100, 0, 300))
    expect(onSwipe).not.toHaveBeenCalled()
    handlers.onPointerDown(event(24))
    handlers.onPointerUp(event(84, 0, 300))
    expect(onSwipe).toHaveBeenCalledOnce()
  })
  it.each(['enabled', 'scope'])('invalidates an in-flight gesture on %s change', (field) => {
    const { handlers, onSwipe, options } = setup()
    handlers.onPointerDown(event(100))
    options[field] = field === 'enabled' ? false : 'detail'
    handlers.onPointerUp(event(180, 0, 300))
    expect(onSwipe).not.toHaveBeenCalled()
  })
  it('reset clears a stale gesture', () => {
    const { handlers, onSwipe } = setup()
    handlers.onPointerDown(event(100))
    handlers.reset()
    handlers.onPointerUp(event(180, 0, 300))
    expect(onSwipe).not.toHaveBeenCalled()
  })
  it('ignores a non-primary finger even when the first finger began outside the container', () => {
    const { handlers, onSwipe } = setup()
    handlers.onPointerDown({ ...event(100), isPrimary: false })
    handlers.onPointerUp(event(180, 0, 300))
    expect(onSwipe).not.toHaveBeenCalled()
  })
  it('declares form controls, roles, contenteditable and media exclusions', () => {
    const closest = vi.fn(() => ({}))
    expect(isGestureTargetExcluded({ closest })).toBe(true)
    for (const selector of ['input', 'label', 'button', 'a', '[role="slider"]', '[contenteditable]', 'video', '[data-no-swipe]']) {
      expect(closest.mock.calls[0][0]).toContain(selector)
    }
  })
})
