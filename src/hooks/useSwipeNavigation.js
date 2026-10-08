import { useEffect, useRef } from 'react'
import { createSwipeNavigation } from '../lib/swipeNavigation'

export default function useSwipeNavigation(options) {
  const optionsRef = useRef(options)
  optionsRef.current = options
  const controllerRef = useRef(null)
  if (!controllerRef.current) {
    controllerRef.current = createSwipeNavigation(() => optionsRef.current)
  }
  const { reset, ...handlers } = controllerRef.current
  useEffect(() => {
    reset()
    return reset
  }, [options.enabled, options.scope, reset])
  const surfaceRef = options.surfaceRef
  useEffect(() => {
    if (!surfaceRef) return undefined
    const controller = controllerRef.current
    surfaceRef.current = controller
    return () => {
      if (surfaceRef.current === controller) surfaceRef.current = null
      reset()
    }
  }, [surfaceRef, reset])
  // The task component retains its controller/guards; only the event surface moves.
  if (surfaceRef) return {}
  return {
    ...handlers,
    style: options.enabled ? { touchAction: 'pan-y pinch-zoom' } : undefined,
  }
}
