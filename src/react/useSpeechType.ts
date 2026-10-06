// speechType/src/react/useSpeechType.ts — React hook for per-word speech emphasis: wraps the element's
// words, follows element and option changes, and applies the emphasis for activeWordIndex.

import { useEffect, useRef, type RefObject } from 'react'
import { prepareSpeechType, applySpeechType, removeSpeechType } from '../core/adjust'
import type { SpeechTypeOptions } from '../core/types'

/**
 * Prepare word spans on mount (and again when the element or transitionMs changes) and apply emphasis for
 * activeWordIndex. Restores the element on unmount; speech is only cancelled if this element is speaking.
 *
 * @param ref             - Ref to the element containing text to highlight
 * @param activeWordIndex - Index of the currently active word span (-1 = none)
 * @param options         - SpeechTypeOptions (merged with defaults)
 */
export function useSpeechType(
	ref: RefObject<HTMLElement | null>,
	activeWordIndex: number,
	options?: SpeechTypeOptions,
): void {
	const prepared = useRef<{ el: HTMLElement; transitionMs: unknown } | null>(null)
	const optionsRef = useRef(options)
	optionsRef.current = options
	// Visual options only (callbacks aren't serialisable and don't change the emphasis).
	const visualKey = JSON.stringify([options?.activeTracking, options?.activeWeight, options?.activeOpsz, options?.inactiveOpacity])

	// Every render: (re)prepare when the element or the transition changed, then apply the emphasis.
	useEffect(() => {
		const el = ref.current
		const current = prepared.current
		if (!current || current.el !== el || current.transitionMs !== options?.transitionMs) {
			if (current && current.el !== el) removeSpeechType(current.el)
			prepared.current = null
			if (!el) return
			prepareSpeechType(el, optionsRef.current)
			prepared.current = { el, transitionMs: options?.transitionMs }
			applySpeechType(el, activeWordIndex, optionsRef.current)
		}
	})

	// Apply emphasis whenever activeWordIndex or a visual option changes.
	useEffect(() => {
		const el = ref.current
		if (el) applySpeechType(el, activeWordIndex, optionsRef.current)
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [activeWordIndex, visualKey])

	// Restore on unmount.
	useEffect(() => () => {
		if (prepared.current) removeSpeechType(prepared.current.el)
		prepared.current = null
	}, [])
}
