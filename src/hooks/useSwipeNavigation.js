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
  return {
    ...handlers,
    style: options.enabled ? { touchAction: 'pan-y pinch-zoom' } : undefined,
  }
}
