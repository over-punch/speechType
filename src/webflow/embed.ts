// speechType/src/webflow/embed.ts — zero-config browser bundle for Webflow Custom Code Embed.
// Auto-initialises speechType on any element marked with [data-speechtype]: wraps its words
// (prepareSpeechType) and wires a click-to-speak toggle. Exposes a small window.SpeechType API.
// Speech synthesis needs a user gesture, so the effect starts on click (or via SpeechType.speak),
// never on load.
import { prepareSpeechType, startSpeechType, removeSpeechType } from '../core/adjust'
import type { SpeechTypeOptions } from '../core/types'

/** Attribute that opts an element in to speechType. */
const OPT_IN_ATTR = 'data-speechtype'

/** Value of data-st-click that disables the built-in click-to-speak toggle. */
const CLICK_DISABLED = 'false'

/** Per-element teardown record so destroy() can stop speech, unwrap markup and unwire clicks. */
interface Instance {
	/** Stop function returned by startSpeechType while speaking, else null. */
	stop: (() => void) | null
	/** Click handler wired for click-to-speak, so destroy() can remove it. null if disabled. */
	clickHandler: ((e: MouseEvent) => void) | null
}

/** Tracks live instances keyed by their element — WeakMap so removed nodes are GC'd. */
const INSTANCES = new WeakMap<HTMLElement, Instance>()

/**
 * Read speechType options from an element's data-* attributes.
 * Unset attributes fall through to the library defaults.
 *
 * Supported attributes:
 *   data-st-tracking          — activeTracking, letter-spacing on the active word in em
 *   data-st-weight            — activeWeight, wght axis value on the active word
 *   data-st-opsz              — activeOpsz, opsz axis value on the active word
 *   data-st-inactive-opacity  — inactiveOpacity, opacity of non-active words
 *   data-st-transition        — transitionMs, CSS transition duration in ms
 *   data-st-rate              — speech rate (0.1–10)
 *   data-st-pitch             — speech pitch (0–2)
 *   data-st-volume            — speech volume (0–1)
 *
 * @param el - The opted-in element
 */
function readOptions(el: HTMLElement): SpeechTypeOptions {
	const d = el.dataset
	const opts: SpeechTypeOptions = {}

	if (d.stTracking !== undefined) { const n = parseFloat(d.stTracking); if (!isNaN(n)) opts.activeTracking = n }
	if (d.stWeight !== undefined) { const n = parseFloat(d.stWeight); if (!isNaN(n)) opts.activeWeight = n }
	if (d.stOpsz !== undefined) { const n = parseFloat(d.stOpsz); if (!isNaN(n)) opts.activeOpsz = n }
	if (d.stInactiveOpacity !== undefined) { const n = parseFloat(d.stInactiveOpacity); if (!isNaN(n)) opts.inactiveOpacity = n }
	if (d.stTransition !== undefined) { const n = parseFloat(d.stTransition); if (!isNaN(n)) opts.transitionMs = n }
	if (d.stRate !== undefined) { const n = parseFloat(d.stRate); if (!isNaN(n)) opts.rate = n }
	if (d.stPitch !== undefined) { const n = parseFloat(d.stPitch); if (!isNaN(n)) opts.pitch = n }
	if (d.stVolume !== undefined) { const n = parseFloat(d.stVolume); if (!isNaN(n)) opts.volume = n }

	// Warn once (rather than fail silently) when the browser lacks speech synthesis.
	opts.onUnsupported = () => {
		console.warn('SpeechType: this browser does not support the Web Speech API — nothing will be spoken.')
	}

	return opts
}

/**
 * Begin speaking an element, syncing per-word emphasis to speech boundaries.
 * If it is already speaking, this stops it first (a click toggles play/stop).
 * No-op if the element was never initialised.
 *
 * @param el - Element previously initialised by init()
 */
function speak(el: HTMLElement): void {
	const inst = INSTANCES.get(el)
	if (!inst) return
	// Toggle: a second call while speaking stops instead of restarting.
	if (inst.stop) {
		stop(el)
		return
	}
	inst.stop = startSpeechType(el, readOptions(el))
}

/**
 * Stop speech on an element and reset its words to neutral, leaving the markup wrapped
 * so it can be spoken again. No-op if the element is not speaking.
 *
 * @param el - Element previously initialised by init()
 */
function stop(el: HTMLElement): void {
	const inst = INSTANCES.get(el)
	if (!inst || !inst.stop) return
	inst.stop()
	inst.stop = null
}

/**
 * Restart speech on an element from the first word.
 *
 * @param el - Element previously initialised by init()
 */
function restart(el: HTMLElement): void {
	stop(el)
	speak(el)
}

/**
 * Initialise a single element: wrap its words and (unless data-st-click="false") wire a
 * click-to-speak toggle. Idempotent — re-initialising tears down the previous instance first.
 *
 * @param el - Element to prepare
 */
function initElement(el: HTMLElement): void {
	// Tear down any previous run so re-init doesn't double-wrap or double-wire.
	destroy(el)

	// Wrap words now so emphasis styling and the aria-live region are ready before the
	// first gesture. Speech itself waits for a user action (browser gesture requirement).
	prepareSpeechType(el, readOptions(el))

	let clickHandler: ((e: MouseEvent) => void) | null = null
	if (el.dataset.stClick !== CLICK_DISABLED) {
		clickHandler = () => speak(el)
		el.addEventListener('click', clickHandler)
		el.style.cursor = 'pointer'
	}

	INSTANCES.set(el, { stop: null, clickHandler })
}

/**
 * Stop and fully restore a single element if it has a live instance.
 *
 * @param el - Element previously initialised
 */
function destroy(el: HTMLElement): void {
	const inst = INSTANCES.get(el)
	if (!inst) return
	if (inst.stop) inst.stop()
	if (inst.clickHandler) {
		el.removeEventListener('click', inst.clickHandler)
		el.style.cursor = ''
	}
	removeSpeechType(el)
	INSTANCES.delete(el)
}

/**
 * Scan a root for opted-in elements and initialise each one.
 *
 * @param root - Element or document to search (default: document)
 */
function init(root: ParentNode = document): void {
	root.querySelectorAll<HTMLElement>(`[${OPT_IN_ATTR}]`).forEach(initElement)
}

/**
 * Auto-initialise once the DOM is parsed and web fonts have loaded.
 * Fonts must settle first: the active-word wght/opsz emphasis depends on final glyph
 * metrics, which shift when a web font swaps in.
 */
function autoInit(): void {
	const run = () => {
		if (document.fonts?.ready) {
			document.fonts.ready.then(() => init()).catch(() => init())
		} else {
			init()
		}
	}
	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', run, { once: true })
	} else {
		run()
	}
}

autoInit()

// Public browser API — assigned to window.SpeechType via the IIFE global name.
export { init, destroy, speak, stop, restart }
