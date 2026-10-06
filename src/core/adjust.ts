// speechType/src/core/adjust.ts — wraps an element's words in place (keeping its markup, listeners and
// accessibility) and emphasises each word as the Web Speech API speaks it, around the text's own style.

import { SPEECH_CLASSES } from './types'
import type { SpeechTypeOptions } from './types'

// ─── Constants ────────────────────────────────────────────────────────────────

/** Elements whose text is never wrapped or spoken: scripts, styles, form fields, SVG, replaced content. */
const SKIP_TAGS = new Set(['SCRIPT', 'STYLE', 'TEXTAREA', 'NOSCRIPT', 'TEMPLATE', 'SVG', 'MATH', 'SELECT', 'OPTION', 'CANVAS', 'IFRAME', 'OBJECT', 'VIDEO', 'AUDIO', 'INPUT', 'BUTTON'])

/** Elements that separate words (block boundaries and line breaks). */
const BREAK_TAGS = new Set(['BR', 'HR', 'P', 'DIV', 'LI', 'UL', 'OL', 'DL', 'DT', 'DD', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'BLOCKQUOTE', 'PRE', 'SECTION', 'ARTICLE', 'ASIDE', 'HEADER', 'FOOTER', 'NAV', 'FIGURE', 'FIGCAPTION', 'TABLE', 'TR', 'TD', 'TH', 'CAPTION', 'IMG', 'ADDRESS', 'MAIN', 'DETAILS', 'SUMMARY'])

/** Scripts written without spaces between words: split into words with Intl.Segmenter. */
const UNSPACED_SCRIPT = /[฀-໿က-႟ក-៿぀-ヿ㐀-䶿一-鿿豈-﫿]/

/** Delay between cancelling earlier speech and speaking again (Chrome cancels a speak() in the same tick). */
const RESPEAK_DELAY_MS = 80

/** Chrome stops long utterances after ~15 s unless speech is paused and resumed (ms between nudges). */
const CHROME_KEEPALIVE_MS = 10000

/** How often a run checks that speech hasn't ended silently (no end event) (ms). */
const WATCHDOG_MS = 1000

type Segmenter = { segment: (text: string) => Iterable<{ segment: string }> }
const wordSegmenter: Segmenter | null = typeof Intl !== 'undefined' && 'Segmenter' in Intl
	? new (Intl as unknown as { Segmenter: new (l: undefined, o: { granularity: 'word' }) => Segmenter }).Segmenter(undefined, { granularity: 'word' })
	: null

// ─── Warnings and validation ──────────────────────────────────────────────────

/** Warnings already printed. */
const warned = new Set<string>()

/** Prints a console warning the first time it is seen. */
function warnOnce(message: string): void {
	if (warned.has(message)) return
	warned.add(message)
	console.warn(message)
}

/** A finite number within [min, max], or the fallback (with a warning) when the value is not one. */
function numberIn(value: unknown, fallback: number, min: number, max: number, name: string): number {
	if (value === undefined) return fallback
	if (typeof value === 'number' && Number.isFinite(value)) return Math.min(max, Math.max(min, value))
	warnOnce(`[speechType] ${name} must be a finite number; got ${String(value)}, using ${fallback}`)
	return fallback
}

/** Whether the reader asked for reduced motion. */
function reducedMotion(): boolean {
	return typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches
}

// ─── Per-element state ────────────────────────────────────────────────────────

/** One original text node and the nodes that replaced it. */
interface Wrapped {
	original: Text
	produced: Node[]
}

/** Per-element state saved by prepareSpeechType. */
interface SpeechState {
	/** The element's markup before wrapping (what getCleanHTML returns) */
	originalHTML: string
	wrapped: Wrapped[]
	/** Word spans in document order */
	wordSpans: HTMLElement[]
	/** Word number of each span: spans of one word split by markup (Typo<em>graphy</em>) share it */
	wordOf: number[]
	/** The text that is spoken, and the character offset of each word in it */
	text: string
	wordStart: number[]
	/** The run currently speaking this element, if any */
	run: Run | null
	activeIndex: number
}

/** Registry of per-element state, keyed by element reference. */
const states = new WeakMap<HTMLElement, SpeechState>()

/** Whether an element (or an ancestor up to root) is hidden, so its text isn't shown or spoken. */
function isHidden(el: Element): boolean {
	if (el.getAttribute('aria-hidden') === 'true' || el.hasAttribute('hidden')) return true
	// A detached element has no layout to read.
	if (!el.isConnected) return false
	const cs = getComputedStyle(el)
	return cs.display === 'none' || cs.visibility === 'hidden'
}

/** Put the original text nodes back (keeping every element, its listeners and form values). */
function unwrap(state: SpeechState): void {
	for (const w of state.wrapped) {
		const first = w.produced.find((n) => n.parentNode)
		if (first?.parentNode) first.parentNode.insertBefore(w.original, first)
		w.produced.forEach((n) => n.parentNode?.removeChild(n))
	}
}

/**
 * Wrap each visible word of el in a <span class="st-word">, in place: the element's markup, ids,
 * listeners, form values and line breaks are kept, and hidden text, styles, scripts, form fields and SVG
 * are left alone (and not spoken). The text stays readable to screen readers. Idempotent — calling again
 * re-wraps from the original. Returns the word spans in document order.
 *
 * @param el      - Element whose text will be wrapped
 * @param options - SpeechTypeOptions (transitionMs is used)
 */
export function prepareSpeechType(el: HTMLElement, options: SpeechTypeOptions = {}): HTMLElement[] {
	if (typeof window === 'undefined' || !el) return []

	const existing = states.get(el)
	if (existing) {
		existing.run?.stop()
		unwrap(existing)
		states.delete(el)
	}

	const originalHTML = el.innerHTML
	const wrapped: Wrapped[] = []
	const wordSpans: HTMLElement[] = []
	const wordOf: number[] = []
	const wordStart: number[] = []
	let text = ''
	let word = -1
	/** Whether the next word starts a new spoken word (whitespace, a line break or a block came first). */
	let gap = true

	const walk = (node: Node) => {
		// A copy: wrapping replaces text nodes while the walk runs.
		Array.from(node.childNodes).forEach((child) => {
			if (child.nodeType === Node.TEXT_NODE) {
				wrapText(child as Text)
				return
			}
			if (child.nodeType !== Node.ELEMENT_NODE) return
			const elem = child as HTMLElement
			const tag = elem.nodeName.toUpperCase()
			if (BREAK_TAGS.has(tag)) gap = true
			if (SKIP_TAGS.has(tag) || elem.isContentEditable || isHidden(elem)) return
			walk(elem)
			if (BREAK_TAGS.has(tag)) gap = true
		})
	}

	const wrapText = (node: Text) => {
		const data = node.data
		if (!data || !node.parentNode) return
		if (!/\S/.test(data)) { gap = true; return }
		const produced: Node[] = []
		for (const token of data.split(/(\s+)/)) {
			if (!token) continue
			if (/^\s+$/.test(token)) { produced.push(document.createTextNode(token)); gap = true; continue }
			const pieces = wordSegmenter && UNSPACED_SCRIPT.test(token) ? Array.from(wordSegmenter.segment(token), (s) => s.segment) : [token]
			pieces.forEach((piece, k) => {
				if (gap || k > 0) {
					if (text) text += ' '
					word++
					wordStart[word] = text.length
				}
				gap = false
				const span = document.createElement('span')
				span.className = SPEECH_CLASSES.word
				span.textContent = piece
				produced.push(span)
				wordSpans.push(span)
				wordOf.push(word)
				text += piece
			})
		}
		const fragment = document.createDocumentFragment()
		produced.forEach((n) => fragment.appendChild(n))
		node.parentNode.replaceChild(fragment, node)
		wrapped.push({ original: node, produced })
	}

	walk(el)

	const transitionMs = numberIn(options.transitionMs, 80, 0, 10000, 'transitionMs')
	if (transitionMs > 0 && !reducedMotion()) {
		wordSpans.forEach((span) => {
			span.style.transition = `font-variation-settings ${transitionMs}ms ease, letter-spacing ${transitionMs}ms ease, opacity ${transitionMs}ms ease`
		})
	}

	states.set(el, { originalHTML, wrapped, wordSpans, wordOf, text, wordStart, run: null, activeIndex: -1 })
	return wordSpans
}

// ─── Emphasis ─────────────────────────────────────────────────────────────────

/** Parse a computed font-variation-settings value into [tag, value] pairs. */
function parseAxes(fvs: string): [string, number][] {
	if (!fvs || fvs === 'normal') return []
	const out: [string, number][] = []
	for (const m of fvs.matchAll(/["']([^"']{4})["']\s+(-?[\d.]+(?:e[+-]?\d+)?)/gi)) out.push([m[1], parseFloat(m[2])])
	return out
}

/** The emphasised style of a word span, around its parent's own weight, optical size, axes and spacing. */
function emphasis(span: HTMLElement, options: SpeechTypeOptions): { fvs: string; ls: string } {
	const parent = span.parentElement ?? span
	const cs = getComputedStyle(parent)
	const axes = parseAxes(cs.getPropertyValue?.('font-variation-settings') || cs.fontVariationSettings || '')
	const axis = (tag: string) => axes.find(([t]) => t === tag)?.[1]
	const fontSize = parseFloat(cs.fontSize) || 16
	const ownWeight = axis('wght') ?? (parseFloat(cs.fontWeight) || 400)
	const ownOpsz = axis('opsz') ?? fontSize
	// Explicit values are absolute; by default the word gets 300 heavier and 1.5× its optical size.
	const weight = numberIn(options.activeWeight, Math.min(1000, ownWeight + 300), 1, 1000, 'activeWeight')
	const opsz = numberIn(options.activeOpsz, ownOpsz * 1.5, 1, 1000, 'activeOpsz')
	const tracking = numberIn(options.activeTracking, 0.06, -1, 1, 'activeTracking')
	const others = axes.filter(([t]) => t !== 'wght' && t !== 'opsz').map(([t, v]) => `"${t}" ${v}`)
	const ownLs = parseFloat(cs.letterSpacing) || 0
	return {
		fvs: [...others, `"wght" ${+weight.toFixed(1)}`, `"opsz" ${+opsz.toFixed(1)}`].join(', '),
		// Added to the text's own letter-spacing.
		ls: ownLs ? `calc(${ownLs}px + ${tracking}em)` : `${tracking}em`,
	}
}

/**
 * Emphasise the word containing the span at activeIndex (every span of a word split by markup); dim the
 * others. Pass -1 to reset all words to neutral. The emphasis is a heavier weight, larger optical size and
 * wider tracking around the text's own values (explicit options are absolute).
 *
 * @param el          - Element previously prepared by prepareSpeechType
 * @param activeIndex - Index of the word span to emphasise, -1 for none
 * @param options     - SpeechTypeOptions (merged with defaults)
 */
export function applySpeechType(el: HTMLElement, activeIndex: number, options: SpeechTypeOptions = {}): void {
	if (typeof window === 'undefined') return
	const state = states.get(el)
	if (!state) return
	const index = Number.isInteger(activeIndex) && activeIndex >= 0 && activeIndex < state.wordSpans.length ? activeIndex : -1
	const inactiveOpacity = numberIn(options.inactiveOpacity, 0.45, 0, 1, 'inactiveOpacity')
	const activeWord = index >= 0 ? state.wordOf[index] : -1
	state.activeIndex = index

	state.wordSpans.forEach((span, i) => {
		if (activeWord >= 0 && state.wordOf[i] === activeWord) {
			const e = emphasis(span, options)
			span.setAttribute('aria-current', 'true')
			span.style.fontVariationSettings = e.fvs
			span.style.letterSpacing = e.ls
			span.style.opacity = '1'
		} else {
			span.removeAttribute('aria-current')
			span.style.fontVariationSettings = ''
			span.style.letterSpacing = ''
			// Opacity isn't inherited, so 1 is the span's own default.
			span.style.opacity = activeWord === -1 ? '1' : String(inactiveOpacity)
		}
	})
}

// ─── Speech ───────────────────────────────────────────────────────────────────

/** One speaking run. */
interface Run {
	stop: () => void
	utterance: SpeechSynthesisUtterance
}

/** The run that currently owns window.speechSynthesis (only it may cancel speech). */
let currentRun: Run | null = null

/** The voice for a language or a name, if the browser has one. */
function pickVoice(lang: string, voice: SpeechTypeOptions['voice']): SpeechSynthesisVoice | null {
	const voices = window.speechSynthesis.getVoices?.() ?? []
	if (voice && typeof voice === 'object') return voice
	if (typeof voice === 'string') {
		const found = voices.find((v) => v.name === voice || v.voiceURI === voice)
		if (found) return found
		warnOnce(`[speechType] no voice named ${JSON.stringify(voice)}; using the language's default`)
	}
	if (!lang) return null
	const l = lang.toLowerCase()
	return voices.find((v) => v.lang.toLowerCase() === l) ?? voices.find((v) => v.lang.toLowerCase().split('-')[0] === l.split('-')[0]) ?? null
}

/**
 * Speak el's text, emphasising each word as the Web Speech API reaches it. Calls prepareSpeechType
 * first. Earlier speech started by speechType is stopped (other speech on the page is left alone unless
 * this run has to take over the speech engine). Returns a stop() function that stops this run and resets
 * the emphasis; the words stay wrapped until removeSpeechType.
 *
 * @param el      - Element to speak and highlight
 * @param options - SpeechTypeOptions (merged with defaults)
 */
export function startSpeechType(el: HTMLElement, options: SpeechTypeOptions = {}): () => void {
	if (typeof window === 'undefined' || !el || !('speechSynthesis' in window) || typeof SpeechSynthesisUtterance === 'undefined') {
		options.onUnsupported?.()
		return () => {}
	}

	// Validate before touching the page or the speech engine.
	const rate = numberIn(options.rate, 0.9, 0.1, 10, 'rate')
	const pitch = numberIn(options.pitch, 1, 0, 2, 'pitch')
	const volume = numberIn(options.volume, 1, 0, 1, 'volume')

	const synth = window.speechSynthesis
	// Whether the engine is speaking now (checked before re-preparing, which stops this element's run).
	const busy = synth.speaking || synth.pending

	prepareSpeechType(el, options)
	const state = states.get(el)
	if (!state || !state.text) return () => {}

	const utterance = new SpeechSynthesisUtterance(state.text)
	utterance.rate = rate
	utterance.pitch = pitch
	utterance.volume = volume
	const lang = options.lang ?? (el.closest('[lang]') as HTMLElement | null)?.lang ?? document.documentElement.lang ?? ''
	if (lang) utterance.lang = lang
	const voice = pickVoice(lang, options.voice)
	if (voice) utterance.voice = voice

	let finished = false
	let ourCancel = false
	let keepalive: ReturnType<typeof setInterval> | null = null
	let watchdog: ReturnType<typeof setInterval> | null = null
	let speakTimer: ReturnType<typeof setTimeout> | null = null
	let started = false

	/** End this run: clear timers and emphasis. */
	const finish = () => {
		if (finished) return
		finished = true
		if (keepalive) clearInterval(keepalive)
		if (watchdog) clearInterval(watchdog)
		if (speakTimer) clearTimeout(speakTimer)
		if (currentRun === run) currentRun = null
		if (state.run === run) state.run = null
		applySpeechType(el, -1, options)
		options.onEnd?.()
	}

	utterance.onstart = () => { started = true }
	utterance.onboundary = (e: SpeechSynthesisEvent) => {
		if (finished || e.name !== 'word') return
		started = true
		// The word whose text contains charIndex (UTF-16 offset into the spoken text).
		let w = -1
		for (let i = 0; i < state.wordStart.length; i++) {
			if (state.wordStart[i] <= e.charIndex) w = i
			else break
		}
		const span = state.wordOf.indexOf(w)
		if (span !== -1) applySpeechType(el, span, options)
	}
	utterance.onend = () => finish()
	utterance.onerror = (e: SpeechSynthesisErrorEvent) => {
		// Being interrupted, or cancelled by this run or a newer one, is not an error.
		if (e.error !== 'interrupted' && !(ourCancel && e.error === 'canceled')) options.onError?.(e)
		finish()
	}

	const run: Run = {
		utterance,
		stop: () => {
			if (finished) return
			// Only cancel the speech engine if this run is the one speaking.
			if (currentRun === run) {
				ourCancel = true
				synth.cancel()
			}
			finish()
		},
	}

	// Stop speechType's earlier run (this element's or another's).
	if (currentRun) currentRun.stop()
	else if (busy) synth.cancel()
	currentRun = run
	state.run = run

	const speakNow = () => {
		speakTimer = null
		if (finished) return
		synth.speak(utterance)
		// Chrome cuts long speech off after ~15 s without any event; pausing and resuming keeps it going.
		if (/Chrome\//.test(navigator.userAgent)) {
			keepalive = setInterval(() => {
				if (synth.speaking && !synth.paused) { synth.pause(); synth.resume() }
			}, CHROME_KEEPALIVE_MS)
		}
		// If speech stops without an end event, clear the emphasis.
		watchdog = setInterval(() => {
			if (started && !synth.speaking && !synth.pending) finish()
		}, WATCHDOG_MS)
	}
	// Speaking in the same tick as cancel() makes Chrome cancel the new utterance too.
	if (busy) speakTimer = setTimeout(speakNow, RESPEAK_DELAY_MS)
	else speakNow()

	return run.stop
}

/**
 * Stop this element's speech (only if it is speaking), put the original text nodes back and delete the
 * saved state. No-op if prepareSpeechType was never called.
 *
 * @param el - The element previously prepared by prepareSpeechType
 */
export function removeSpeechType(el: HTMLElement): void {
	const state = states.get(el)
	if (!state) return
	state.run?.stop()
	applySpeechType(el, -1)
	unwrap(state)
	states.delete(el)
}

/**
 * The element's markup without speechType's word spans. Exact for a prepared element; for any other
 * element, unwraps .st-word spans.
 *
 * @param el - Element to read clean HTML from
 */
export function getCleanHTML(el: HTMLElement): string {
	const state = states.get(el)
	if (state) return state.originalHTML
	const clone = el.cloneNode(true) as HTMLElement
	clone.querySelectorAll(`.${SPEECH_CLASSES.word}`).forEach((node) => {
		const parent = node.parentNode
		if (!parent) return
		while (node.firstChild) parent.insertBefore(node.firstChild, node)
		parent.removeChild(node)
	})
	clone.querySelectorAll('[data-st-live]').forEach((n) => n.remove())
	clone.normalize()
	return clone.innerHTML
}
