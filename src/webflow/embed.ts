// speechType/src/webflow/embed.ts — zero-config browser bundle for Webflow Custom Code Embed.
// Auto-initialises speechType on any element marked with [data-speechtype]: wraps its words
// (prepareSpeechType) and wires a click- and keyboard-operable speak toggle. Exposes a small window.SpeechType API.
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
	/** Whether this element's speech is running (speech that ended or errored counts as stopped). */
	speaking: boolean
	/** Click handler wired for click-to-speak, so destroy() can remove it. null if disabled. */
	clickHandler: ((e: MouseEvent) => void) | null
	/** Enter/Space handler for keyboard users. null if disabled. */
	keyHandler: ((e: KeyboardEvent) => void) | null
	/** tabindex, role and aria-pressed before init, restored by destroy() */
	saved: { tabIndex: string | null; role: string | null; pressed: string | null }
}

/** Tracks live instances keyed by their element — WeakMap so removed nodes are GC'd. */
const INSTANCES = new WeakMap<HTMLElement, Instance>()

/**
 * Read speechType options from an element's data-* attributes. Unset or invalid attributes fall through
 * to the library defaults.
 *
 * @param el - The opted-in element
 */
function readOptions(el: HTMLElement): SpeechTypeOptions {
	const d = el.dataset
	const opts: SpeechTypeOptions = {}
	const num = (raw: string | undefined) => { if (raw === undefined) return undefined; const n = parseFloat(raw); return Number.isFinite(n) ? n : undefined }

	opts.activeTracking = num(d.stTracking)
	opts.activeWeight = num(d.stWeight)
	opts.activeOpsz = num(d.stOpsz)
	opts.inactiveOpacity = num(d.stInactiveOpacity)
	opts.transitionMs = num(d.stTransition)
	opts.rate = num(d.stRate)
	opts.pitch = num(d.stPitch)
	opts.volume = num(d.stVolume)
	if (d.stVoice) opts.voice = d.stVoice
	for (const k of Object.keys(opts) as (keyof SpeechTypeOptions)[]) if (opts[k] === undefined) delete opts[k]

	// Warn once (rather than fail silently) when the browser lacks speech synthesis.
	opts.onUnsupported = () => {
		console.warn('SpeechType: this browser does not support the Web Speech API — nothing will be spoken.')
	}

	return opts
}

/** Mark an instance stopped (and its toggle state). */
function markStopped(el: HTMLElement, inst: Instance): void {
	inst.speaking = false
	inst.stop = null
	if (inst.keyHandler) el.setAttribute('aria-pressed', 'false')
}

/**
 * Speak an element, or stop it if it is speaking (a toggle).
 *
 * @param el - An initialised element
 */
function speak(el: HTMLElement): void {
	const inst = INSTANCES.get(el)
	if (!inst) return
	if (inst.speaking) {
		stop(el)
		return
	}
	const opts = readOptions(el)
	let stopRun: (() => void) | null = null
	// The run reports its own end (finished, stopped, taken over by another element, or failed).
	opts.onEnd = () => { if (inst.stop === stopRun || stopRun === null) markStopped(el, inst) }
	inst.speaking = true
	if (inst.keyHandler) el.setAttribute('aria-pressed', 'true')
	stopRun = startSpeechType(el, opts)
	if (inst.speaking) inst.stop = stopRun
	// No speech engine: nothing started, so nothing will end.
	if (typeof speechSynthesis === 'undefined') markStopped(el, inst)
}

/**
 * Stop an element's speech (only its own).
 *
 * @param el - An initialised element
 */
function stop(el: HTMLElement): void {
	const inst = INSTANCES.get(el)
	if (!inst || !inst.stop) return
	inst.stop()
	markStopped(el, inst)
}

/**
 * Restart an element's speech from the beginning.
 *
 * @param el - An initialised element
 */
function restart(el: HTMLElement): void {
	stop(el)
	speak(el)
}

/**
 * Initialise a single element: wrap its words and wire the click and keyboard toggle.
 * Idempotent — re-initialising tears down the previous instance first.
 *
 * @param el - Element to initialise
 */
function initElement(el: HTMLElement): void {
	destroy(el)

	// Wrap words now so emphasis styling is ready before the first gesture. Speech itself waits for a
	// user action (browser gesture requirement).
	prepareSpeechType(el, readOptions(el))

	let clickHandler: ((e: MouseEvent) => void) | null = null
	let keyHandler: ((e: KeyboardEvent) => void) | null = null
	const saved = { tabIndex: el.getAttribute('tabindex'), role: el.getAttribute('role'), pressed: el.getAttribute('aria-pressed') }
	if (el.dataset.stClick !== CLICK_DISABLED) {
		// Clicks on links, buttons and fields inside the text do their own thing.
		clickHandler = (e) => {
			if ((e.target as Element | null)?.closest?.('a, button, input, select, textarea, label, summary')) return
			speak(el)
		}
		el.addEventListener('click', clickHandler)
		el.style.cursor = 'pointer'
		// Keyboard users can start and stop it too: Enter or Space on the focused element. Text with links
		// or fields inside keeps its own role, so those stay operable.
		keyHandler = (e) => {
			if (e.target !== el || (e.key !== 'Enter' && e.key !== ' ')) return
			e.preventDefault()
			speak(el)
		}
		el.addEventListener('keydown', keyHandler)
		if (saved.tabIndex === null) el.setAttribute('tabindex', '0')
		if (!saved.role && !el.querySelector('a, button, input, select, textarea')) el.setAttribute('role', 'button')
		el.setAttribute('aria-pressed', 'false')
	}

	INSTANCES.set(el, { stop: null, speaking: false, clickHandler, keyHandler, saved })
}

/**
 * Stop and restore a single element if it has a live instance.
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
	if (inst.keyHandler) {
		el.removeEventListener('keydown', inst.keyHandler)
		const put = (name: string, value: string | null) => { if (value === null) el.removeAttribute(name); else el.setAttribute(name, value) }
		put('tabindex', inst.saved.tabIndex)
		put('role', inst.saved.role)
		put('aria-pressed', inst.saved.pressed)
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

/** Auto-initialise once the DOM is parsed and web fonts have loaded; set up elements added later. */
function autoInit(): void {
	const run = () => {
		if (document.fonts?.ready) {
			document.fonts.ready.then(() => init()).catch(() => init())
		} else {
			init()
		}
		if (typeof MutationObserver !== 'undefined' && document.body) {
			new MutationObserver((records) => {
				for (const rec of records) {
					rec.addedNodes.forEach((n) => {
						if (!(n instanceof HTMLElement) || !n.isConnected) return
						const found = n.matches(`[${OPT_IN_ATTR}]`) ? [n] : []
						n.querySelectorAll<HTMLElement>(`[${OPT_IN_ATTR}]`).forEach((el) => found.push(el))
						for (const el of found) if (!INSTANCES.has(el)) initElement(el)
					})
				}
			}).observe(document.body, { childList: true, subtree: true })
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
