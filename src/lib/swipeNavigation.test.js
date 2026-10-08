import { describe, expect, it, vi } from 'vitest'
import { createSwipeClickGuard, createSwipeNavigation, isGestureTargetExcluded } from './swipeNavigation'

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
  it('does not impose a left-edge start exclusion', () => {
    const { handlers, onSwipe } = setup()
    handlers.onPointerDown(event(0))
    handlers.onPointerUp(event(60, 0, 300))
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
  it('declares hard exclusions that an allowed card cannot override', () => {
    const closest = vi.fn(() => ({}))
    expect(isGestureTargetExcluded({ closest })).toBe(true)
    for (const selector of ['input', '[role="slider"]', '[contenteditable]', 'video', '[data-no-swipe]']) {
      expect(closest.mock.calls[0][0]).toContain(selector)
    }
  })
  it.each(['button', 'img', 'a'])('allows explicitly approved %s content only', (tag) => {
    const allowed = { closest: () => ({}) }
    const target = { closest: vi.fn((selector) => selector.includes('input') ? null : allowed) }
    expect(isGestureTargetExcluded(target)).toBe(false)
    expect(target.closest.mock.calls[1][0].split(',')).toContain(tag)
    allowed.closest = () => null
    expect(isGestureTargetExcluded(target)).toBe(true)
  })
  it('allows an image descendant of an approved card but never its editor controls', () => {
    const approvedCard = {}
    const image = { closest: () => approvedCard }
    expect(isGestureTargetExcluded({ closest: (selector) => selector.includes('input') ? null : image })).toBe(false)
    expect(isGestureTargetExcluded({ closest: () => approvedCard })).toBe(true)
  })
  it('allows non-editor label text but still excludes its input and protected picker', () => {
    const labelText = { closest: (selector) => selector.split(',').includes('label') ? {} : null }
    expect(isGestureTargetExcluded(labelText)).toBe(false)
    for (const selector of ['input', 'textarea', 'select', '[data-no-swipe]', '[contenteditable]:not([contenteditable="false"])']) {
      expect(isGestureTargetExcluded({ closest: (list) => list.split(',').includes(selector) ? {} : null })).toBe(true)
    }
  })
})

const click = (overrides = {}) => ({
  detail: 1, timeStamp: 350, clientX: 160, clientY: 0,
  nativeEvent: { pointerType: 'touch', pointerId: 1, isTrusted: true },
  preventDefault: vi.fn(), stopPropagation: vi.fn(), ...overrides,
})

describe('local swipe click guard', () => {
  function recognizedSwipe() {
    const clickGuard = createSwipeClickGuard()
    const { handlers, onSwipe } = setup({ clickGuard })
    swipe(handlers)
    return { clickGuard, handlers, onSwipe }
  }
  it('blocks the matching click once even after the gesture owner reset', () => {
    const { clickGuard, handlers, onSwipe } = recognizedSwipe()
    handlers.reset()
    const first = click()
    clickGuard.onClickCapture(first)
    expect(first.preventDefault).toHaveBeenCalledOnce()
    expect(first.stopPropagation).toHaveBeenCalledOnce()
    clickGuard.onClickCapture(first)
    expect(first.stopPropagation).toHaveBeenCalledOnce()
    expect(onSwipe).toHaveBeenCalledOnce()
  })
  it('marks the swipe before its navigation callback', () => {
    const clickGuard = createSwipeClickGuard()
    const trailing = click()
    const { handlers } = setup({ clickGuard, onSwipe: () => clickGuard.onClickCapture(trailing) })
    swipe(handlers)
    expect(trailing.stopPropagation).toHaveBeenCalledOnce()
  })
  it('never blocks the next tap when no trailing click was generated', () => {
    const { clickGuard } = recognizedSwipe()
    clickGuard.onPointerDownCapture(event(160))
    const next = click()
    clickGuard.onClickCapture(next)
    expect(next.stopPropagation).not.toHaveBeenCalled()
  })
  it.each([
    { detail: 0 },
    { nativeEvent: { isTrusted: false } },
    { nativeEvent: { pointerType: 'mouse', pointerId: 1 } },
    { nativeEvent: { pointerType: 'touch', pointerId: 2 } },
    { timeStamp: 1301 },
  ])('preserves keyboard, programmatic, other pointer or expired clicks %j', (overrides) => {
    const { clickGuard } = recognizedSwipe()
    const other = click(overrides)
    clickGuard.onClickCapture(other)
    expect(other.stopPropagation).not.toHaveBeenCalled()
  })
  it('matches older MouseEvent clicks by end coordinates, not unrelated targets', () => {
    const { clickGuard } = recognizedSwipe()
    const unrelated = click({ nativeEvent: { isTrusted: true }, clientX: 230 })
    clickGuard.onClickCapture(unrelated)
    expect(unrelated.stopPropagation).not.toHaveBeenCalled()
    const trailing = click({ nativeEvent: { isTrusted: true }, clientX: 161 })
    clickGuard.onClickCapture(trailing)
    expect(trailing.stopPropagation).toHaveBeenCalledOnce()
  })
  it('does not arm on a short move, vertical start or pointercancel', () => {
    for (const reason of ['short', 'vertical', 'cancel']) {
      const clickGuard = createSwipeClickGuard()
      const { handlers } = setup({ clickGuard })
      handlers.onPointerDown(event(100))
      if (reason === 'vertical') handlers.onPointerMove(event(101, 20, 50))
      if (reason === 'cancel') handlers.onPointerCancel(event(160, 0, 100))
      handlers.onPointerUp(event(reason === 'short' ? 120 : 160, 0, 300))
      const trailing = click()
      clickGuard.onClickCapture(trailing)
      expect(trailing.stopPropagation).not.toHaveBeenCalled()
    }
  })
})

describe('Sidebar-only direction tolerance and horizontal click intent', () => {
  const sidebarOptions = { direction: 'left', horizontalRatio: 1.5, maxVerticalDistance: 50, clickIntentDistance: 30 }
  it.each([[40, 40], [20, 50]])('accepts a natural tilted Sidebar left swipe ending (%s,%s)', (x, y) => {
    const { handlers, onSwipe } = setup(sidebarOptions)
    swipe(handlers, x, y)
    expect(onSwipe).toHaveBeenCalledOnce()
  })
  it.each([[40, 41], [10, 51]])('still rejects too diagonal or excessive drift (%s,%s)', (x, y) => {
    const { handlers, onSwipe } = setup(sidebarOptions)
    swipe(handlers, x, y)
    expect(onSwipe).not.toHaveBeenCalled()
  })
  it('keeps a vertical start cancelled despite a later tilted horizontal finish', () => {
    const clickGuard = createSwipeClickGuard()
    const { handlers, onSwipe } = setup({ ...sidebarOptions, clickGuard })
    handlers.onPointerDown(event(100))
    handlers.onPointerMove(event(97, 20, 50))
    handlers.onPointerUp(event(20, 30, 300))
    const trailing = click({ clientX: 20, clientY: 30 })
    clickGuard.onClickCapture(trailing)
    expect(onSwipe).not.toHaveBeenCalled()
    expect(trailing.stopPropagation).not.toHaveBeenCalled()
  })
  it.each(['short', 'wrong-direction', 'returned', 'timeout', 'late-motion'])('suppresses observed horizontal intent without navigating: %s', (reason) => {
    const clickGuard = createSwipeClickGuard()
    const { handlers, onSwipe } = setup({ ...sidebarOptions, clickGuard })
    handlers.onPointerDown(event(100))
    handlers.onPointerMove(event(reason === 'wrong-direction' ? 140 : 60, 15, reason === 'late-motion' ? 900 : 200))
    const x = reason === 'returned' ? 95 : reason === 'wrong-direction' ? 140 : reason === 'timeout' ? 20 : 60
    const y = reason === 'returned' ? 0 : 15
    const endTime = reason === 'late-motion' ? 950 : reason === 'timeout' ? 900 : 300
    handlers.onPointerUp(event(x, y, endTime))
    const trailing = click({ clientX: x, clientY: y, timeStamp: endTime + 20 })
    clickGuard.onClickCapture(trailing)
    expect(onSwipe).not.toHaveBeenCalled()
    expect(trailing.stopPropagation).toHaveBeenCalledOnce()
    clickGuard.onPointerDownCapture(event(x, 15, endTime + 40))
    const next = click({ timeStamp: endTime + 60 })
    clickGuard.onClickCapture(next)
    expect(next.stopPropagation).not.toHaveBeenCalled()
  })
  it.each(['tap', 'cancel', 'multi', 'reset'])('does not arm after %s', (reason) => {
    const clickGuard = createSwipeClickGuard()
    const { handlers, onSwipe } = setup({ ...sidebarOptions, clickGuard })
    handlers.onPointerDown(event(100))
    handlers.onPointerMove(event(reason === 'tap' ? 95 : 60, 0, 100))
    if (reason === 'cancel') handlers.onPointerCancel(event(60, 0, 150))
    if (reason === 'multi') handlers.onPointerDown(event(60, 0, 150, 2))
    if (reason === 'reset') handlers.reset()
    handlers.onPointerUp(event(reason === 'tap' ? 95 : 60, 0, 300))
    const trailing = click()
    clickGuard.onClickCapture(trailing)
    expect(onSwipe).not.toHaveBeenCalled()
    expect(trailing.stopPropagation).not.toHaveBeenCalled()
  })
  it('leaves other pages at 2:1/30px and does not suppress an incomplete horizontal swipe', () => {
    const clickGuard = createSwipeClickGuard()
    const { handlers, onSwipe } = setup({ clickGuard })
    swipe(handlers, 180, 40)
    swipe(handlers, 140, 15)
    const trailing = click()
    clickGuard.onClickCapture(trailing)
    expect(onSwipe).not.toHaveBeenCalled()
    expect(trailing.stopPropagation).not.toHaveBeenCalled()
  })
})
