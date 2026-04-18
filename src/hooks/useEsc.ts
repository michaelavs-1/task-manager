import { useEffect } from 'react'

/**
 * Closes a modal/popover when Escape is pressed.
 * Only registers the listener while `enabled` is true.
 */
export function useEsc(enabled: boolean, onEsc: () => void) {
  useEffect(() => {
    if (!enabled) return
    const h = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        onEsc()
      }
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [enabled, onEsc])
}
